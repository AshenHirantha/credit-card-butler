import { useState, useRef } from "react";
import {
  useListTransactions,
  useDeleteTransaction,
  useCreateTransaction,
  useListCards,
  getListTransactionsQueryKey,
  getGetDashboardQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowRightLeft, Upload, X, FileText, Loader2, CheckSquare, Square } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Link } from "wouter";
import { Label } from "@/components/ui/label";

type ParsedTransaction = {
  date: string;
  note: string | null;
  amount: number;
  type: "expense" | "payment";
  cardId: number | null;
};

function StatementUploadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: cards } = useListCards();
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedTransaction[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createTransaction = useCreateTransaction();

  function resetState() {
    setFile(null);
    setParsed(null);
    setSelected(new Set());
    setParsing(false);
    setSelectedCardId("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose() {
    resetState();
    onOpenChange(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setParsed(null);
      setSelected(new Set());
    }
  }

  async function handleParse() {
    if (!file) return;
    setParsing(true);
    try {
      const formData = new FormData();
      formData.append("statement", file);
      if (selectedCardId) formData.append("cardId", selectedCardId);

      const res = await fetch("/api/statements/parse", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const txns: ParsedTransaction[] = data.transactions;
      setParsed(txns);
      setSelected(new Set(txns.map((_, i) => i)));
    } catch (err) {
      toast({
        title: "Failed to parse statement",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    if (!parsed) return;
    const toImport = parsed.filter((_, i) => selected.has(i));
    if (toImport.length === 0) return;

    setImporting(true);
    let succeeded = 0;
    let failed = 0;

    for (const txn of toImport) {
      await new Promise<void>((resolve) => {
        createTransaction.mutate(
          {
            data: {
              type: txn.type,
              amount: txn.amount,
              date: txn.date,
              cardId: txn.cardId,
              note: txn.note,
            },
          },
          {
            onSuccess: () => { succeeded++; resolve(); },
            onError: () => { failed++; resolve(); },
          }
        );
      });
    }

    queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });

    toast({
      title: `Imported ${succeeded} transaction${succeeded !== 1 ? "s" : ""}`,
      description: failed > 0 ? `${failed} failed` : undefined,
    });

    setImporting(false);
    handleClose();
  }

  function toggleAll() {
    if (parsed) {
      if (selected.size === parsed.length) {
        setSelected(new Set());
      } else {
        setSelected(new Set(parsed.map((_, i) => i)));
      }
    }
  }

  function toggleOne(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload Credit Card Statement</DialogTitle>
          <DialogDescription>
            Upload a photo or PDF of your statement. AI will extract the transactions for you to review before importing.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {!parsed ? (
            <>
              {/* Card selector */}
              <div className="space-y-2">
                <Label>Link to Card (optional)</Label>
                <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                  <SelectTrigger data-testid="select-statement-card">
                    <SelectValue placeholder="Select a card..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No card</SelectItem>
                    {cards?.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name} {c.bank ? `— ${c.bank}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* File upload */}
              <div className="space-y-2">
                <Label>Statement File</Label>
                <div
                  className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-3 text-sm">
                      <FileText className="w-6 h-6 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">{file.name}</p>
                        <p className="text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        className="ml-2 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                      <p className="text-sm font-medium">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted-foreground">JPG, PNG, WebP, or PDF — up to 10 MB</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                  data-testid="input-statement-file"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button
                  onClick={handleParse}
                  disabled={!file || parsing}
                  data-testid="button-parse-statement"
                  className="gap-2"
                >
                  {parsing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Extract Transactions
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Review extracted transactions */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">
                    Found {parsed.length} transaction{parsed.length !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selected.size} selected for import
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleAll}
                  >
                    {selected.size === parsed.length ? "Deselect All" : "Select All"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setParsed(null); setSelected(new Set()); }}
                  >
                    Re-upload
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border overflow-hidden">
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsed.map((tx, i) => (
                        <TableRow
                          key={i}
                          className={`cursor-pointer transition-colors ${selected.has(i) ? "" : "opacity-40"}`}
                          onClick={() => toggleOne(i)}
                          data-testid={`parsed-tx-row-${i}`}
                        >
                          <TableCell>
                            {selected.has(i) ? (
                              <CheckSquare className="w-4 h-4 text-primary" />
                            ) : (
                              <Square className="w-4 h-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                            {tx.date}
                          </TableCell>
                          <TableCell className="max-w-48 truncate text-sm">
                            {tx.note || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                tx.type === "payment"
                                  ? "bg-blue-500/10 text-blue-700 border-blue-500/30"
                                  : "bg-red-500/10 text-red-700 border-red-500/30"
                              }
                            >
                              {tx.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium text-sm">
                            {formatCurrency(tx.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button
                  onClick={handleImport}
                  disabled={selected.size === 0 || importing}
                  data-testid="button-import-transactions"
                  className="gap-2"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    `Import ${selected.size} Transaction${selected.size !== 1 ? "s" : ""}`
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TransactionsPage() {
  const [filterType, setFilterType] = useState<string>("all");
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: transactions, isLoading } = useListTransactions(
    { type: filterType === "all" ? undefined : (filterType as "expense" | "payment" | "income") },
    {
      query: {
        queryKey: getListTransactionsQueryKey({
          type: filterType === "all" ? undefined : (filterType as "expense" | "payment" | "income"),
        }),
      },
    }
  );

  const deleteTx = useDeleteTransaction();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  function handleDelete(id: number) {
    deleteTx.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Transaction deleted" });
          queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        },
        onError: (error) => {
          toast({
            title: "Failed to delete transaction",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground mt-1">View and manage your history.</p>
        </div>

        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="expense">Expenses</SelectItem>
              <SelectItem value="payment">Payments</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setUploadOpen(true)}
            data-testid="button-upload-statement"
          >
            <Upload className="w-4 h-4" />
            Upload Statement
          </Button>

          <Button asChild data-testid="button-add-entry">
            <Link href="/add">Add Entry</Link>
          </Button>
        </div>
      </div>

      <StatementUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />

      <div className="rounded-xl border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !transactions || transactions.length === 0 ? (
          <div className="text-center py-20">
            <ArrowRightLeft className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium">No transactions found</h3>
            <p className="text-muted-foreground mt-2">
              Adjust your filters, add a new transaction, or upload a statement.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Note / Card</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} className="group" data-testid={`tx-row-${tx.id}`}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(tx.date)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`
                          ${tx.type === "income" ? "bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-400" : ""}
                          ${tx.type === "payment" ? "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400" : ""}
                          ${tx.type === "expense" ? "bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-400" : ""}
                        `}
                      >
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {tx.note || (tx.type === "payment" ? `Payment to ${tx.cardName}` : "—")}
                      </div>
                      {tx.cardName && tx.type !== "payment" && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          on {tx.cardName}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      <span
                        className={`
                          ${tx.type === "income" ? "text-green-600" : ""}
                          ${tx.type === "payment" ? "text-blue-600" : ""}
                        `}
                      >
                        {tx.type === "expense" ? "-" : "+"}
                        {formatCurrency(tx.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`button-delete-tx-${tx.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this {tx.type} of{" "}
                              {formatCurrency(tx.amount)}? This will affect your
                              dashboard totals and card balances.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(tx.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {deleteTx.isPending ? "Deleting..." : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

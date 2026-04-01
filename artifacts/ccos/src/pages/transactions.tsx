import { useState } from "react";
import { useListTransactions, useDeleteTransaction, getListTransactionsQueryKey, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowRightLeft, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Link } from "wouter";

export default function TransactionsPage() {
  const [filterType, setFilterType] = useState<string>("all");
  
  const { data: transactions, isLoading } = useListTransactions(
    { type: filterType === "all" ? undefined : filterType as any },
    { query: { queryKey: getListTransactionsQueryKey({ type: filterType === "all" ? undefined : filterType as any }) } }
  );
  
  const deleteTx = useDeleteTransaction();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  function handleDelete(id: number) {
    deleteTx.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Transaction deleted" });
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      },
      onError: (error) => {
        toast({ title: "Failed to delete transaction", description: error.message, variant: "destructive" });
      }
    });
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground mt-1">View and manage your history.</p>
        </div>
        
        <div className="flex gap-3 w-full sm:w-auto">
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
          
          <Button asChild>
            <Link href="/add">Add Entry</Link>
          </Button>
        </div>
      </div>

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
            <p className="text-muted-foreground mt-2">Adjust your filters or add a new transaction.</p>
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
                  <TableRow key={tx.id} className="group">
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(tx.date)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`
                        ${tx.type === 'income' ? 'bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-400' : ''}
                        ${tx.type === 'payment' ? 'bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400' : ''}
                        ${tx.type === 'expense' ? 'bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-400' : ''}
                      `}>
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{tx.note || (tx.type === 'payment' ? `Payment to ${tx.cardName}` : '-')}</div>
                      {tx.cardName && tx.type !== 'payment' && (
                        <div className="text-xs text-muted-foreground mt-0.5">on {tx.cardName}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      <span className={`
                        ${tx.type === 'income' ? 'text-green-600' : ''}
                        ${tx.type === 'payment' ? 'text-blue-600' : ''}
                      `}>
                        {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this {tx.type} of {formatCurrency(tx.amount)}? 
                              This will affect your dashboard totals and card balances.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(tx.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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

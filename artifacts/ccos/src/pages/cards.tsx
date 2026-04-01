import { useState } from "react";
import {
  useListCards,
  useCreateCard,
  useDeleteCard,
  useUpdateCard,
  getListCardsQueryKey,
  getGetDashboardQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, getUtilizationColor } from "@/lib/format";
import { Card as CardUI, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PlusCircle, Trash2, CreditCard, Calendar, Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
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

const cardSchema = z.object({
  name: z.string().min(1, "Name is required"),
  bank: z.string().optional(),
  limit: z.coerce.number().min(1, "Limit must be positive"),
  statementDay: z.coerce.number().min(1).max(31),
  dueDay: z.coerce.number().min(1).max(31),
  color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color")
    .optional()
    .or(z.literal("")),
});

type CardFormValues = z.infer<typeof cardSchema>;

interface CardFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  defaultValues: CardFormValues;
  onSubmit: (values: CardFormValues) => void;
  isPending: boolean;
  submitLabel: string;
}

function CardFormDialog({
  open,
  onOpenChange,
  title,
  defaultValues,
  onSubmit,
  isPending,
  submitLabel,
}: CardFormDialogProps) {
  const form = useForm<CardFormValues>({
    resolver: zodResolver(cardSchema),
    defaultValues,
    values: defaultValues,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Card Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Sapphire Reserve" {...field} data-testid="input-card-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bank"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Chase" {...field} data-testid="input-card-bank" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="limit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Credit Limit ($)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="10000" {...field} data-testid="input-card-limit" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="statementDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statement Day (1–31)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="31" {...field} data-testid="input-statement-day" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Day (1–31)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="31" {...field} data-testid="input-due-day" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Card Color (Hex)</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        type="color"
                        className="w-12 h-10 p-1 rounded cursor-pointer"
                        {...field}
                        data-testid="input-card-color-picker"
                      />
                    </FormControl>
                    <FormControl>
                      <Input className="flex-1" placeholder="#000000" {...field} data-testid="input-card-color-hex" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit-card">
                {isPending ? "Saving..." : submitLabel}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function CardsPage() {
  const { data: cards, isLoading } = useListCards();
  const [addOpen, setAddOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createCard = useCreateCard();
  const updateCard = useUpdateCard();
  const deleteCard = useDeleteCard();

  const editingCard = cards?.find((c) => c.id === editingCardId);

  const addDefaults: CardFormValues = {
    name: "",
    bank: "",
    limit: 1000,
    statementDay: 1,
    dueDay: 15,
    color: "#1a56db",
  };

  function handleAdd(values: CardFormValues) {
    createCard.mutate(
      { data: { ...values, color: values.color || null } },
      {
        onSuccess: () => {
          toast({ title: "Card added successfully" });
          setAddOpen(false);
          queryClient.invalidateQueries({ queryKey: getListCardsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        },
        onError: (error) => {
          toast({
            title: "Failed to add card",
            description: error.message || "An error occurred",
            variant: "destructive",
          });
        },
      }
    );
  }

  function handleEdit(values: CardFormValues) {
    if (editingCardId == null) return;
    updateCard.mutate(
      { id: editingCardId, data: { ...values, color: values.color || null } },
      {
        onSuccess: () => {
          toast({ title: "Card updated successfully" });
          setEditingCardId(null);
          queryClient.invalidateQueries({ queryKey: getListCardsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        },
        onError: (error) => {
          toast({
            title: "Failed to update card",
            description: error.message || "An error occurred",
            variant: "destructive",
          });
        },
      }
    );
  }

  function handleDelete(id: number) {
    deleteCard.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Card deleted" });
          queryClient.invalidateQueries({ queryKey: getListCardsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        },
        onError: (error) => {
          toast({
            title: "Failed to delete card",
            description: error.message || "An error occurred",
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Credit Cards</h1>
          <p className="text-muted-foreground mt-1">Manage your cards and limits.</p>
        </div>

        <Button
          className="gap-2"
          onClick={() => setAddOpen(true)}
          data-testid="button-add-card"
        >
          <PlusCircle className="w-4 h-4" />
          Add Card
        </Button>
      </div>

      {/* Add Card Dialog */}
      <CardFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add New Card"
        defaultValues={addDefaults}
        onSubmit={handleAdd}
        isPending={createCard.isPending}
        submitLabel="Add Card"
      />

      {/* Edit Card Dialog */}
      {editingCard && (
        <CardFormDialog
          open={editingCardId !== null}
          onOpenChange={(v) => { if (!v) setEditingCardId(null); }}
          title={`Edit — ${editingCard.name}`}
          defaultValues={{
            name: editingCard.name,
            bank: editingCard.bank ?? "",
            limit: editingCard.limit,
            statementDay: editingCard.statementDay,
            dueDay: editingCard.dueDay,
            color: editingCard.color ?? "#1a56db",
          }}
          onSubmit={handleEdit}
          isPending={updateCard.isPending}
          submitLabel="Save Changes"
        />
      )}

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : !cards || cards.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 border rounded-xl">
          <CreditCard className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-medium">No cards added yet</h3>
          <p className="text-muted-foreground mt-2">
            Add your first credit card to start tracking.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <CardUI
              key={card.id}
              className="flex flex-col relative overflow-hidden group"
              data-testid={`card-item-${card.id}`}
            >
              {card.color && (
                <div
                  className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 opacity-20 pointer-events-none transition-opacity group-hover:opacity-30"
                  style={{ backgroundColor: card.color }}
                />
              )}

              <CardHeader className="pb-4 border-b bg-muted/10 relative z-10">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded flex items-center justify-center shrink-0 shadow-sm border bg-card">
                      <CreditCard
                        className="w-5 h-5"
                        style={{ color: card.color || "var(--foreground)" }}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{card.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {card.bank || "No Bank"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-1 -mt-1 -mr-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                      onClick={() => setEditingCardId(card.id)}
                      data-testid={`button-edit-card-${card.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          data-testid={`button-delete-card-${card.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Card</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {card.name}? This
                            action cannot be undone. All associated transactions
                            will be kept but unlinked from this card.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(card.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deleteCard.isPending ? "Deleting..." : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6 flex-1 flex flex-col gap-6 relative z-10">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Safe Spend</p>
                    <p className="text-2xl font-bold font-mono text-primary tracking-tight">
                      {formatCurrency(card.safeSpendRemaining)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Limit</p>
                    <p className="text-xl font-semibold font-mono tracking-tight">
                      {formatCurrency(card.limit)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Used:{" "}
                      <span className="font-medium text-foreground">
                        {formatCurrency(card.used)}
                      </span>
                    </span>
                    <span className="font-medium">
                      {Math.round(card.utilization * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={card.utilization * 100}
                    className="h-2"
                    indicatorClassName={getUtilizationColor(card.utilization)}
                  />
                </div>

                <div className="flex items-center gap-4 text-sm pt-4 border-t mt-auto">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Statement: {card.statementDay}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span>
                      Due: {card.dueDay} ({card.daysUntilDue}d)
                    </span>
                  </div>
                </div>
              </CardContent>
            </CardUI>
          ))}
        </div>
      )}
    </div>
  );
}

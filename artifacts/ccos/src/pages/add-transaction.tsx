import { useListCards, useCreateTransaction, getListTransactionsQueryKey, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateTransactionBodyType } from "@workspace/api-client-react/src/generated/api.schemas";

const transactionSchema = z.object({
  type: z.enum(["expense", "payment", "income"]),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  date: z.string().min(1, "Date is required"),
  cardId: z.coerce.number().optional(),
  note: z.string().optional(),
}).refine((data) => {
  if ((data.type === "expense" || data.type === "payment") && !data.cardId) {
    return false;
  }
  return true;
}, {
  message: "Card is required for expenses and payments",
  path: ["cardId"],
});

export default function AddTransaction() {
  const [, setLocation] = useLocation();
  const { data: cards, isLoading: loadingCards } = useListCards();
  const createTx = useCreateTransaction();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "expense",
      amount: "" as any,
      date: new Date().toISOString().split("T")[0],
      cardId: undefined,
      note: "",
    },
  });

  const type = form.watch("type");

  function onSubmit(values: z.infer<typeof transactionSchema>) {
    createTx.mutate({
      data: {
        type: values.type as CreateTransactionBodyType,
        amount: values.amount,
        date: new Date(values.date).toISOString(),
        cardId: (values.type === "expense" || values.type === "payment") ? values.cardId : null,
        note: values.note || null,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Transaction added successfully" });
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        setLocation("/transactions");
      },
      onError: (error) => {
        toast({ title: "Failed to add transaction", description: error.message, variant: "destructive" });
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add Transaction</h1>
        <p className="text-muted-foreground mt-1">Record a new expense, payment, or income.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
          <CardDescription>Enter the information below</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="expense">Expense</SelectItem>
                          <SelectItem value="payment">Payment</SelectItem>
                          <SelectItem value="income">Income</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(type === "expense" || type === "payment") && (
                  <FormField
                    control={form.control}
                    name="cardId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Card</FormLabel>
                        {loadingCards ? (
                          <Skeleton className="h-10 w-full" />
                        ) : (
                          <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a card" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {cards?.map((card) => (
                                <SelectItem key={card.id} value={card.id.toString()}>
                                  {card.name} ({card.bank})
                                </SelectItem>
                              ))}
                              {(!cards || cards.length === 0) && (
                                <SelectItem value="0" disabled>No cards available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="note"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Note (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Groceries at Whole Foods" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setLocation("/transactions")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTx.isPending}>
                  {createTx.isPending ? "Adding..." : "Save Transaction"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

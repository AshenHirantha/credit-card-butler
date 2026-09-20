import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { cardsTable } from "./cards";

export const transactionsTable = pgTable("transactions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id"),
  type: text("type", { enum: ["expense", "payment", "income"] }).notNull(),
  amount: text("amount").notNull(),
  date: text("date").notNull(),
  cardId: integer("card_id").references(() => cardsTable.id, { onDelete: "cascade" }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable, {
  id: z.never().optional(),
  createdAt: z.never().optional(),
  userId: z.never().optional(),
});
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;

import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cardsTable = pgTable("cards", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  bank: text("bank"),
  limit: real("limit").notNull(),
  statementDay: integer("statement_day").notNull(),
  dueDay: integer("due_day").notNull(),
  color: text("color"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCardSchema = createInsertSchema(cardsTable, {
  id: z.never().optional(),
  createdAt: z.never().optional(),
});
export type InsertCard = z.infer<typeof insertCardSchema>;
export type Card = typeof cardsTable.$inferSelect;

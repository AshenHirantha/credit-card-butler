import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const statementParseMetricsTable = pgTable("statement_parse_metrics", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id").notNull(),
  cardId: integer("card_id"),
  parseCount: integer("parse_count").notNull().default(1),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStatementParseMetricsSchema = createInsertSchema(statementParseMetricsTable, {
  id: z.never().optional(),
  createdAt: z.never().optional(),
});
export type InsertStatementParseMetrics = z.infer<typeof insertStatementParseMetricsSchema>;
export type StatementParseMetrics = typeof statementParseMetricsTable.$inferSelect;

import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, cardsTable, transactionsTable } from "@workspace/db";
import { toCardSummary, getWarnings } from "../lib/calculations";

const router: IRouter = Router();

router.get("/dashboard", async (_req, res): Promise<void> => {
  const cards = await db.select().from(cardsTable).orderBy(cardsTable.createdAt);
  const transactions = await db.select().from(transactionsTable).orderBy(desc(transactionsTable.date), desc(transactionsTable.createdAt));

  const cardSummaries = cards.map((card) => toCardSummary(card, transactions));

  const bestCard = cardSummaries.length > 0
    ? [...cardSummaries].sort((a, b) => b.score - a.score)[0] ?? null
    : null;

  const warnings = getWarnings(cards, transactions);

  const totalSafeSpendRemaining = cardSummaries.reduce((sum, c) => sum + c.safeSpendRemaining, 0);
  const totalUsed = cardSummaries.reduce((sum, c) => sum + c.used, 0);
  const totalLimit = cards.reduce((sum, c) => sum + c.limit, 0);

  const income = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const payments = transactions.filter((t) => t.type === "payment").reduce((sum, t) => sum + t.amount, 0);
  const cashExpenses = transactions.filter((t) => t.type === "expense" && !t.cardId).reduce((sum, t) => sum + t.amount, 0);
  const cashBalance = income - payments - cashExpenses;

  const cardNames = Object.fromEntries(cards.map((c) => [c.id, c.name]));
  const recentTransactions = transactions.slice(0, 10).map((t) => ({
    ...t,
    cardId: t.cardId ?? null,
    note: t.note ?? null,
    cardName: t.cardId ? (cardNames[t.cardId] ?? null) : null,
  }));

  res.json({
    bestCard: bestCard ?? null,
    cards: cardSummaries,
    warnings,
    totalSafeSpendRemaining,
    totalUsed,
    totalLimit,
    cashBalance,
    recentTransactions,
  });
});

export default router;

import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, cardsTable, transactionsTable } from "@workspace/db";
import {
  CreateCardBody,
  UpdateCardBody,
  GetCardParams,
  UpdateCardParams,
  DeleteCardParams,
} from "@workspace/api-zod";
import { toCardSummary } from "../lib/calculations";

const router: IRouter = Router();

router.get("/cards", async (_req, res): Promise<void> => {
  const cards = await db.select().from(cardsTable).orderBy(cardsTable.createdAt);
  const transactions = await db.select().from(transactionsTable);

  const result = cards.map((card) => ({
    ...card,
    bank: card.bank ?? null,
    color: card.color ?? null,
    ...toCardSummary(card, transactions),
  }));

  res.json(result);
});

router.post("/cards", async (req, res): Promise<void> => {
  const parsed = CreateCardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [card] = await db.insert(cardsTable).values({
    name: parsed.data.name,
    bank: parsed.data.bank ?? null,
    limit: parsed.data.limit,
    statementDay: parsed.data.statementDay,
    dueDay: parsed.data.dueDay,
    color: parsed.data.color ?? null,
  }).returning();

  const transactions = await db.select().from(transactionsTable).where(eq(transactionsTable.cardId, card.id));
  const summary = toCardSummary(card, transactions);

  res.status(201).json({
    ...card,
    bank: card.bank ?? null,
    color: card.color ?? null,
    ...summary,
  });
});

router.get("/cards/:id", async (req, res): Promise<void> => {
  const params = GetCardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [card] = await db.select().from(cardsTable).where(eq(cardsTable.id, params.data.id));
  if (!card) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  const transactions = await db.select().from(transactionsTable).where(eq(transactionsTable.cardId, card.id));
  const summary = toCardSummary(card, transactions);

  res.json({
    ...card,
    bank: card.bank ?? null,
    color: card.color ?? null,
    ...summary,
  });
});

router.put("/cards/:id", async (req, res): Promise<void> => {
  const params = UpdateCardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [card] = await db.update(cardsTable).set({
    name: parsed.data.name,
    bank: parsed.data.bank ?? null,
    limit: parsed.data.limit,
    statementDay: parsed.data.statementDay,
    dueDay: parsed.data.dueDay,
    color: parsed.data.color ?? null,
  }).where(eq(cardsTable.id, params.data.id)).returning();

  if (!card) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  const transactions = await db.select().from(transactionsTable).where(eq(transactionsTable.cardId, card.id));
  const summary = toCardSummary(card, transactions);

  res.json({
    ...card,
    bank: card.bank ?? null,
    color: card.color ?? null,
    ...summary,
  });
});

router.delete("/cards/:id", async (req, res): Promise<void> => {
  const params = DeleteCardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [card] = await db.delete(cardsTable).where(eq(cardsTable.id, params.data.id)).returning();
  if (!card) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

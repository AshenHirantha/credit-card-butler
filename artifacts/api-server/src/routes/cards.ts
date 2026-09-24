import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, cardsTable, transactionsTable } from "@workspace/db";
import {
  CreateCardBody,
  UpdateCardBody,
  GetCardParams,
  UpdateCardParams,
  DeleteCardParams,
} from "@workspace/api-zod";
import { toCardSummary } from "../lib/calculations";
import { requireAuth } from "../middlewares/requireAuth";
import { encrypt, decrypt, encryptNumber, decryptNumber } from "@workspace/db";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/cards", async (req, res): Promise<void> => {
  const userId = req.userId;
  const cards = await db
    .select()
    .from(cardsTable)
    .where(eq(cardsTable.userId, userId))
    .orderBy(cardsTable.createdAt);

  const transactions = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, userId));

  const result = cards.map((card) => ({
    ...card,
    name: decrypt(card.name),
    bank: card.bank ? decrypt(card.bank) : null,
    limit: decryptNumber(card.limit),
    color: card.color ? decrypt(card.color) : null,
    ...toCardSummary({ ...card, name: decrypt(card.name), bank: card.bank ? decrypt(card.bank) : null, limit: decryptNumber(card.limit), color: card.color ? decrypt(card.color) : null }, transactions),
  }));

  res.json(result);
});

router.post("/cards", async (req, res): Promise<void> => {
  const userId = req.userId;
  const parsed = CreateCardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [card] = await db
    .insert(cardsTable)
    .values({
      userId,
      name: encrypt(parsed.data.name),
      bank: parsed.data.bank ? encrypt(parsed.data.bank) : null,
      limit: encryptNumber(parsed.data.limit),
      statementDay: parsed.data.statementDay,
      dueDay: parsed.data.dueDay,
      color: parsed.data.color ? encrypt(parsed.data.color) : null,
    })
    .returning();

  const transactions = await db
    .select()
    .from(transactionsTable)
    .where(and(eq(transactionsTable.cardId, card.id), eq(transactionsTable.userId, userId)));
  const summary = toCardSummary(card, transactions);

  res.status(201).json({
    ...card,
    bank: card.bank ?? null,
    color: card.color ?? null,
    ...summary,
  });
});

router.get("/cards/:id", async (req, res): Promise<void> => {
  const userId = req.userId;
  const params = GetCardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [card] = await db
    .select()
    .from(cardsTable)
    .where(and(eq(cardsTable.id, params.data.id), eq(cardsTable.userId, userId)));
  if (!card) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  const transactions = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.cardId, card.id));
  const summary = toCardSummary(card, transactions);

  res.json({
    ...card,
    bank: card.bank ?? null,
    color: card.color ?? null,
    ...summary,
  });
});

router.put("/cards/:id", async (req, res): Promise<void> => {
  const userId = req.userId;
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

  const [card] = await db
    .update(cardsTable)
    .set({
      name: parsed.data.name,
      bank: parsed.data.bank ?? null,
      limit: parsed.data.limit,
      statementDay: parsed.data.statementDay,
      dueDay: parsed.data.dueDay,
      color: parsed.data.color ?? null,
    })
    .where(and(eq(cardsTable.id, params.data.id), eq(cardsTable.userId, userId)))
    .returning();

  if (!card) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  const transactions = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.cardId, card.id));
  const summary = toCardSummary(card, transactions);

  res.json({
    ...card,
    bank: card.bank ?? null,
    color: card.color ?? null,
    ...summary,
  });
});

router.delete("/cards/:id", async (req, res): Promise<void> => {
  const userId = req.userId;
  const params = DeleteCardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [card] = await db
    .delete(cardsTable)
    .where(and(eq(cardsTable.id, params.data.id), eq(cardsTable.userId, userId)))
    .returning();
  if (!card) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

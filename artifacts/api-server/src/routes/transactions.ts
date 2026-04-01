import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, transactionsTable, cardsTable } from "@workspace/db";
import {
  CreateTransactionBody,
  ListTransactionsQueryParams,
  DeleteTransactionParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/transactions", async (req, res): Promise<void> => {
  const query = ListTransactionsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const rows = await db
    .select({
      id: transactionsTable.id,
      type: transactionsTable.type,
      amount: transactionsTable.amount,
      date: transactionsTable.date,
      cardId: transactionsTable.cardId,
      note: transactionsTable.note,
      createdAt: transactionsTable.createdAt,
      cardName: cardsTable.name,
    })
    .from(transactionsTable)
    .leftJoin(cardsTable, eq(transactionsTable.cardId, cardsTable.id))
    .orderBy(desc(transactionsTable.date), desc(transactionsTable.createdAt));

  let filtered = rows;

  if (query.data.cardId != null) {
    filtered = filtered.filter((r) => r.cardId === query.data.cardId);
  }
  if (query.data.type != null) {
    filtered = filtered.filter((r) => r.type === query.data.type);
  }

  res.json(
    filtered.map((r) => ({
      ...r,
      cardId: r.cardId ?? null,
      cardName: r.cardName ?? null,
      note: r.note ?? null,
    }))
  );
});

router.post("/transactions", async (req, res): Promise<void> => {
  const parsed = CreateTransactionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [txn] = await db.insert(transactionsTable).values({
    type: parsed.data.type,
    amount: parsed.data.amount,
    date: parsed.data.date,
    cardId: parsed.data.cardId ?? null,
    note: parsed.data.note ?? null,
  }).returning();

  let cardName: string | null = null;
  if (txn.cardId) {
    const [card] = await db.select().from(cardsTable).where(eq(cardsTable.id, txn.cardId));
    cardName = card?.name ?? null;
  }

  res.status(201).json({
    ...txn,
    cardId: txn.cardId ?? null,
    note: txn.note ?? null,
    cardName,
  });
});

router.delete("/transactions/:id", async (req, res): Promise<void> => {
  const params = DeleteTransactionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [txn] = await db.delete(transactionsTable).where(eq(transactionsTable.id, params.data.id)).returning();
  if (!txn) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

import type { Card } from "@workspace/db";
import type { Transaction } from "@workspace/db";

export function getCardUsed(cardId: number, transactions: Transaction[]): number {
  let expenses = 0;
  let payments = 0;

  for (const t of transactions) {
    if (t.cardId !== cardId) continue;
    if (t.type === "expense") expenses += t.amount;
    if (t.type === "payment") payments += t.amount;
  }

  return Math.max(0, expenses - payments);
}

export function getUtilization(card: Card, transactions: Transaction[]): number {
  const used = getCardUsed(card.id, transactions);
  return card.limit > 0 ? used / card.limit : 0;
}

export function getSafeSpendRemaining(card: Card, transactions: Transaction[]): number {
  const used = getCardUsed(card.id, transactions);
  return Math.max(0, card.limit * 0.4 - used);
}

export function getDaysUntilDue(dueDay: number): number {
  const today = new Date();
  const due = new Date(today.getFullYear(), today.getMonth(), dueDay);

  if (due <= today) {
    due.setMonth(due.getMonth() + 1);
  }

  const diff = due.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getCycleDay(statementDay: number): number {
  const today = new Date();
  let statement = new Date(today.getFullYear(), today.getMonth(), statementDay);

  if (today.getDate() < statementDay) {
    statement.setMonth(statement.getMonth() - 1);
  }

  const diff = today.getTime() - statement.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

export function getCardScore(card: Card, transactions: Transaction[]): number {
  const utilization = getUtilization(card, transactions);
  const dueDays = getDaysUntilDue(card.dueDay);
  const cycleDay = getCycleDay(card.statementDay);
  const used = getCardUsed(card.id, transactions);

  let score = 0;

  if (cycleDay >= 1 && cycleDay <= 5) score += 50;
  if (utilization < 0.3) score += 20;
  if (utilization > 0.4) score -= 100;
  if (dueDays <= 5 && used > 0) score -= 40;

  return score;
}

export function toCardSummary(card: Card, transactions: Transaction[]) {
  const used = getCardUsed(card.id, transactions);
  const utilization = getUtilization(card, transactions);
  const safeSpendRemaining = getSafeSpendRemaining(card, transactions);
  const daysUntilDue = getDaysUntilDue(card.dueDay);
  const score = getCardScore(card, transactions);

  return {
    id: card.id,
    name: card.name,
    bank: card.bank ?? null,
    color: card.color ?? null,
    limit: card.limit,
    used,
    utilization,
    safeSpendRemaining,
daysUntilDue,
    score,
  };
}

export type WarningItem = {
  type: "utilization" | "due_soon" | "cash_buffer";
  message: string;
  cardId: number | null;
  severity: "info" | "warning" | "critical";
};

export function getWarnings(cards: Card[], transactions: Transaction[]): WarningItem[] {
  const warnings: WarningItem[] = [];

  for (const card of cards) {
    const util = getUtilization(card, transactions);
    const used = getCardUsed(card.id, transactions);
    const dueDays = getDaysUntilDue(card.dueDay);

    if (util > 0.4) {
      warnings.push({
        type: "utilization",
        message: `${card.name}: utilization above safe threshold (${Math.round(util * 100)}%)`,
        cardId: card.id,
        severity: util > 0.7 ? "critical" : "warning",
      });
    }

    if (dueDays <= 3 && used > 0) {
      warnings.push({
        type: "due_soon",
        message: `${card.name}: payment due in ${dueDays} day(s)`,
        cardId: card.id,
        severity: dueDays <= 1 ? "critical" : "warning",
      });
    } else if (dueDays <= 7 && used > 0) {
      warnings.push({
        type: "due_soon",
        message: `${card.name}: payment due in ${dueDays} day(s)`,
        cardId: card.id,
        severity: "info",
      });
    }
  }

  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const payments = transactions
    .filter((t) => t.type === "payment")
    .reduce((sum, t) => sum + t.amount, 0);

  const cashExpenses = transactions
    .filter((t) => t.type === "expense" && !t.cardId)
    .reduce((sum, t) => sum + t.amount, 0);

  const cashBalance = income - payments - cashExpenses;
  const totalCardUsed = cards.reduce((sum, c) => sum + getCardUsed(c.id, transactions), 0);

  if (cards.length > 0 && cashBalance < totalCardUsed * 0.2) {
    warnings.push({
      type: "cash_buffer",
      message: "Cash buffer looks thin relative to card balances",
      cardId: null,
      severity: cashBalance < 0 ? "critical" : "warning",
    });
  }

  return warnings;
}

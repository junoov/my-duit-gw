import { useLiveQuery } from "dexie-react-hooks";
import { getAllTransactionsDesc } from "../services/transactionService";
import { toLocalDateKey } from "../utils/date";

function computeSummary(transactions) {
  const today = toLocalDateKey(new Date());

  let income = 0;
  let expense = 0;
  let todayExpense = 0;

  const byCategory = {};

  transactions.forEach((tx) => {
    if (tx.type === "income") {
      income += tx.amount;
    } else {
      expense += tx.amount;
    }

    if (tx.type === "expense" && toLocalDateKey(tx.date) === today) {
      todayExpense += tx.amount;
    }

    if (!byCategory[tx.category]) {
      byCategory[tx.category] = 0;
    }
    byCategory[tx.category] += tx.type === "expense" ? tx.amount : 0;
  });

  return {
    income,
    expense,
    balance: income - expense,
    todayExpense,
    byCategory
  };
}

function computeWeeklyExpense(transactions) {
  const result = [];
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    result.push({
      dateKey: toLocalDateKey(date),
      date,
      value: 0
    });
  }

  const map = new Map(result.map((item) => [item.dateKey, item]));
  transactions.forEach((tx) => {
    if (tx.type !== "expense") {
      return;
    }
    const key = toLocalDateKey(tx.date);
    const day = map.get(key);
    if (day) {
      day.value += tx.amount;
    }
  });

  return result;
}

export function useTransactions() {
  const transactions = useLiveQuery(() => getAllTransactionsDesc(), [], []);
  const safeTransactions = transactions || [];

  return {
    transactions: safeTransactions,
    summary: computeSummary(safeTransactions),
    weeklyExpense: computeWeeklyExpense(safeTransactions)
  };
}

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../services/firebaseClient";
import { useAuth } from "../context/AuthContext";
import { toLocalDateKey } from "../utils/date";

export function computeSummary(transactions, accounts) {
  const today = toLocalDateKey(new Date());

  let income = 0;
  let expense = 0;
  let todayExpense = 0;

  const byCategory = {};

  transactions.forEach((tx) => {
    if (tx.type === "income") {
      income += tx.amount;
    } else if (tx.type === "expense") {
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

  // Tambahkan incomeAdjustment dari semua akun
  const totalAdjustment = (accounts || []).reduce(
    (sum, acc) => sum + (acc.incomeAdjustment || 0),
    0
  );

  return {
    income: income + totalAdjustment,
    expense,
    balance: income + totalAdjustment - expense,
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
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) {
      setTransactions([]);
      setAccounts([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);

    const transactionsQuery = query(
      collection(db, "users", user.uid, "transactions"),
      orderBy("date", "desc")
    );
    const accountsQuery = query(
      collection(db, "users", user.uid, "accounts"),
      orderBy("sortOrder", "asc")
    );

    let transactionReady = false;
    let accountReady = false;
    const markReady = () => {
      if (transactionReady && accountReady) {
        setLoading(false);
      }
    };

    const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      setTransactions(snapshot.docs.map((item) => item.data()));
      transactionReady = true;
      markReady();
    });

    const unsubscribeAccounts = onSnapshot(accountsQuery, (snapshot) => {
      setAccounts(snapshot.docs.map((item) => item.data()));
      accountReady = true;
      markReady();
    });

    return () => {
      unsubscribeTransactions();
      unsubscribeAccounts();
    };
  }, [user]);

  const safeTransactions = useMemo(() => transactions || [], [transactions]);
  const safeAccounts = useMemo(() => accounts || [], [accounts]);

  return {
    transactions: safeTransactions,
    summary: computeSummary(safeTransactions, safeAccounts),
    weeklyExpense: computeWeeklyExpense(safeTransactions),
    loading
  };
}

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { db } from "../services/firebaseClient";
import { getAllAccounts } from "../services/accountService";

function computeAccountSummary(accounts, transactions) {
  const summaryMap = new Map(
    accounts.map((account) => [
      account.id,
      {
        ...account,
        incomeAdjustment: account.incomeAdjustment || 0,
        expenseTotal: 0,
        incomeTotal: account.incomeAdjustment || 0,
        transactionCount: 0
      }
    ])
  );

  let uncategorizedExpenseTotal = 0;
  let uncategorizedIncomeTotal = 0;

  transactions.forEach((transaction) => {
    const accountSummary = summaryMap.get(transaction.accountId);
    if (!accountSummary) {
      if (transaction.type === "expense") {
        uncategorizedExpenseTotal += transaction.amount;
      } else if (transaction.type === "income") {
        uncategorizedIncomeTotal += transaction.amount;
      }
      return;
    }

    if (transaction.type === "expense") {
      accountSummary.expenseTotal += transaction.amount;
    } else if (transaction.type === "income") {
      accountSummary.incomeTotal += transaction.amount;
    } else if (transaction.type === "transfer") {
      accountSummary.expenseTotal += transaction.amount;
      const destSummary = summaryMap.get(transaction.destinationAccountId);
      if (destSummary) {
        destSummary.incomeTotal += transaction.amount;
      }
    }

    accountSummary.transactionCount += 1;
  });

  const accountValues = Array.from(summaryMap.values());

  return {
    accounts: accountValues,
    totals: {
      expense: accountValues.reduce((sum, item) => sum + item.expenseTotal, 0),
      income: accountValues.reduce((sum, item) => sum + item.incomeTotal, 0),
      uncategorizedExpense: uncategorizedExpenseTotal,
      uncategorizedIncome: uncategorizedIncomeTotal,
      accountCount: accounts.length
    }
  };
}

export function useAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) {
      setAccounts([]);
      setTransactions([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);

    getAllAccounts().catch(() => {
      // Seed default accounts akan dicoba ulang di pemanggilan berikutnya.
    });

    const accountsQuery = query(
      collection(db, "users", user.uid, "accounts"),
      orderBy("sortOrder", "asc")
    );
    const transactionsQuery = query(collection(db, "users", user.uid, "transactions"));

    let accountReady = false;
    let transactionReady = false;
    const markReady = () => {
      if (accountReady && transactionReady) {
        setLoading(false);
      }
    };

    const unsubscribeAccounts = onSnapshot(accountsQuery, (snapshot) => {
      setAccounts(snapshot.docs.map((item) => item.data()));
      accountReady = true;
      markReady();
    });

    const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      setTransactions(snapshot.docs.map((item) => item.data()));
      transactionReady = true;
      markReady();
    });

    return () => {
      unsubscribeAccounts();
      unsubscribeTransactions();
    };
  }, [user]);

  const safeAccounts = useMemo(() => accounts || [], [accounts]);
  const safeSummary = useMemo(
    () => computeAccountSummary(safeAccounts, transactions || []),
    [safeAccounts, transactions]
  );

  return {
    accounts: safeAccounts,
    summary: safeSummary,
    loading
  };
}

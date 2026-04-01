import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { getDefaultAccountsWithMeta } from "../data/accounts";
import { auth, db, assertFirebaseReady } from "./firebaseClient";

const fallbackAccountLabel = "Tanpa rekening";

function getActiveUserId() {
  assertFirebaseReady();
  const userId = auth.currentUser?.uid;
  if (!userId) {
    throw new Error("Silakan login Google dulu untuk mengakses data akun.");
  }
  return userId;
}

function getAccountsCollection(userId) {
  return collection(db, "users", userId, "accounts");
}

function getTransactionsCollection(userId) {
  return collection(db, "users", userId, "transactions");
}

function createAccountId(name) {
  const compactName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);

  const suffix = Math.round(Math.random() * 100000).toString(36);
  return `${compactName || "rekening"}-${suffix}`;
}

export async function getAllAccounts() {
  const userId = getActiveUserId();
  const accountsCol = getAccountsCollection(userId);
  const accountsQuery = query(accountsCol, orderBy("sortOrder", "asc"));
  const snapshot = await getDocs(accountsQuery);

  if (!snapshot.empty) {
    return snapshot.docs.map((item) => item.data());
  }

  const timestamp = new Date().toISOString();
  const defaultAccounts = getDefaultAccountsWithMeta(timestamp).map((account) => ({
    ...account,
    initialBalance: account.initialBalance || 0,
    incomeAdjustment: account.incomeAdjustment || 0,
    expenseAdjustment: account.expenseAdjustment || 0,
    userId
  }));

  await Promise.all(
    defaultAccounts.map((account) => setDoc(doc(accountsCol, account.id), account))
  );

  return defaultAccounts;
}

export async function getAccountById(accountId) {
  if (typeof accountId !== "string" || accountId.trim().length === 0) {
    return null;
  }

  const userId = getActiveUserId();
  const accountRef = doc(db, "users", userId, "accounts", accountId.trim());
  const snapshot = await getDoc(accountRef);
  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data();
}

export async function addAccount(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Data rekening tidak valid.");
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  if (name.length < 2) {
    throw new Error("Nama rekening minimal 2 karakter.");
  }

  const type = typeof payload.type === "string" ? payload.type.trim() : "cash";
  const validTypes = new Set(["cash", "bank", "ewallet", "other"]);
  if (!validTypes.has(type)) {
    throw new Error("Tipe rekening tidak valid.");
  }

  const userId = getActiveUserId();
  const accounts = await getAllAccounts();
  const existing = accounts.find((account) => account.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    throw new Error("Nama rekening sudah dipakai.");
  }

  const currentCount = accounts.length;
  const timestamp = new Date().toISOString();

  const account = {
    id: createAccountId(name),
    name,
    type,
    initialBalance: 0,
    incomeAdjustment: 0,
    expenseAdjustment: 0,
    sortOrder: currentCount + 1,
    userId,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  const accountRef = doc(db, "users", userId, "accounts", account.id);
  await setDoc(accountRef, account);
  return account;
}

export async function removeAccount(accountId) {
  if (typeof accountId !== "string" || accountId.trim().length === 0) {
    throw new Error("ID rekening tidak valid.");
  }

  const userId = getActiveUserId();
  const accountRef = doc(db, "users", userId, "accounts", accountId);
  const targetSnapshot = await getDoc(accountRef);
  const targetAccount = targetSnapshot.exists() ? targetSnapshot.data() : null;
  if (!targetAccount) {
    throw new Error("Rekening tidak ditemukan.");
  }

  const usageQuery = query(
    getTransactionsCollection(userId),
    where("accountId", "==", accountId),
    limit(1)
  );
  const usageSnapshot = await getDocs(usageQuery);
  if (!usageSnapshot.empty) {
    throw new Error("Rekening sudah dipakai transaksi, tidak bisa dihapus.");
  }

  await deleteDoc(accountRef);
}

export async function updateAccountMeta(accountId, name, type) {
  if (typeof accountId !== "string" || accountId.trim().length === 0) {
    throw new Error("ID rekening tidak valid.");
  }

  const normalizedName = typeof name === "string" ? name.trim() : "";
  if (normalizedName.length < 2) {
    throw new Error("Nama rekening minimal 2 karakter.");
  }
  
  const validTypes = new Set(["cash", "bank", "ewallet", "other"]);
  const normalizedType = validTypes.has(type) ? type : "cash";

  const userId = getActiveUserId();
  const accountRef = doc(db, "users", userId, "accounts", accountId);
  const currentSnapshot = await getDoc(accountRef);
  const current = currentSnapshot.exists() ? currentSnapshot.data() : null;
  if (!current) {
    throw new Error("Rekening tidak ditemukan.");
  }

  const accounts = await getAllAccounts();
  const duplicate = accounts.find(
    (account) => account.id !== accountId && account.name.toLowerCase() === normalizedName.toLowerCase()
  );
  if (duplicate) {
    throw new Error("Nama rekening sudah dipakai.");
  }

  await updateDoc(accountRef, {
    name: normalizedName,
    type: normalizedType,
    updatedAt: new Date().toISOString()
  });
}

export async function updateAccountStats(accountId, desiredIncome, currentTransactionIncome, desiredExpense, currentTransactionExpense) {
  if (typeof accountId !== "string" || accountId.trim().length === 0) {
    throw new Error("ID rekening tidak valid.");
  }

  const userId = getActiveUserId();
  const accountRef = doc(db, "users", userId, "accounts", accountId);
  const currentSnapshot = await getDoc(accountRef);
  const current = currentSnapshot.exists() ? currentSnapshot.data() : null;
  if (!current) {
    throw new Error("Rekening tidak ditemukan.");
  }

  const incAdj = Math.round(Number(desiredIncome) - Number(currentTransactionIncome));
  const expAdj = Math.round(Number(desiredExpense) - Number(currentTransactionExpense));

  await updateDoc(accountRef, {
    incomeAdjustment: incAdj,
    expenseAdjustment: expAdj,
    updatedAt: new Date().toISOString()
  });
}

export function resolveTransactionAccountLabel(transaction, accountMap = new Map()) {
  if (transaction?.accountId && accountMap.has(transaction.accountId)) {
    return accountMap.get(transaction.accountId).name;
  }

  if (typeof transaction?.accountLabel === "string" && transaction.accountLabel.trim().length > 0) {
    return transaction.accountLabel.trim();
  }

  return fallbackAccountLabel;
}

export async function getAccountExpenseSummary() {
  const userId = getActiveUserId();
  const [accounts, transactionSnapshot] = await Promise.all([
    getAllAccounts(),
    getDocs(getTransactionsCollection(userId))
  ]);

  const transactions = transactionSnapshot.docs.map((item) => item.data());

  const summaryMap = new Map(
    accounts.map((account) => [
      account.id,
      {
        ...account,
        incomeAdjustment: account.incomeAdjustment || 0,
        expenseAdjustment: account.expenseAdjustment || 0,
        expenseTotal: account.expenseAdjustment || 0,
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
    }

    if (transaction.type === "income") {
      accountSummary.incomeTotal += transaction.amount;
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

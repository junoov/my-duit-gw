import { db } from "../db/database";

const fallbackAccountLabel = "Tanpa rekening";

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
  return db.accounts.orderBy("sortOrder").toArray();
}

export async function getAccountById(accountId) {
  if (typeof accountId !== "string" || accountId.trim().length === 0) {
    return null;
  }

  return db.accounts.get(accountId.trim());
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

  const existing = await db.accounts
    .filter((account) => account.name.toLowerCase() === name.toLowerCase())
    .first();
  if (existing) {
    throw new Error("Nama rekening sudah dipakai.");
  }

  const currentCount = await db.accounts.count();
  const timestamp = new Date().toISOString();

  const account = {
    id: createAccountId(name),
    name,
    type,
    sortOrder: currentCount + 1,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  await db.accounts.add(account);
  return account;
}

export async function removeAccount(accountId) {
  if (typeof accountId !== "string" || accountId.trim().length === 0) {
    throw new Error("ID rekening tidak valid.");
  }

  const targetAccount = await db.accounts.get(accountId);
  if (!targetAccount) {
    throw new Error("Rekening tidak ditemukan.");
  }

  const usageCount = await db.transactions.where("accountId").equals(accountId).count();
  if (usageCount > 0) {
    throw new Error("Rekening sudah dipakai transaksi, tidak bisa dihapus.");
  }

  await db.accounts.delete(accountId);
}

export async function renameAccount(accountId, name) {
  if (typeof accountId !== "string" || accountId.trim().length === 0) {
    throw new Error("ID rekening tidak valid.");
  }

  const normalizedName = typeof name === "string" ? name.trim() : "";
  if (normalizedName.length < 2) {
    throw new Error("Nama rekening minimal 2 karakter.");
  }

  const current = await db.accounts.get(accountId);
  if (!current) {
    throw new Error("Rekening tidak ditemukan.");
  }

  const duplicate = await db.accounts
    .filter((account) => account.id !== accountId && account.name.toLowerCase() === normalizedName.toLowerCase())
    .first();
  if (duplicate) {
    throw new Error("Nama rekening sudah dipakai.");
  }

  await db.accounts.update(accountId, {
    name: normalizedName,
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
  const [accounts, transactions] = await Promise.all([getAllAccounts(), db.transactions.toArray()]);

  const summaryMap = new Map(
    accounts.map((account) => [
      account.id,
      {
        ...account,
        expenseTotal: 0,
        incomeTotal: 0,
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

  return {
    accounts: Array.from(summaryMap.values()),
    totals: {
      expense: Array.from(summaryMap.values()).reduce((sum, item) => sum + item.expenseTotal, 0),
      income: Array.from(summaryMap.values()).reduce((sum, item) => sum + item.incomeTotal, 0),
      uncategorizedExpense: uncategorizedExpenseTotal,
      uncategorizedIncome: uncategorizedIncomeTotal,
      accountCount: accounts.length
    }
  };
}

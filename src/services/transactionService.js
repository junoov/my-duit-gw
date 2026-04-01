import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  orderBy
} from "firebase/firestore";
import { getAccountById } from "./accountService";
import { auth, db, assertFirebaseReady } from "./firebaseClient";

const validTypes = new Set(["expense", "income"]);
const validInputMethods = new Set(["manual", "scan"]);

function getActiveUserId() {
  assertFirebaseReady();
  const userId = auth.currentUser?.uid;
  if (!userId) {
    throw new Error("Silakan login Google dulu untuk mengakses transaksi.");
  }
  return userId;
}

function getTransactionsCollection(userId) {
  return collection(db, "users", userId, "transactions");
}

function createTransactionId() {
  const cryptoApi = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;

  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return `tx-${Date.now()}-${Math.round(Math.random() * 1000000000)}`;
}

function normalizeLineItems(lineItems) {
  if (!Array.isArray(lineItems)) {
    return [];
  }

  return lineItems
    .map((item) => {
      const name = typeof item?.name === "string" ? item.name.trim() : "";
      const quantity = Number(item?.quantity);
      const amount = Number(item?.amount);

      return {
        name,
        quantity: Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity) : 1,
        amount: Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0
      };
    })
    .filter((item) => item.name.length > 0 && item.amount > 0);
}

export async function addTransaction(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Data transaksi tidak valid.");
  }

  const normalizedAmount = Number(payload.amount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new Error("Nominal transaksi harus lebih besar dari nol.");
  }

  if (!validTypes.has(payload.type)) {
    throw new Error("Tipe transaksi harus expense atau income.");
  }

  if (typeof payload.category !== "string" || payload.category.trim().length === 0) {
    throw new Error("Kategori transaksi wajib diisi.");
  }

  if (!validInputMethods.has(payload.inputMethod)) {
    throw new Error("Metode input transaksi tidak valid.");
  }

  if (typeof payload.accountId !== "string" || payload.accountId.trim().length === 0) {
    throw new Error("Akun sumber dana wajib dipilih.");
  }

  const selectedAccount = await getAccountById(payload.accountId);
  if (!selectedAccount) {
    throw new Error("Akun yang dipilih tidak ditemukan.");
  }

  const parsedDate = new Date(payload.date);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Tanggal transaksi tidak valid.");
  }

  const userId = getActiveUserId();

  const normalizedDescription =
    typeof payload.description === "string" && payload.description.trim().length > 0
      ? payload.description.trim()
      : "Tanpa deskripsi";
  const normalizedLineItems = normalizeLineItems(payload.lineItems);

  const transaction = {
    id: createTransactionId(),
    type: payload.type,
    amount: Math.round(normalizedAmount),
    category: payload.category.trim(),
    description: normalizedDescription,
    date: parsedDate.toISOString(),
    inputMethod: payload.inputMethod,
    accountId: selectedAccount.id,
    accountLabel:
      typeof payload.accountLabel === "string" && payload.accountLabel.trim().length > 0
        ? payload.accountLabel.trim()
        : selectedAccount.name,
    ...(normalizedLineItems.length > 0 ? { lineItems: normalizedLineItems } : {}),
    receiptImageRef: payload.receiptImageRef || null,
    userId,
    createdAt: new Date().toISOString()
  };

  const transactionRef = doc(getTransactionsCollection(userId), transaction.id);
  await setDoc(transactionRef, transaction);
  return transaction;
}

export async function getAllTransactionsDesc() {
  const userId = getActiveUserId();
  const transactionsQuery = query(getTransactionsCollection(userId), orderBy("date", "desc"));
  const snapshot = await getDocs(transactionsQuery);
  return snapshot.docs.map((item) => item.data());
}

export async function deleteTransaction(transactionId) {
  if (typeof transactionId !== "string" || transactionId.trim().length === 0) {
    throw new Error("ID transaksi tidak valid.");
  }

  const userId = getActiveUserId();
  const transactionRef = doc(db, "users", userId, "transactions", transactionId);
  const existingSnapshot = await getDoc(transactionRef);
  const existing = existingSnapshot.exists() ? existingSnapshot.data() : null;
  if (!existing) {
    throw new Error("Transaksi tidak ditemukan.");
  }

  await deleteDoc(transactionRef);
  return existing;
}

export async function getTransactionsByAccountId(accountId) {
  if (typeof accountId !== "string" || accountId.trim().length === 0) {
    return [];
  }

  const transactions = await getAllTransactionsDesc();
  return transactions.filter((item) => item.accountId === accountId.trim());
}

export async function updateTransaction(transactionId, payload) {
  if (typeof transactionId !== "string" || transactionId.trim().length === 0) {
    throw new Error("ID transaksi tidak valid.");
  }

  const userId = getActiveUserId();
  const transactionRef = doc(getTransactionsCollection(userId), transactionId);
  
  // Validation similar to add
  if (payload.amount !== undefined) {
    const normalizedAmount = Number(payload.amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      throw new Error("Nominal transaksi harus lebih besar dari nol.");
    }
    payload.amount = Math.round(normalizedAmount);
  }

  if (payload.accountId) {
    const selectedAccount = await getAccountById(payload.accountId);
    if (!selectedAccount) {
      throw new Error("Akun yang dipilih tidak ditemukan.");
    }
    payload.accountLabel =
      typeof payload.accountLabel === "string" && payload.accountLabel.trim().length > 0
        ? payload.accountLabel.trim()
        : selectedAccount.name;
  }

  if (payload.date) {
    const parsedDate = new Date(payload.date);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error("Tanggal transaksi tidak valid.");
    }
    payload.date = parsedDate.toISOString();
  }

  await setDoc(transactionRef, payload, { merge: true });
  return payload;
}

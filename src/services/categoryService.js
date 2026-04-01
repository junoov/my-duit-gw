import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
  writeBatch
} from "firebase/firestore";
import { categories as defaultCategories } from "../data/categories";
import { auth, db, assertFirebaseReady } from "./firebaseClient";

function getActiveUserId() {
  assertFirebaseReady();
  const userId = auth.currentUser?.uid;
  if (!userId) {
    throw new Error("Silakan login Google dulu untuk mengelola kategori.");
  }
  return userId;
}

function createCategoryId(label) {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 24);

  const suffix = Math.round(Math.random() * 100000).toString(36);
  return `custom-${slug || "kategori"}-${suffix}`;
}

function getCategoriesCollection(userId) {
  return collection(db, "users", userId, "categories");
}

function getTransactionsCollection(userId) {
  return collection(db, "users", userId, "transactions");
}

export function subscribeUserCategories(userId, onUpdate, onError) {
  const categoriesQuery = query(
    collection(db, "users", userId, "categories"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(
    categoriesQuery,
    (snapshot) => {
      onUpdate(snapshot.docs.map((item) => item.data()));
    },
    onError
  );
}

export async function addCustomCategory(label) {
  const userId = getActiveUserId();
  const normalizedLabel = typeof label === "string" ? label.trim() : "";
  if (normalizedLabel.length < 2) {
    throw new Error("Nama kategori minimal 2 karakter.");
  }

  const lowerLabel = normalizedLabel.toLowerCase();
  const duplicateDefault = defaultCategories.some(
    (item) => item.label.toLowerCase() === lowerLabel
  );
  if (duplicateDefault) {
    throw new Error("Kategori default sudah ada.");
  }

  const existingSnapshot = await getDocs(getCategoriesCollection(userId));
  const duplicateCustom = existingSnapshot.docs.some(
    (item) => item.data().label?.toLowerCase() === lowerLabel
  );
  if (duplicateCustom) {
    throw new Error("Nama kategori sudah dipakai.");
  }

  const newCategory = {
    id: createCategoryId(normalizedLabel),
    label: normalizedLabel,
    icon: "bookmark",
    userId,
    createdAt: new Date().toISOString()
  };

  await setDoc(doc(getCategoriesCollection(userId), newCategory.id), newCategory);
  return newCategory;
}

export async function removeCustomCategory(categoryId, replacementCategoryId = "lainnya") {
  const userId = getActiveUserId();
  const normalizedCategoryId = typeof categoryId === "string" ? categoryId.trim() : "";
  if (!normalizedCategoryId) {
    throw new Error("ID kategori tidak valid.");
  }

  const isDefaultCategory = defaultCategories.some((item) => item.id === normalizedCategoryId);
  if (isDefaultCategory) {
    throw new Error("Kategori bawaan tidak bisa dihapus.");
  }

  const categoryRef = doc(db, "users", userId, "categories", normalizedCategoryId);
  const categorySnapshot = await getDoc(categoryRef);
  if (!categorySnapshot.exists()) {
    throw new Error("Kategori tidak ditemukan.");
  }

  const targetReplacementId =
    replacementCategoryId && replacementCategoryId !== normalizedCategoryId
      ? replacementCategoryId
      : "lainnya";

  const transactionsSnapshot = await getDocs(
    query(getTransactionsCollection(userId), where("category", "==", normalizedCategoryId))
  );

  if (!transactionsSnapshot.empty) {
    for (let offset = 0; offset < transactionsSnapshot.docs.length; offset += 400) {
      const batch = writeBatch(db);
      const chunk = transactionsSnapshot.docs.slice(offset, offset + 400);
      chunk.forEach((transactionDoc) => {
        batch.update(transactionDoc.ref, { category: targetReplacementId });
      });
      await batch.commit();
    }
  }

  await deleteDoc(categoryRef);

  return {
    deletedCategoryId: normalizedCategoryId,
    reassignedTransactions: transactionsSnapshot.size,
    replacementCategoryId: targetReplacementId
  };
}

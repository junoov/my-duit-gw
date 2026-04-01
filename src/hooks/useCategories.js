import { categories as defaultCategories } from "../data/categories";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../services/firebaseClient";
import { subscribeUserCategories } from "../services/categoryService";

export function useCategories() {
  const { user } = useAuth();
  const [customCategories, setCustomCategories] = useState([]);

  useEffect(() => {
    if (!user || !db) {
      setCustomCategories([]);
      return undefined;
    }

    const unsubscribe = subscribeUserCategories(
      user.uid,
      (items) => {
        setCustomCategories(items);
      },
      () => {
        setCustomCategories([]);
      }
    );

    return unsubscribe;
  }, [user]);

  const allCategories = useMemo(() => {
    const categoryMap = new Map(defaultCategories.map((item) => [item.id, item]));
    customCategories.forEach((item) => {
      if (!categoryMap.has(item.id)) {
        categoryMap.set(item.id, item);
      }
    });
    return Array.from(categoryMap.values());
  }, [customCategories]);

  const customCategoryIds = useMemo(() => {
    return new Set(customCategories.map((item) => item.id));
  }, [customCategories]);

  const getCategoryMeta = (categoryId) => {
    return allCategories.find((c) => c.id === categoryId) || defaultCategories[defaultCategories.length - 1]; // Fallback to 'Lainnya'
  };

  const isCustomCategory = (categoryId) => customCategoryIds.has(categoryId);

  return { allCategories, getCategoryMeta, isCustomCategory };
}

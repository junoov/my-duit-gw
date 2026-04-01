import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/database";
import { categories as defaultCategories } from "../data/categories";
import { useMemo } from "react";

export function useCategories() {
  const customCategories = useLiveQuery(() => db.categories.toArray(), []) || [];
  
  const allCategories = useMemo(() => {
    return [...defaultCategories, ...customCategories];
  }, [customCategories]);

  const getCategoryMeta = (categoryId) => {
    return allCategories.find((c) => c.id === categoryId) || defaultCategories[defaultCategories.length - 1]; // Fallback to 'Lainnya'
  };

  return { allCategories, getCategoryMeta };
}

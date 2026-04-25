import { useCallback, useEffect, useMemo, useState } from "react";
import { defaultCategoryId } from "../data/categories";

const STORAGE_KEY = "warta-artha-transaction-preferences";
const STORAGE_EVENT = "warta-artha-transaction-preferences-updated";
const MAX_TEMPLATES = 12;

function createPreferenceId(prefix) {
  const cryptoApi = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;

  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return `${prefix}-${cryptoApi.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000000)}`;
}

function createDefaultPreferences() {
  return {
    version: 1,
    templates: [],
    defaults: {
      lastType: "expense",
      accountByType: {},
      categoryByType: {
        expense: defaultCategoryId,
        income: defaultCategoryId
      },
      scanAccountId: "",
      scanCategoryId: defaultCategoryId
    }
  };
}

function sanitizeTemplate(input) {
  if (!input || typeof input !== "object") {
    return null;
  }

  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) {
    return null;
  }

  const now = new Date().toISOString();
  const normalizedAmount = Number(input.amount);

  return {
    id:
      typeof input.id === "string" && input.id.trim().length > 0
        ? input.id.trim()
        : createPreferenceId("template"),
    name,
    type: input.type === "income" ? "income" : "expense",
    amount: Number.isFinite(normalizedAmount) && normalizedAmount > 0 ? Math.round(normalizedAmount) : 0,
    category:
      typeof input.category === "string" && input.category.trim().length > 0
        ? input.category.trim()
        : defaultCategoryId,
    accountId: typeof input.accountId === "string" ? input.accountId.trim() : "",
    description: typeof input.description === "string" ? input.description.trim() : "",
    createdAt:
      typeof input.createdAt === "string" && input.createdAt.trim().length > 0 ? input.createdAt : now,
    updatedAt:
      typeof input.updatedAt === "string" && input.updatedAt.trim().length > 0 ? input.updatedAt : now,
    lastUsedAt:
      typeof input.lastUsedAt === "string" && input.lastUsedAt.trim().length > 0 ? input.lastUsedAt : "",
    useCount: Number.isFinite(Number(input.useCount)) ? Math.max(0, Math.round(Number(input.useCount))) : 0
  };
}

function sortTemplates(templates) {
  return [...templates].sort((left, right) => {
    const rightTime = right.lastUsedAt || right.updatedAt || right.createdAt || "";
    const leftTime = left.lastUsedAt || left.updatedAt || left.createdAt || "";

    if (rightTime !== leftTime) {
      return rightTime.localeCompare(leftTime);
    }

    if (right.useCount !== left.useCount) {
      return right.useCount - left.useCount;
    }

    return left.name.localeCompare(right.name, "id-ID");
  });
}

function sanitizePreferences(rawValue) {
  const fallback = createDefaultPreferences();

  if (!rawValue || typeof rawValue !== "object") {
    return fallback;
  }

  const defaults = rawValue.defaults && typeof rawValue.defaults === "object" ? rawValue.defaults : {};
  const templates = Array.isArray(rawValue.templates)
    ? sortTemplates(rawValue.templates.map(sanitizeTemplate).filter(Boolean)).slice(0, MAX_TEMPLATES)
    : [];

  return {
    version: 1,
    templates,
    defaults: {
      lastType: defaults.lastType === "income" ? "income" : "expense",
      accountByType:
        defaults.accountByType && typeof defaults.accountByType === "object" ? defaults.accountByType : {},
      categoryByType: {
        expense:
          typeof defaults.categoryByType?.expense === "string" && defaults.categoryByType.expense.trim().length > 0
            ? defaults.categoryByType.expense.trim()
            : defaultCategoryId,
        income:
          typeof defaults.categoryByType?.income === "string" && defaults.categoryByType.income.trim().length > 0
            ? defaults.categoryByType.income.trim()
            : defaultCategoryId
      },
      scanAccountId:
        typeof defaults.scanAccountId === "string" && defaults.scanAccountId.trim().length > 0
          ? defaults.scanAccountId.trim()
          : "",
      scanCategoryId:
        typeof defaults.scanCategoryId === "string" && defaults.scanCategoryId.trim().length > 0
          ? defaults.scanCategoryId.trim()
          : defaultCategoryId
    }
  };
}

function readStoredPreferences() {
  if (typeof window === "undefined") {
    return createDefaultPreferences();
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return createDefaultPreferences();
    }

    return sanitizePreferences(JSON.parse(rawValue));
  } catch {
    return createDefaultPreferences();
  }
}

function writeStoredPreferences(value) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = sanitizePreferences(value);

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new Event(STORAGE_EVENT));
  } catch {
    // Keep preference persistence best-effort so transaction saves never fail because storage is unavailable.
  }
}

export function useTransactionPreferences() {
  const [preferences, setPreferences] = useState(() => readStoredPreferences());

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const syncPreferences = () => {
      setPreferences(readStoredPreferences());
    };

    window.addEventListener("storage", syncPreferences);
    window.addEventListener(STORAGE_EVENT, syncPreferences);

    return () => {
      window.removeEventListener("storage", syncPreferences);
      window.removeEventListener(STORAGE_EVENT, syncPreferences);
    };
  }, []);

  const updatePreferences = useCallback((updater) => {
    const currentValue = readStoredPreferences();
    const nextValue = sanitizePreferences(
      typeof updater === "function" ? updater(currentValue) : updater
    );

    writeStoredPreferences(nextValue);
    setPreferences(nextValue);
    return nextValue;
  }, []);

  const saveTemplate = useCallback(
    (templateInput) => {
      let savedTemplate = null;

      updatePreferences((current) => {
        const normalizedTemplate = sanitizeTemplate(templateInput);
        if (!normalizedTemplate) {
          return current;
        }

        const now = new Date().toISOString();
        const existingIndex = current.templates.findIndex((item) => item.id === normalizedTemplate.id);
        const nextTemplates = [...current.templates];

        if (existingIndex >= 0) {
          const existing = nextTemplates[existingIndex];
          savedTemplate = {
            ...existing,
            ...normalizedTemplate,
            createdAt: existing.createdAt,
            updatedAt: now
          };
          nextTemplates[existingIndex] = savedTemplate;
        } else {
          savedTemplate = {
            ...normalizedTemplate,
            createdAt: normalizedTemplate.createdAt || now,
            updatedAt: now
          };
          nextTemplates.unshift(savedTemplate);
        }

        return {
          ...current,
          templates: sortTemplates(nextTemplates).slice(0, MAX_TEMPLATES)
        };
      });

      return savedTemplate;
    },
    [updatePreferences]
  );

  const deleteTemplate = useCallback(
    (templateId) => {
      if (typeof templateId !== "string" || templateId.trim().length === 0) {
        return;
      }

      updatePreferences((current) => ({
        ...current,
        templates: current.templates.filter((item) => item.id !== templateId)
      }));
    },
    [updatePreferences]
  );

  const markTemplateUsed = useCallback(
    (templateId) => {
      if (typeof templateId !== "string" || templateId.trim().length === 0) {
        return;
      }

      updatePreferences((current) => {
        const now = new Date().toISOString();

        return {
          ...current,
          templates: sortTemplates(
            current.templates.map((item) =>
              item.id === templateId
                ? {
                    ...item,
                    lastUsedAt: now,
                    updatedAt: now,
                    useCount: (item.useCount || 0) + 1
                  }
                : item
            )
          )
        };
      });
    },
    [updatePreferences]
  );

  const rememberTransactionDefaults = useCallback(
    ({ type, accountId, category, inputMethod }) => {
      updatePreferences((current) => {
        const normalizedType = type === "income" ? "income" : "expense";
        const nextDefaults = {
          ...current.defaults,
          lastType: normalizedType,
          accountByType: {
            ...current.defaults.accountByType,
            ...(typeof accountId === "string" && accountId.trim().length > 0
              ? { [normalizedType]: accountId.trim() }
              : {})
          },
          categoryByType: {
            ...current.defaults.categoryByType,
            ...(typeof category === "string" && category.trim().length > 0
              ? { [normalizedType]: category.trim() }
              : {})
          }
        };

        if (inputMethod === "scan") {
          nextDefaults.scanAccountId =
            typeof accountId === "string" && accountId.trim().length > 0 ? accountId.trim() : current.defaults.scanAccountId;
          nextDefaults.scanCategoryId =
            typeof category === "string" && category.trim().length > 0 ? category.trim() : current.defaults.scanCategoryId;
        }

        return {
          ...current,
          defaults: nextDefaults
        };
      });
    },
    [updatePreferences]
  );

  return useMemo(
    () => ({
      templates: preferences.templates,
      defaults: preferences.defaults,
      saveTemplate,
      deleteTemplate,
      markTemplateUsed,
      rememberTransactionDefaults
    }),
    [preferences, saveTemplate, deleteTemplate, markTemplateUsed, rememberTransactionDefaults]
  );
}

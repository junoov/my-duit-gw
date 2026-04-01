import { useLiveQuery } from "dexie-react-hooks";
import { getAccountExpenseSummary, getAllAccounts } from "../services/accountService";

export function useAccounts() {
  const accounts = useLiveQuery(() => getAllAccounts(), [], []);
  const accountSummary = useLiveQuery(() => getAccountExpenseSummary(), [], null);

  const safeAccounts = accounts || [];
  const safeSummary = accountSummary || {
    accounts: [],
    totals: {
      expense: 0,
      income: 0,
      uncategorizedExpense: 0,
      uncategorizedIncome: 0,
      accountCount: 0
    }
  };

  return {
    accounts: safeAccounts,
    summary: safeSummary
  };
}

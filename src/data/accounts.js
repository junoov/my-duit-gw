export const defaultAccounts = [
  {
    id: "cash",
    name: "Cash",
    type: "cash",
    sortOrder: 1
  },
  {
    id: "bca",
    name: "BCA",
    type: "bank",
    sortOrder: 2
  },
  {
    id: "ewallet",
    name: "E-wallet",
    type: "ewallet",
    sortOrder: 3
  }
];

export function getDefaultAccountsWithMeta(timestamp = new Date().toISOString()) {
  return defaultAccounts.map((account) => ({
    ...account,
    createdAt: timestamp,
    updatedAt: timestamp
  }));
}

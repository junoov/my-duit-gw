import Dexie from "dexie";
import { getDefaultAccountsWithMeta } from "../data/accounts";

class WartaArthaDB extends Dexie {
  constructor() {
    super("warta_artha_db");
    this.version(1).stores({
      transactions: "id,date,type,category,inputMethod,createdAt"
    });

    this.version(2)
      .stores({
        transactions: "id,date,type,category,inputMethod,createdAt,accountId,accountLabel",
        accounts: "id,name,type,sortOrder,createdAt,updatedAt"
      })
      .upgrade(async (tx) => {
        const accountsTable = tx.table("accounts");
        const existingCount = await accountsTable.count();
        if (existingCount === 0) {
          await accountsTable.bulkAdd(getDefaultAccountsWithMeta());
        }
      });

    this.version(3).stores({
      transactions: "id,date,type,category,inputMethod,createdAt,accountId,accountLabel",
      accounts: "id,name,type,sortOrder,createdAt,updatedAt",
      categories: "id,label,icon,createdAt"
    });

    this.transactions = this.table("transactions");
    this.accounts = this.table("accounts");
    this.categories = this.table("categories");
  }
}

export const db = new WartaArthaDB();

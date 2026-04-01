import { useMemo, useState } from "react";
import TransactionDetailModal from "../components/TransactionDetailModal";
import TransactionList from "../components/TransactionList";
import { useAccounts } from "../hooks/useAccounts";
import { useTransactions } from "../hooks/useTransactions";
import { deleteTransaction } from "../services/transactionService";
import { formatRupiah } from "../utils/currency";

function HomePage() {
  const { transactions, summary } = useTransactions();
  const { accounts } = useAccounts();
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const accountMap = useMemo(() => {
    return new Map(accounts.map((account) => [account.id, account]));
  }, [accounts]);

  const todayTransactions = transactions.filter(
    (transaction) => new Date(transaction.date).toDateString() === new Date().toDateString()
  );

  return (
    <>
      <section className="space-y-2">
        <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant">TOTAL BALANCE</span>
        <div className="glass-card p-8 rounded-3xl relative overflow-hidden border border-primary/10 transition-transform active:scale-[0.98]">
          <div className="relative z-10">
            <div className="flex items-baseline gap-2">
              <span className="text-on-surface-variant font-medium text-2xl">Rp</span>
              <span className="text-5xl md:text-6xl font-bold tracking-tight text-on-surface">
                {formatRupiah(summary.balance).replace("Rp", "").trim()}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              <span className="text-xs font-medium">+{formatRupiah(summary.income)} this month</span>
            </div>
          </div>
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div className="bg-surface-container-high p-5 rounded-3xl space-y-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">south_west</span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">Income</span>
            <p className="text-xl font-bold text-on-surface">{formatRupiah(summary.income)}</p>
          </div>
        </div>
        <div className="bg-surface-container-high p-5 rounded-3xl space-y-4">
          <div className="w-10 h-10 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary">
            <span className="material-symbols-outlined">north_east</span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">Expenses</span>
            <p className="text-xl font-bold text-on-surface">{formatRupiah(summary.expense)}</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-on-surface tracking-tight">Transaksi Hari Ini</h2>
        </div>

        <TransactionList
          transactions={todayTransactions}
          accountMap={accountMap}
          onSelectTransaction={setSelectedTransaction}
        />
      </section>

      <TransactionDetailModal
        transaction={selectedTransaction}
        accountMap={accountMap}
        onClose={() => setSelectedTransaction(null)}
        onDelete={deleteTransaction}
      />
    </>
  );
}

export default HomePage;

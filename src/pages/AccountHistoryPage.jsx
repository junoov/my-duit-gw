import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TransactionList from "../components/TransactionList";
import { useAccounts } from "../hooks/useAccounts";
import { useTransactions } from "../hooks/useTransactions";
import { formatRupiah } from "../utils/currency";

function AccountHistoryPage() {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const { accounts, loading: accountsLoading } = useAccounts();
  const { transactions, loading: transactionsLoading } = useTransactions();

  const account = useMemo(
    () => accounts.find((item) => item.id === accountId) || null,
    [accounts, accountId]
  );

  const accountTransactions = useMemo(() => {
    return transactions.filter((item) => item.accountId === accountId);
  }, [transactions, accountId]);

  const loading = accountsLoading || transactionsLoading;

  const accountMap = useMemo(() => {
    if (!account) return new Map();
    return new Map([[account.id, account]]);
  }, [account]);

  const summary = useMemo(() => {
    if (!accountTransactions) return { income: 0, expense: 0, balance: 0 };
    return accountTransactions.reduce(
      (acc, tx) => {
        if (tx.type === "income") {
          acc.income += tx.amount;
        } else {
          acc.expense += tx.amount;
        }
        acc.balance = acc.income - acc.expense;
        return acc;
      },
      { income: 0, expense: 0, balance: 0 }
    );
  }, [accountTransactions]);

  const currentBalance = useMemo(() => {
    if (!account) return 0;
    return (account.incomeTotal || 0) - (account.expenseTotal || 0);
  }, [account]);

  if (loading) {
    return <p className="text-center text-sm font-medium text-on-surface-variant p-8">Memuat data rekening...</p>;
  }

  if (!account) {
    return (
      <div className="space-y-6 flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-center text-sm text-on-surface-variant bg-surface-container-high p-6 rounded-2xl w-full">Rekening tidak ditemukan.</p>
        <button className="w-full bg-surface-container-highest text-on-surface font-bold py-4 rounded-full transition-colors hover:bg-surface-bright" onClick={() => navigate("/buku")}>
          Kembali ke Buku
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <button 
          onClick={() => navigate("/buku")} 
          className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface hover:bg-surface-bright transition-colors"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
        </button>
        <h3 className="text-lg font-bold tracking-tight text-on-surface">Riwayat {account.name}</h3>
      </div>

      <section className="glass-effect p-8 rounded-[1.5rem] border border-primary/10 shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant mb-1">
                Saldo {account.name}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-on-surface-variant text-lg font-medium">Rp</span>
                <span className="text-3xl font-bold leading-none tracking-tight text-on-surface">
                  {formatRupiah(currentBalance).replace('Rp', '').trim()}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold tracking-widest uppercase bg-primary/20 text-primary px-3 py-1 rounded-full">{account.type}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-surface-container-lowest/40 p-3 rounded-xl">
              <span className="text-[10px] font-bold tracking-widest uppercase text-primary/80 block mb-1">Masuk</span>
              <span className="text-sm font-bold text-primary">{formatRupiah(summary.income)}</span>
            </div>
            <div className="bg-surface-container-lowest/40 p-3 rounded-xl">
              <span className="text-[10px] font-bold tracking-widest uppercase text-tertiary/80 block mb-1">Keluar</span>
              <span className="text-sm font-bold text-tertiary">{formatRupiah(summary.expense)}</span>
            </div>
          </div>
        </div>
        {/* Decorative subtle grid */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{backgroundImage: 'radial-gradient(#dae2fd 1px, transparent 1px)', backgroundSize: '24px 24px'}}></div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-bold tracking-tight text-on-surface">Riwayat Transaksi</h3>
        <TransactionList 
          transactions={accountTransactions} 
          accountMap={accountMap} 
        />
      </section>
    </div>
  );
}

export default AccountHistoryPage;

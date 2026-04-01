import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccounts } from "../hooks/useAccounts";
import { addAccount, removeAccount, renameAccount } from "../services/accountService";
import { addTransaction } from "../services/transactionService";
import { formatRupiah, formatRupiahInput, parseRupiahInput } from "../utils/currency";

const accountTypeOptions = [
  { id: "cash", label: "Tunai" },
  { id: "bank", label: "Bank" },
  { id: "ewallet", label: "E-wallet" },
  { id: "other", label: "Lainnya" }
];

function BooksPage() {
  const navigate = useNavigate();
  const { summary } = useAccounts();
  const [nameInput, setNameInput] = useState("");
  const [typeInput, setTypeInput] = useState("cash");
  const [editingAccountId, setEditingAccountId] = useState("");
  const [editingName, setEditingName] = useState("");
  const [editingIncome, setEditingIncome] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const totals = summary.totals;
  const netBalance = totals.income - totals.expense;

  const sortedAccounts = useMemo(() => {
    return [...summary.accounts].sort((a, b) => {
      const balanceA = a.incomeTotal - a.expenseTotal;
      const balanceB = b.incomeTotal - b.expenseTotal;
      return balanceB - balanceA;
    });
  }, [summary.accounts]);

  const createAccount = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      await addAccount({
        name: nameInput,
        type: typeInput
      });
      setNameInput("");
      setTypeInput("cash");
      setMessage("Rekening baru berhasil ditambahkan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menambah rekening.");
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (account) => {
    setEditingAccountId(account.id);
    setEditingName(account.name);
    setEditingIncome(account.incomeTotal || 0);
    setMessage("");
  };

  const saveRename = async () => {
    if (!editingAccountId) {
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      await renameAccount(editingAccountId, editingName);

      // Hitung selisih income baru vs lama
      const currentAccount = summary.accounts.find(a => a.id === editingAccountId);
      const currentIncome = currentAccount?.incomeTotal || 0;
      const delta = editingIncome - currentIncome;

      if (delta > 0) {
        // Tambah transaksi income untuk selisihnya
        await addTransaction({
          type: "income",
          amount: delta,
          category: "pemasukan",
          description: "Penyesuaian saldo pemasukan",
          date: new Date().toISOString(),
          accountId: editingAccountId,
          accountLabel: currentAccount?.name || editingName,
          inputMethod: "manual"
        });
      } else if (delta < 0) {
        // Kurangi: buat transaksi expense untuk selisihnya
        await addTransaction({
          type: "expense",
          amount: Math.abs(delta),
          category: "lainnya",
          description: "Penyesuaian saldo pemasukan",
          date: new Date().toISOString(),
          accountId: editingAccountId,
          accountLabel: currentAccount?.name || editingName,
          inputMethod: "manual"
        });
      }

      setEditingAccountId("");
      setEditingName("");
      setEditingIncome(0);
      setMessage(
        delta !== 0
          ? `Rekening diperbarui. Saldo disesuaikan ${delta > 0 ? "+" : ""}${formatRupiah(delta)}.`
          : "Nama rekening berhasil diperbarui."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal mengubah rekening.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (accountId) => {
    setSubmitting(true);
    setMessage("");
    try {
      await removeAccount(accountId);
      setMessage("Rekening berhasil dihapus.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menghapus rekening.");
    } finally {
      setSubmitting(false);
    }
  };

  const resolveAccountTypeLabel = (type) => {
    return accountTypeOptions.find((option) => option.id === type)?.label || "Lainnya";
  };

  return (
    <>
      {/* Hero Section: Ringkasan Buku / Rekening */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant">Ringkasan Buku / Rekening</span>
        </div>
        
        <div className="glass-effect p-8 rounded-[1.5rem] border border-primary/10 shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-on-surface-variant text-xl font-medium">Rp</span>
              <span className="text-[3.5rem] font-bold leading-none tracking-tight text-on-surface">
                {formatRupiah(netBalance).replace('Rp', '').trim()}
              </span>
            </div>
            <p className="text-sm text-on-surface-variant mb-8">Total Saldo Seluruh Rekening</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container-lowest/40 p-4 rounded-xl">
                <span className="text-[10px] font-bold tracking-widest uppercase text-primary/80 block mb-1">INCOME</span>
                <span className="text-xl font-bold text-primary">{formatRupiah(totals.income)}</span>
              </div>
              <div className="bg-surface-container-lowest/40 p-4 rounded-xl">
                <span className="text-[10px] font-bold tracking-widest uppercase text-tertiary/80 block mb-1">EXPENSE</span>
                <span className="text-xl font-bold text-tertiary">{formatRupiah(totals.expense)}</span>
              </div>
            </div>
          </div>
          {/* Decorative subtle grid */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{backgroundImage: 'radial-gradient(#4edea3 0.5px, transparent 0.5px)', backgroundSize: '24px 24px'}}></div>
        </div>
      </section>

      {/* Form Section: Tambah Rekening Baru */}
      <section className="bg-surface-container-low p-6 rounded-[1.5rem] space-y-6">
        <h2 className="text-lg font-bold tracking-tight text-on-surface">Tambah Rekening Baru</h2>
        <form onSubmit={createAccount} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant ml-1">Nama Rekening</label>
              <input 
                type="text"
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-on-surface-variant/40" 
                placeholder="Contoh: Tabungan Haji" 
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant ml-1">Tipe Rekening</label>
              <select 
                value={typeInput}
                onChange={(event) => setTypeInput(event.target.value)}
                className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary/40 transition-all appearance-none"
              >
                {accountTypeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={submitting}
            className="w-full bg-primary text-on-primary font-bold py-4 rounded-full flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all shadow-xl shadow-primary/10 disabled:opacity-50"
          >
            <span className="material-symbols-outlined">add</span>
            {submitting ? "Menyimpan..." : "Tambah Rekening"}
          </button>
        </form>
        {message ? <p className="text-sm text-primary text-center mt-2">{message}</p> : null}
      </section>

      {/* List Section: Daftar Buku / Rekening */}
      <section className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold tracking-tight text-on-surface">Daftar Buku / Rekening</h2>
          <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant bg-surface-container-high px-3 py-1 rounded-full">
            {sortedAccounts.length} Accounts
          </span>
        </div>
        
        <div className="grid gap-4">
          {sortedAccounts.map((account, index) => {
            const balance = account.incomeTotal - account.expenseTotal;
            const icon = account.type === 'cash' ? 'payments' : account.type === 'ewallet' ? 'account_balance_wallet' : 'account_balance';
            
            // Generate some coloring variation based on index as per design (primary, secondary, tertiary)
            const colorClass = index % 3 === 0 ? 'primary' : index % 3 === 1 ? 'secondary' : 'tertiary';
            
            return (
              <div key={account.id} className="bg-surface-container-high p-5 rounded-[1.5rem] flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-surface-bright transition-colors group">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 bg-${colorClass}/10 rounded-2xl flex items-center justify-center text-${colorClass} group-hover:scale-110 transition-transform`}>
                    <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>{icon}</span>
                  </div>
                  
                  {editingAccountId === account.id ? (
                    <div>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        className="bg-surface-container-highest border-none rounded-lg px-3 py-1 text-on-surface focus:ring-1 focus:ring-primary w-full sm:w-auto"
                        placeholder="Nama rekening"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div>
                      <h3 className="font-bold text-on-surface">{account.name}</h3>
                      <p className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant">
                        {resolveAccountTypeLabel(account.type)}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-8">
                  <div>
                    <span className="text-[10px] font-medium text-on-surface-variant block mb-0.5">BALANCE</span>
                    <span className="font-bold text-on-surface">{formatRupiah(balance)}</span>
                  </div>
                  
                  {editingAccountId === account.id ? (
                    <div>
                      <span className="text-[10px] font-medium text-primary/60 block mb-0.5">INCOME</span>
                      <div className="flex items-center bg-surface-container-highest rounded-lg px-2 py-1">
                        <span className="text-xs font-bold text-primary">Rp</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatRupiahInput(editingIncome)}
                          onChange={(event) => setEditingIncome(parseRupiahInput(event.target.value))}
                          className="bg-transparent border-none text-primary text-sm font-bold w-28 outline-none px-1"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="hidden sm:block">
                      <span className="text-[10px] font-medium text-primary/60 block mb-0.5">INCOME</span>
                      <span className="font-bold text-primary text-sm">+ {formatRupiah(account.incomeTotal)}</span>
                    </div>
                  )}
                  
                  <div className="hidden sm:block">
                    <span className="text-[10px] font-medium text-tertiary/60 block mb-0.5">EXPENSE</span>
                    <span className="font-bold text-tertiary text-sm">- {formatRupiah(account.expenseTotal)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-auto">
                    {editingAccountId === account.id ? (
                      <>
                         <button onClick={saveRename} disabled={submitting} className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary hover:bg-primary hover:text-on-primary transition-colors">
                          <span className="material-symbols-outlined text-[20px]">check</span>
                        </button>
                        <button onClick={() => { setEditingAccountId(""); setEditingName(""); }} className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-secondary hover:text-on-surface transition-colors">
                          <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => navigate(`/buku/${account.id}`)} className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-secondary hover:text-on-surface transition-colors">
                          <span className="material-symbols-outlined text-[20px]">description</span>
                        </button>
                        <button onClick={() => startEditing(account)} className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-secondary hover:text-on-surface transition-colors">
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button onClick={() => handleDelete(account.id)} disabled={submitting} className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-tertiary/60 hover:bg-tertiary/10 hover:text-tertiary transition-all">
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {sortedAccounts.length === 0 ? (
            <p className="text-center text-sm text-on-surface-variant bg-surface-container-low p-6 rounded-2xl">
              Belum ada rekening. Tambahkan rekening pertamamu dari form di atas.
            </p>
          ) : null}
        </div>
      </section>
    </>
  );
}

export default BooksPage;

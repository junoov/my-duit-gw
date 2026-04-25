import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TransactionDetailModal from "../components/TransactionDetailModal";
import TransactionList from "../components/TransactionList";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useAccounts } from "../hooks/useAccounts";
import { useCategories } from "../hooks/useCategories";
import { useTransactionPreferences } from "../hooks/useTransactionPreferences";
import { useTransactions } from "../hooks/useTransactions";
import { addTransaction, deleteTransaction } from "../services/transactionService";
import { formatRupiah, formatRupiahInput, parseRupiahInput } from "../utils/currency";

function resolveQuickAccountId(accounts, candidateId, fallbackId = "") {
  if (candidateId && accounts.some((account) => account.id === candidateId)) {
    return candidateId;
  }

  if (fallbackId && accounts.some((account) => account.id === fallbackId)) {
    return fallbackId;
  }

  return accounts[0]?.id || "";
}

function resolveQuickCategoryId(allCategories, candidateId, fallbackId = "") {
  if (candidateId && allCategories.some((category) => category.id === candidateId)) {
    return candidateId;
  }

  if (fallbackId && allCategories.some((category) => category.id === fallbackId)) {
    return fallbackId;
  }

  return allCategories[0]?.id || "";
}

function HomePage() {
  const { user } = useAuth();
  const { transactions, summary } = useTransactions();
  const { accounts } = useAccounts();
  const { allCategories } = useCategories();
  const { templates, defaults, markTemplateUsed, rememberTransactionDefaults } = useTransactionPreferences();
  const { showToast } = useToast();
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [quickType, setQuickType] = useState(defaults.lastType || "expense");
  const [quickAmount, setQuickAmount] = useState(0);
  const [quickCategory, setQuickCategory] = useState("");
  const [quickAccountId, setQuickAccountId] = useState("");
  const [quickNote, setQuickNote] = useState("");
  const [savingQuickAdd, setSavingQuickAdd] = useState(false);

  const accountMap = useMemo(() => {
    return new Map(accounts.map((account) => [account.id, account]));
  }, [accounts]);

  const quickAmountLabel = useMemo(() => formatRupiahInput(quickAmount), [quickAmount]);

  const quickAccountLabel = useMemo(() => {
    return accounts.find((account) => account.id === quickAccountId)?.name || "";
  }, [accounts, quickAccountId]);

  useEffect(() => {
    if (accounts.length === 0) {
      setQuickAccountId("");
      return;
    }

    const preferredAccountId = defaults.accountByType?.[quickType];
    setQuickAccountId((currentId) => {
      return resolveQuickAccountId(accounts, preferredAccountId, currentId);
    });
  }, [accounts, defaults.accountByType, quickType]);

  useEffect(() => {
    if (allCategories.length === 0) {
      setQuickCategory("");
      return;
    }

    const preferredCategoryId = defaults.categoryByType?.[quickType];
    setQuickCategory((currentId) => {
      return resolveQuickCategoryId(allCategories, preferredCategoryId, currentId);
    });
  }, [allCategories, defaults.categoryByType, quickType]);

  const quickTemplates = useMemo(() => templates.slice(0, 4), [templates]);

  const applyQuickTemplate = (template) => {
    setQuickType(template.type === "income" ? "income" : "expense");
    setQuickAmount(template.amount || 0);
    setQuickCategory((currentId) => resolveQuickCategoryId(allCategories, template.category, currentId));
    setQuickAccountId((currentId) => resolveQuickAccountId(accounts, template.accountId, currentId));
    setQuickNote(template.description || "");
    markTemplateUsed(template.id);
  };

  const handleQuickAddSubmit = async (event) => {
    event.preventDefault();

    if (!user) {
      showToast({ message: "Login dulu lewat Profil untuk memakai Quick Add.", type: "error" });
      return;
    }

    if (quickAmount <= 0) {
      showToast({ message: "Nominal transaksi tidak boleh nol.", type: "error" });
      return;
    }

    if (!quickCategory) {
      showToast({ message: "Kategori transaksi wajib dipilih.", type: "error" });
      return;
    }

    if (!quickAccountId) {
      showToast({ message: "Silakan pilih rekening terlebih dulu.", type: "error" });
      return;
    }

    setSavingQuickAdd(true);
    try {
      await addTransaction({
        type: quickType,
        amount: quickAmount,
        category: quickCategory,
        description: quickNote,
        date: new Date().toISOString(),
        accountId: quickAccountId,
        accountLabel: quickAccountLabel,
        inputMethod: "manual"
      });

      rememberTransactionDefaults({
        type: quickType,
        category: quickCategory,
        accountId: quickAccountId,
        inputMethod: "manual"
      });

      setQuickAmount(0);
      setQuickNote("");
      showToast({
        message: quickType === "income" ? "Pemasukan cepat berhasil disimpan." : "Pengeluaran cepat berhasil disimpan."
      });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "Quick Add gagal disimpan.",
        type: "error"
      });
    } finally {
      setSavingQuickAdd(false);
    }
  };

  return (
    <>
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant">Saldo Tersedia</span>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">Offline siap</span>
        </div>
        <div className="glass-card p-6 sm:p-8 rounded-3xl relative overflow-hidden transition-transform active:scale-[0.99]">
          <div className="relative z-10">
            <div className="flex items-baseline gap-2">
              <span className="text-on-surface-variant font-medium text-2xl">Rp</span>
              <span className="text-[clamp(2.45rem,10vw,4rem)] font-bold tracking-tight text-on-surface leading-none">
                {formatRupiah(summary.balance).replace("Rp", "").trim()}
              </span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-background/35 px-4 py-3">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-primary/80">Masuk</span>
                <span className="block truncate text-sm font-bold text-primary">{formatRupiah(summary.income)}</span>
              </div>
              <div className="rounded-2xl bg-background/35 px-4 py-3">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-tertiary/80">Keluar</span>
                <span className="block truncate text-sm font-bold text-tertiary">{formatRupiah(summary.expense)}</span>
              </div>
            </div>
          </div>
          <div className="absolute -right-12 top-8 h-32 w-32 rounded-full border-[18px] border-primary/15" />
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        {[
          ["edit_square", "Catat"],
          ["document_scanner", "Scan Struk"],
          ["swap_horiz", "Transfer"]
        ].map(([icon, label]) => (
          <Link
            key={label}
            to="/tambah"
            className="wa-card-soft flex flex-col items-center justify-center gap-2 rounded-2xl px-2 py-4 text-center text-sm font-semibold text-on-surface transition-colors hover:bg-surface-bright active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-primary">{icon}</span>
            <span className="text-xs">{label}</span>
          </Link>
        ))}
      </section>

      <section className="wa-card p-4 sm:p-5 rounded-3xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-on-surface tracking-tight">Quick Add</h2>
            <p className="text-xs text-on-surface-variant">Catat transaksi harian tanpa pindah halaman</p>
          </div>
          <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-base">bolt</span>
          </span>
        </div>

        {quickTemplates.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant">
                Template Cepat
              </span>
              <span className="text-[10px] text-on-surface-variant">Tap untuk isi form</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {quickTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyQuickTemplate(template)}
                  className="min-w-[150px] rounded-2xl wa-field px-3 py-2.5 text-left transition-colors hover:bg-surface-bright"
                >
                  <p className="text-sm font-semibold text-on-surface line-clamp-1">{template.name}</p>
                  <p className="text-[11px] text-on-surface-variant line-clamp-1">
                    {template.type === "income" ? "Pemasukan" : "Pengeluaran"}
                    {template.amount > 0 ? ` - ${formatRupiah(template.amount)}` : ""}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <form className="space-y-3" onSubmit={handleQuickAddSubmit}>
          <div className="bg-surface-container-highest rounded-full p-1 flex gap-1">
            <button
              type="button"
              className={`flex-1 py-2 px-3 rounded-full text-xs font-semibold transition-colors ${
                quickType === "expense" ? "bg-tertiary/18 text-tertiary" : "text-on-surface-variant"
              }`}
              onClick={() => setQuickType("expense")}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              className={`flex-1 py-2 px-3 rounded-full text-xs font-semibold transition-colors ${
                quickType === "income" ? "bg-primary/18 text-primary" : "text-on-surface-variant"
              }`}
              onClick={() => setQuickType("income")}
            >
              Pemasukan
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1.5">
              <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant">Nominal</span>
              <div className="flex items-center wa-field rounded-xl px-3 transition-colors">
                <span className="text-sm font-semibold text-on-surface-variant">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={quickAmountLabel}
                  onChange={(event) => setQuickAmount(parseRupiahInput(event.target.value))}
                  placeholder="0"
                  className="w-full bg-transparent border-none py-2.5 px-2 text-sm font-semibold text-on-surface outline-none"
                  required
                />
              </div>
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant">Kategori</span>
              <select
                value={quickCategory}
                onChange={(event) => setQuickCategory(event.target.value)}
                className="w-full wa-field rounded-xl px-3 py-2.5 text-sm text-on-surface outline-none transition-all"
                required
              >
                <option value="" disabled>
                  Pilih kategori
                </option>
                {allCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1.5">
              <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant">Akun</span>
              <select
                value={quickAccountId}
                onChange={(event) => setQuickAccountId(event.target.value)}
                className="w-full wa-field rounded-xl px-3 py-2.5 text-sm text-on-surface outline-none transition-all"
                required
              >
                <option value="" disabled>
                  Pilih rekening
                </option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant">Catatan (Opsional)</span>
              <input
                type="text"
                value={quickNote}
                onChange={(event) => setQuickNote(event.target.value)}
                className="w-full wa-field rounded-xl px-3 py-2.5 text-sm text-on-surface outline-none transition-all"
                placeholder="Contoh: Makan siang"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={savingQuickAdd || !user || accounts.length === 0 || allCategories.length === 0}
            className="w-full wa-button-primary font-semibold text-sm py-3 rounded-xl transition-all active:scale-[0.99] disabled:opacity-50"
          >
            {savingQuickAdd ? "Menyimpan..." : "Simpan Cepat"}
          </button>

          {!user ? (
            <p className="text-xs text-on-surface-variant">
              Login lewat menu Profil untuk memakai Quick Add dan menyimpan transaksi.
            </p>
          ) : null}

          {user && accounts.length === 0 ? (
            <p className="text-xs text-on-surface-variant">
              Tambahkan rekening dulu di menu Buku agar Quick Add bisa dipakai.
            </p>
          ) : null}
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-on-surface tracking-tight">Semua Transaksi</h2>
        </div>

        <TransactionList
          transactions={transactions}
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

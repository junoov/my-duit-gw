import { useMemo, useState } from "react";
import { useCategories } from "../hooks/useCategories";
import { resolveTransactionAccountLabel } from "../services/accountService";
import { formatRupiah } from "../utils/currency";
import { formatTransactionDateTime } from "../utils/date";

function matchesDatePreset(dateValue, preset) {
  if (preset === "all") {
    return true;
  }

  const transactionDate = new Date(dateValue);
  if (Number.isNaN(transactionDate.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  if (preset === "today") {
    const currentDate = new Date(transactionDate);
    currentDate.setHours(0, 0, 0, 0);
    return currentDate.getTime() === today.getTime();
  }

  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 0;
  if (days === 0) {
    return true;
  }

  const cutoff = new Date(today);
  cutoff.setDate(today.getDate() - (days - 1));
  return transactionDate >= cutoff && transactionDate <= endOfToday;
}

function buildSearchableText(transaction, categoryLabel, accountLabel) {
  const dateLabel = new Date(transaction.date).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  return [
    transaction.description,
    transaction.amount,
    transaction.type === "income" ? "pemasukan" : "pengeluaran",
    transaction.inputMethod === "scan" ? "scan struk" : "input manual",
    categoryLabel,
    accountLabel,
    formatTransactionDateTime(transaction.date),
    dateLabel
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function TransactionList({ transactions, accountMap, onSelectTransaction }) {
  const { getCategoryMeta } = useCategories();
  const [visibleCount, setVisibleCount] = useState(15);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const accountOptions = useMemo(() => {
    const options = new Map();

    transactions.forEach((transaction) => {
      if (!transaction.accountId) {
        return;
      }

      options.set(transaction.accountId, resolveTransactionAccountLabel(transaction, accountMap));
    });

    return Array.from(options.entries()).map(([id, label]) => ({ id, label }));
  }, [transactions, accountMap]);

  const categoryOptions = useMemo(() => {
    const options = new Map();

    transactions.forEach((transaction) => {
      const categoryMeta = getCategoryMeta(transaction.category);
      options.set(transaction.category, categoryMeta.label);
    });

    return Array.from(options.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((left, right) => left.label.localeCompare(right.label, "id-ID"));
  }, [transactions, getCategoryMeta]);

  const activeFilterCount = useMemo(() => {
    return [
      searchQuery.trim().length > 0,
      typeFilter !== "all",
      accountFilter !== "all",
      categoryFilter !== "all",
      methodFilter !== "all",
      dateFilter !== "all"
    ].filter(Boolean).length;
  }, [searchQuery, typeFilter, accountFilter, categoryFilter, methodFilter, dateFilter]);

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return [...transactions]
      .filter((transaction) => {
        const categoryMeta = getCategoryMeta(transaction.category);
        const accountLabel = resolveTransactionAccountLabel(transaction, accountMap);

        if (normalizedQuery) {
          const searchableText = buildSearchableText(transaction, categoryMeta.label, accountLabel);
          if (!searchableText.includes(normalizedQuery)) {
            return false;
          }
        }

        if (typeFilter !== "all" && transaction.type !== typeFilter) {
          return false;
        }

        if (accountFilter !== "all" && transaction.accountId !== accountFilter) {
          return false;
        }

        if (categoryFilter !== "all" && transaction.category !== categoryFilter) {
          return false;
        }

        if (methodFilter !== "all" && transaction.inputMethod !== methodFilter) {
          return false;
        }

        if (!matchesDatePreset(transaction.date, dateFilter)) {
          return false;
        }

        return true;
      })
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
  }, [transactions, searchQuery, typeFilter, accountFilter, categoryFilter, methodFilter, dateFilter, getCategoryMeta, accountMap]);

  const visibleTransactions = useMemo(() => {
    return filteredTransactions.slice(0, visibleCount);
  }, [filteredTransactions, visibleCount]);

  const groupedTransactions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    return visibleTransactions.reduce((groups, transaction) => {
      const transactionDate = new Date(transaction.date);
      transactionDate.setHours(0, 0, 0, 0);

      let dateLabel;
      if (transactionDate.getTime() === today.getTime()) {
        dateLabel = "Hari Ini";
      } else if (transactionDate.getTime() === yesterday.getTime()) {
        dateLabel = "Kemarin";
      } else {
        dateLabel = new Date(transaction.date).toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric"
        });
      }

      if (!groups[dateLabel]) {
        groups[dateLabel] = [];
      }

      groups[dateLabel].push(transaction);
      return groups;
    }, {});
  }, [visibleTransactions]);

  const resetFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setAccountFilter("all");
    setCategoryFilter("all");
    setMethodFilter("all");
    setDateFilter("all");
    setShowFilters(false);
  };

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 wa-card rounded-2xl text-on-surface-variant font-medium text-sm">
        <span className="material-symbols-outlined text-4xl mb-2 opacity-50">receipt_long</span>
        <p>Belum ada transaksi.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant z-10 text-[20px]">
            search
          </span>
          <input
            type="text"
            placeholder="Cari transaksi, kategori, rekening..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full wa-field rounded-2xl pl-12 pr-20 py-3.5 text-sm text-on-surface outline-none transition-all placeholder:text-on-surface-variant/40"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="w-8 h-8 rounded-full text-on-surface-variant hover:text-on-surface"
                aria-label="Hapus pencarian"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setShowFilters((currentValue) => !currentValue)}
              className={`min-w-[42px] h-8 px-2 rounded-full text-xs font-semibold transition-colors ${
                activeFilterCount > 0 || showFilters
                  ? "bg-primary/15 text-primary"
                  : "bg-surface-container-high text-on-surface-variant"
              }`}
            >
              {activeFilterCount > 0 ? `Filter ${activeFilterCount}` : "Filter"}
            </button>
          </div>
        </div>

        {showFilters || activeFilterCount > 0 ? (
          <div className="wa-card rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-on-surface-variant">Persempit histori transaksi</p>
              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Reset Semua
                </button>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant">Tipe</span>
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="w-full wa-field rounded-xl px-3 py-3 text-sm text-on-surface outline-none transition-all"
                >
                  <option value="all">Semua tipe</option>
                  <option value="expense">Pengeluaran</option>
                  <option value="income">Pemasukan</option>
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant">Rekening</span>
                <select
                  value={accountFilter}
                  onChange={(event) => setAccountFilter(event.target.value)}
                  className="w-full wa-field rounded-xl px-3 py-3 text-sm text-on-surface outline-none transition-all"
                >
                  <option value="all">Semua rekening</option>
                  {accountOptions.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant">Kategori</span>
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="w-full wa-field rounded-xl px-3 py-3 text-sm text-on-surface outline-none transition-all"
                >
                  <option value="all">Semua kategori</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant">Metode</span>
                <select
                  value={methodFilter}
                  onChange={(event) => setMethodFilter(event.target.value)}
                  className="w-full wa-field rounded-xl px-3 py-3 text-sm text-on-surface outline-none transition-all"
                >
                  <option value="all">Semua metode</option>
                  <option value="manual">Input manual</option>
                  <option value="scan">Scan struk</option>
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant">Periode</span>
                <select
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value)}
                  className="w-full wa-field rounded-xl px-3 py-3 text-sm text-on-surface outline-none transition-all"
                >
                  <option value="all">Semua waktu</option>
                  <option value="today">Hari ini</option>
                  <option value="7d">7 hari terakhir</option>
                  <option value="30d">30 hari terakhir</option>
                </select>
              </label>
            </div>
          </div>
        ) : null}
      </div>

      {visibleTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 wa-card rounded-2xl text-on-surface-variant font-medium text-sm text-center">
          <p>Transaksi tidak ditemukan untuk filter yang dipilih.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTransactions).map(([dateLabel, groupedItems]) => (
            <div key={dateLabel} className="space-y-3">
              <h4 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant px-2">{dateLabel}</h4>
              <div className="space-y-2">
                {groupedItems.map((transaction) => {
                  const category = getCategoryMeta(transaction.category);
                  const accountLabel = resolveTransactionAccountLabel(transaction, accountMap);
                  const TransactionRow = onSelectTransaction ? "button" : "div";

                  return (
                    <TransactionRow
                      key={transaction.id}
                      type={onSelectTransaction ? "button" : undefined}
                      className={`wa-card-soft p-4 rounded-2xl flex items-center justify-between gap-3 w-full text-left ${
                        onSelectTransaction
                          ? "cursor-pointer hover:bg-surface-container-high transition-colors active:scale-[0.99]"
                          : ""
                      }`}
                      onClick={onSelectTransaction ? () => onSelectTransaction(transaction) : undefined}
                      onKeyDown={
                        onSelectTransaction
                          ? (event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                onSelectTransaction(transaction);
                              }
                            }
                          : undefined
                      }
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            transaction.type === "expense"
                              ? "bg-tertiary/10 text-tertiary"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          <span className="material-symbols-outlined">{category.icon}</span>
                        </div>
                        <div className="flex flex-col items-start text-left min-w-0">
                          <p className="font-bold text-on-surface line-clamp-1 break-words max-w-[140px] min-[390px]:max-w-[180px] sm:max-w-xs">
                            {transaction.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px] font-medium tracking-widest uppercase text-on-surface-variant">
                            <span>{accountLabel}</span>
                            <span className="opacity-50">•</span>
                            <span>{category.label}</span>
                            <span className="opacity-50">•</span>
                            <span>{formatTransactionDateTime(transaction.date)}</span>
                          </div>
                        </div>
                      </div>
                      <p
                        className={`font-bold shrink-0 text-right text-sm sm:text-base ${
                          transaction.type === "expense" ? "text-tertiary" : "text-primary"
                        }`}
                      >
                        {transaction.type === "expense" ? "-" : "+"} {formatRupiah(transaction.amount)}
                      </p>
                    </TransactionRow>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredTransactions.length > visibleCount ? (
            <button
              type="button"
              onClick={() => setVisibleCount((currentValue) => currentValue + 15)}
              className="w-full py-3 mt-4 text-sm font-bold text-on-surface-variant bg-surface-container-highest rounded-xl hover:bg-surface-bright transition-colors"
            >
              Muat Lebih Banyak
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default TransactionList;

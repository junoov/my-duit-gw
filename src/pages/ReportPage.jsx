import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { useCategories } from "../hooks/useCategories";
import { useTransactions } from "../hooks/useTransactions";
import { useAccounts } from "../hooks/useAccounts";
import { formatRupiah } from "../utils/currency";
import { formatWeekday, toLocalDateKey } from "../utils/date";
import TransactionList from "../components/TransactionList";
import TransactionDetailModal from "../components/TransactionDetailModal";
import { deleteTransaction } from "../services/transactionService";
import { useMemo, useState } from "react";

const piePalette = ["#006c4b", "#68fcbf", "#064e3b", "#80bea6", "#45dfa4", "#b0f0d6", "#25312f", "#3d4947"];

function ReportPage() {
  const { transactions, summary, weeklyExpense } = useTransactions();
  const { accounts } = useAccounts();
  const { getCategoryMeta } = useCategories();
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [selectedDayKey, setSelectedDayKey] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); // "YYYY-MM"

  const accountMap = useMemo(() => {
    return new Map(accounts.map((account) => [account.id, account]));
  }, [accounts]);

  const weeklyData = weeklyExpense.map((day) => ({
    name: formatWeekday(day.date),
    pengeluaran: day.value,
    dateKey: day.dateKey,
    fullDate: day.date
  }));

  const selectedDayLabel = useMemo(() => {
    if (!selectedDayKey) return "";
    const found = weeklyData.find((d) => d.dateKey === selectedDayKey);
    if (!found?.fullDate) return selectedDayKey;
    return new Date(found.fullDate).toLocaleDateString("id-ID", {
      weekday: "long", day: "numeric", month: "long"
    });
  }, [selectedDayKey, weeklyData]);

  const monthlyTransactions = useMemo(() => {
    if (!filterMonth) return transactions;
    return transactions.filter(tx => tx.date.startsWith(filterMonth));
  }, [transactions, filterMonth]);

  const monthlySummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    const byCategory = {};

    monthlyTransactions.forEach((tx) => {
      if (tx.type === "income") {
        income += tx.amount;
      } else {
        expense += tx.amount;
        if (!byCategory[tx.category]) {
          byCategory[tx.category] = 0;
        }
        byCategory[tx.category] += tx.amount;
      }
    });

    return { income, expense, balance: income - expense, byCategory };
  }, [monthlyTransactions]);

  const dayTransactions = useMemo(() => {
    if (!selectedDayKey) return [];
    return transactions.filter(
      (tx) => tx.type === "expense" && toLocalDateKey(tx.date) === selectedDayKey
    );
  }, [transactions, selectedDayKey]);

  const categoryData = Object.entries(monthlySummary.byCategory)
    .map(([categoryId, total]) => {
      const categoryMeta = getCategoryMeta(categoryId);
      return {
        id: categoryId,
        name: categoryMeta?.label || categoryId,
        icon: categoryMeta?.icon || "more_horiz",
        value: total
      };
    })
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const selectedCategoryLabel = useMemo(() => {
    if (!selectedCategoryId) return "";
    const found = categoryData.find((c) => c.id === selectedCategoryId);
    return found?.name || selectedCategoryId;
  }, [selectedCategoryId, categoryData]);

  const categoryTransactions = useMemo(() => {
    if (!selectedCategoryId) return [];
    return monthlyTransactions.filter(
      (tx) => tx.type === "expense" && tx.category === selectedCategoryId
    );
  }, [monthlyTransactions, selectedCategoryId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-on-surface">Laporan Mutasi</h2>
        <input
          type="month"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="wa-field rounded-xl px-3 py-2 text-on-surface text-sm font-medium outline-none [color-scheme:dark]"
        />
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant">Sisa Dana Bulan Ini</span>
        </div>
        
        <div className="glass-effect p-6 sm:p-8 rounded-[1.5rem] relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-on-surface-variant text-xl font-medium">Rp</span>
              <span className="text-[clamp(2.35rem,10vw,3.5rem)] font-bold leading-none tracking-tight text-on-surface">
                {formatRupiah(monthlySummary.balance).replace('Rp', '').trim()}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="bg-background/35 p-4 rounded-xl">
                <span className="text-[10px] font-bold tracking-widest uppercase text-primary/80 block mb-1">Pemasukan</span>
                <span className="block truncate text-lg font-bold text-primary">{formatRupiah(monthlySummary.income)}</span>
              </div>
              <div className="bg-background/35 p-4 rounded-xl">
                <span className="text-[10px] font-bold tracking-widest uppercase text-tertiary/80 block mb-1">Pengeluaran</span>
                <span className="block truncate text-lg font-bold text-tertiary">{formatRupiah(monthlySummary.expense)}</span>
              </div>
            </div>
          </div>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-tertiary/10 rounded-full blur-3xl pointer-events-none"></div>
        </div>
      </section>

      {filterMonth === new Date().toISOString().slice(0, 7) && (
        <section className="wa-card p-4 sm:p-6 rounded-[1.5rem] space-y-4">
          <h3 className="text-lg font-bold tracking-tight text-on-surface">Tren Pengeluaran 7 Hari</h3>
          <div className="h-[250px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ left: -18, right: 0, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 8" vertical={false} stroke="rgba(218, 226, 253, 0.1)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#8e99b2" }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                tick={{ fontSize: 11, fill: "#8e99b2" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                formatter={(value) => formatRupiah(Number(value))} 
                contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(52, 211, 153, 0.22)', borderRadius: '12px', color: '#e7f8ef' }}
                itemStyle={{ color: '#34d399', fontWeight: 'bold' }}
              />
              <Bar dataKey="pengeluaran" radius={[6, 6, 0, 0]} cursor="pointer" onClick={(data) => {
                if (data?.dateKey) setSelectedDayKey((prev) => prev === data.dateKey ? null : data.dateKey);
              }}>
                {weeklyData.map((entry, index) => (
                  <Cell
                    key={`${entry.name}-${entry.pengeluaran}`}
                    fill={entry.dateKey === selectedDayKey ? "#34d399" : index === weeklyData.length - 1 ? "#34d399" : "rgba(52, 211, 153, 0.32)"}
                    stroke={entry.dateKey === selectedDayKey ? "#fff" : "none"}
                    strokeWidth={entry.dateKey === selectedDayKey ? 2 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {selectedDayKey && (
          <div className="mt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">calendar_today</span>
                <h4 className="text-sm font-bold text-on-surface">
                  Pengeluaran — {selectedDayLabel}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayKey(null)}
                className="w-7 h-7 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-bright transition-colors"
                aria-label="Tutup"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
            {dayTransactions.length > 0 ? (
              <TransactionList
                transactions={dayTransactions}
                accountMap={accountMap}
                onSelectTransaction={setSelectedTransaction}
              />
            ) : (
              <p className="text-sm text-center text-on-surface-variant bg-surface-container-highest p-4 rounded-xl">Tidak ada pengeluaran di hari ini.</p>
            )}
          </div>
        )}
      </section>
    )}

      <section className="wa-card p-4 sm:p-6 rounded-[1.5rem] space-y-6">
        <h3 className="text-lg font-bold tracking-tight text-on-surface">Komposisi Kategori</h3>
        {categoryData.length > 0 ? (
          <>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4} stroke="none" cursor="pointer"
                    onClick={(data) => {
                      if (data?.id) setSelectedCategoryId((prev) => prev === data.id ? null : data.id);
                    }}
                  >
                    {categoryData.map((item, index) => (
                      <Cell
                        key={item.name}
                        fill={item.id === selectedCategoryId ? piePalette[index % piePalette.length] : piePalette[index % piePalette.length]}
                        stroke={item.id === selectedCategoryId ? "#fff" : "none"}
                        strokeWidth={item.id === selectedCategoryId ? 3 : 0}
                        opacity={selectedCategoryId && item.id !== selectedCategoryId ? 0.35 : 1}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => formatRupiah(Number(value))}
                    contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(52, 211, 153, 0.22)', borderRadius: '12px', color: '#e7f8ef' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 gap-2 mt-4">
              {categoryData.map((item, index) => (
                <div
                  key={item.name}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    item.id === selectedCategoryId
                      ? "bg-primary/15 ring-2 ring-primary/40"
                      : "wa-field hover:bg-surface-bright"
                  }`}
                  onClick={() => setSelectedCategoryId((prev) => prev === item.id ? null : item.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedCategoryId((prev) => prev === item.id ? null : item.id); } }}
                >
                  <div className="flex items-center gap-3">
                    <span className="block w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: piePalette[index % piePalette.length] }} />
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant" style={{fontVariationSettings: "'FILL' 1"}}>{item.icon}</span>
                    <p className="text-sm font-medium text-on-surface">{item.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-bold text-on-surface">{formatRupiah(item.value)}</strong>
                    <span className={`material-symbols-outlined text-[16px] text-on-surface-variant transition-transform ${item.id === selectedCategoryId ? "rotate-180" : ""}`}>expand_more</span>
                  </div>
                </div>
              ))}
            </div>

            {selectedCategoryId && (
              <div className="mt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">category</span>
                    <h4 className="text-sm font-bold text-on-surface">
                      Transaksi — {selectedCategoryLabel}
                    </h4>
                    <span className="text-[10px] font-bold tracking-widest uppercase bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                      {categoryTransactions.length} item
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId(null)}
                    className="w-7 h-7 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-bright transition-colors"
                    aria-label="Tutup"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
                {categoryTransactions.length > 0 ? (
                  <TransactionList
                    transactions={categoryTransactions}
                    accountMap={accountMap}
                    onSelectTransaction={setSelectedTransaction}
                  />
                ) : (
                  <p className="text-sm text-center text-on-surface-variant bg-surface-container-highest p-4 rounded-xl">Tidak ada transaksi di kategori ini.</p>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-center text-on-surface-variant bg-surface-container-highest p-4 rounded-xl">Belum cukup data untuk menampilkan komposisi kategori.</p>
        )}
      </section>

      <section className="wa-card p-4 sm:p-6 rounded-[1.5rem] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-tight text-on-surface">Riwayat Transaksi Bulan Ini</h3>
          <span className="text-[10px] font-bold tracking-widest uppercase bg-surface-container-highest text-on-surface-variant px-3 py-1 rounded-full">
            {monthlyTransactions.length} item
          </span>
        </div>
        <TransactionList 
          transactions={monthlyTransactions}
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
    </div>
  );
}

export default ReportPage;

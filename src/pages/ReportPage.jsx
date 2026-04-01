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
import { formatWeekday } from "../utils/date";
import TransactionList from "../components/TransactionList";
import { useMemo } from "react";

const piePalette = ["#006c4b", "#68fcbf", "#064e3b", "#80bea6", "#45dfa4", "#b0f0d6", "#25312f", "#3d4947"];

function ReportPage() {
  const { transactions, summary, weeklyExpense } = useTransactions();
  const { accounts } = useAccounts();
  const { getCategoryMeta } = useCategories();

  const accountMap = useMemo(() => {
    return new Map(accounts.map((account) => [account.id, account]));
  }, [accounts]);

  const weeklyData = weeklyExpense.map((day) => ({
    name: formatWeekday(day.date),
    pengeluaran: day.value
  }));

  const categoryData = Object.entries(summary.byCategory)
    .map(([categoryId, total]) => {
      const categoryMeta = getCategoryMeta(categoryId);
      return {
        name: categoryMeta?.label || categoryId,
        value: total
      };
    })
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant">Saldo Tersedia</span>
        </div>
        
        <div className="glass-effect p-8 rounded-[1.5rem] border border-primary/10 shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-on-surface-variant text-xl font-medium">Rp</span>
              <span className="text-[3.5rem] font-bold leading-none tracking-tight text-on-surface">
                {formatRupiah(summary.balance).replace('Rp', '').trim()}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="card-glass p-4 rounded-xl">
                <span className="text-[10px] font-bold tracking-widest uppercase text-primary/80 block mb-1">Pemasukan</span>
                <span className="text-lg font-bold text-primary">{formatRupiah(summary.income)}</span>
              </div>
              <div className="card-glass p-4 rounded-xl">
                <span className="text-[10px] font-bold tracking-widest uppercase text-tertiary/80 block mb-1">Pengeluaran</span>
                <span className="text-lg font-bold text-tertiary">{formatRupiah(summary.expense)}</span>
              </div>
            </div>
          </div>
          {/* Decorative fluid shape */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-tertiary/10 rounded-full blur-3xl pointer-events-none"></div>
        </div>
      </section>

      <section className="bg-surface-container-low p-6 rounded-[1.5rem] space-y-4">
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
                contentStyle={{ backgroundColor: '#131b2e', borderColor: 'rgba(78, 222, 163, 0.2)', borderRadius: '12px', color: '#dae2fd' }}
                itemStyle={{ color: '#4edea3', fontWeight: 'bold' }}
              />
              <Bar dataKey="pengeluaran" radius={[6, 6, 0, 0]}>
                {weeklyData.map((entry, index) => (
                  <Cell key={`${entry.name}-${entry.pengeluaran}`} fill={index === weeklyData.length - 1 ? "#4edea3" : "rgba(78, 222, 163, 0.3)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="bg-surface-container-low p-6 rounded-[1.5rem] space-y-6">
        <h3 className="text-lg font-bold tracking-tight text-on-surface">Komposisi Kategori</h3>
        {categoryData.length > 0 ? (
          <>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4} stroke="none">
                    {categoryData.map((item, index) => (
                      <Cell key={item.name} fill={piePalette[index % piePalette.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => formatRupiah(Number(value))}
                    contentStyle={{ backgroundColor: '#131b2e', borderColor: 'rgba(78, 222, 163, 0.2)', borderRadius: '12px', color: '#dae2fd' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 gap-2 mt-4">
              {categoryData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-surface-container-highest">
                  <div className="flex items-center gap-3">
                    <span className="block w-3 h-3 rounded-full" style={{ backgroundColor: piePalette[index % piePalette.length] }} />
                    <p className="text-sm font-medium text-on-surface">{item.name}</p>
                  </div>
                  <strong className="text-sm font-bold text-on-surface">{formatRupiah(item.value)}</strong>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-center text-on-surface-variant bg-surface-container-highest p-4 rounded-xl">Belum cukup data untuk menampilkan komposisi kategori.</p>
        )}
      </section>

      <section className="bg-surface-container-low p-6 rounded-[1.5rem] space-y-4">
        <h3 className="text-lg font-bold tracking-tight text-on-surface">Semua Riwayat Transaksi</h3>
        <TransactionList 
          transactions={transactions} 
          accountMap={accountMap} 
        />
      </section>
    </div>
  );
}

export default ReportPage;

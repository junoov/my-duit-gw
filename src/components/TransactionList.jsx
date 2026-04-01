import { resolveTransactionAccountLabel } from "../services/accountService";
import { formatRupiah } from "../utils/currency";
import { useCategories } from "../hooks/useCategories";
import { useMemo, useState } from "react";

function getLineItemPreview(lineItems) {
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return "";
  }

  const visibleNames = lineItems
    .map((item) => (typeof item?.name === "string" ? item.name.trim() : ""))
    .filter(Boolean)
    .slice(0, 2);

  if (visibleNames.length === 0) {
    return "";
  }

  const remainingCount = Math.max(lineItems.length - visibleNames.length, 0);
  return remainingCount > 0
    ? `${visibleNames.join(", ")} +${remainingCount}`
    : `${visibleNames.join(", ")}`;
}

function TransactionList({ transactions, accountMap, onSelectTransaction }) {
  const { getCategoryMeta } = useCategories();
  const [visibleCount, setVisibleCount] = useState(15);

  const visibleTransactions = useMemo(() => {
    return transactions.slice(0, visibleCount);
  }, [transactions, visibleCount]);

  const groupedTransactions = useMemo(() => {
    return visibleTransactions.reduce((acc, tx) => {
      const dateStr = new Date(tx.date).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(tx);
      return acc;
    }, {});
  }, [visibleTransactions]);

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-surface-container-low rounded-2xl text-on-surface-variant font-medium text-sm">
        <span className="material-symbols-outlined text-4xl mb-2 opacity-50">receipt_long</span>
        <p>Belum ada transaksi.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedTransactions).map(([dateLabel, txs]) => (
        <div key={dateLabel} className="space-y-3">
          <h4 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant px-2">{dateLabel}</h4>
          <div className="space-y-2">
            {txs.map((tx) => {
              const category = getCategoryMeta(tx.category);
              const accountLabel = resolveTransactionAccountLabel(tx, accountMap);

              return (
                <div
                  key={tx.id}
                  className={`bg-surface-container-low p-4 rounded-2xl flex items-center justify-between ${onSelectTransaction ? 'cursor-pointer hover:bg-surface-container-high transition-colors active:scale-[0.99]' : ''}`}
                  onClick={onSelectTransaction ? () => onSelectTransaction(tx) : undefined}
                  role={onSelectTransaction ? "button" : undefined}
                  tabIndex={onSelectTransaction ? 0 : undefined}
                  onKeyDown={
                    onSelectTransaction
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onSelectTransaction(tx);
                          }
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tx.type === 'expense' ? 'bg-tertiary/10 text-tertiary' : 'bg-primary/10 text-primary'}`}>
                      <span className="material-symbols-outlined">{category.icon}</span>
                    </div>
                    <div className="flex flex-col items-start text-left">
                      <p className="font-bold text-on-surface line-clamp-1 break-words max-w-[150px] sm:max-w-xs">{tx.description}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-medium tracking-widest uppercase text-on-surface-variant">
                        <span>{accountLabel}</span>
                      </div>
                    </div>
                  </div>
                  <p className={`font-bold shrink-0 ${tx.type === "expense" ? "text-tertiary" : "text-primary"}`}>
                    {tx.type === "expense" ? "-" : "+"} {formatRupiah(tx.amount)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      
      {transactions.length > visibleCount && (
        <button
          onClick={() => setVisibleCount((prev) => prev + 15)}
          className="w-full py-3 mt-4 text-sm font-bold text-on-surface-variant bg-surface-container-highest rounded-xl hover:bg-surface-bright transition-colors"
        >
          Muat Lebih Banyak
        </button>
      )}
    </div>
  );
}

export default TransactionList;

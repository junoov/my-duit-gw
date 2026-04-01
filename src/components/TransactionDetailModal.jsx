import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { resolveTransactionAccountLabel } from "../services/accountService";
import { formatRupiah } from "../utils/currency";
import { formatTransactionDateTime } from "../utils/date";
import { useCategories } from "../hooks/useCategories";

function TransactionDetailModal({ transaction, accountMap, onClose, onDelete }) {
  const { getCategoryMeta } = useCategories();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (transaction) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
      setConfirmDelete(false);
      setDeleting(false);
    };
  }, [transaction]);

  if (!transaction) {
    return null;
  }

  const category = getCategoryMeta(transaction.category);
  const accountLabel = resolveTransactionAccountLabel(transaction, accountMap);
  const methodLabel = transaction.inputMethod === "scan" ? "Scan struk" : "Input manual";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6 pb-0 sm:pb-6" role="presentation" onClick={onClose}>
      <div className="absolute inset-0 bg-surface-container-low/80 backdrop-blur-sm transition-opacity" />
      
      <section
        className="relative w-full max-w-lg bg-surface-container-high border border-outline-variant/30 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 duration-300"
        role="dialog"
        aria-modal="true"
        aria-label="Detail transaksi"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-outline-variant/30 rounded-full mx-auto my-3 sm:hidden" />
        
        <header className="flex justify-between items-start pt-4 sm:pt-6 px-6 pb-4 border-b border-outline-variant/20">
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant mb-1">Detail Transaksi</p>
            <h3 className="text-xl font-bold text-on-surface">{transaction.description}</h3>
          </div>
          <button type="button" className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-bright transition-colors" onClick={onClose} aria-label="Tutup detail transaksi">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </header>

        <div className="overflow-y-auto px-6 py-6 space-y-8">
          <div className="text-center space-y-1">
            <span className="text-sm font-medium text-on-surface-variant block">Nominal Transaksi</span>
            <p className={`text-4xl font-bold font-headline ${transaction.type === "expense" ? "text-tertiary" : "text-primary"}`}>
              {transaction.type === "expense" ? "-" : "+"}
              {formatRupiah(transaction.amount)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <article className="bg-surface-container-highest p-4 rounded-2xl relative overflow-hidden group">
              <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant block mb-1">Kategori</span>
              <strong className="text-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] opacity-70" style={{fontVariationSettings: "'FILL' 1"}}>{category.icon}</span>
                {category.label}
              </strong>
            </article>
            <article className="bg-surface-container-highest p-4 rounded-2xl relative overflow-hidden">
              <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant block mb-1">Akun</span>
              <strong className="text-sm font-bold text-on-surface">{accountLabel}</strong>
            </article>
            <article className="bg-surface-container-highest p-4 rounded-2xl relative overflow-hidden">
              <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant block mb-1">Waktu</span>
              <strong className="text-sm font-bold text-on-surface">{formatTransactionDateTime(transaction.date)}</strong>
            </article>
            <article className="bg-surface-container-highest p-4 rounded-2xl relative overflow-hidden">
              <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant block mb-1">Metode Input</span>
              <strong className="text-sm font-bold text-on-surface">{methodLabel}</strong>
            </article>
          </div>

          {Array.isArray(transaction.lineItems) && transaction.lineItems.length > 0 && (
            <section className="bg-surface-container-lowest/50 p-5 rounded-3xl border border-outline-variant/20">
              <h4 className="text-sm font-bold tracking-tight text-on-surface mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">receipt_long</span> Rincian Item
              </h4>
              <div className="space-y-3">
                {transaction.lineItems.map((item, index) => (
                  <div className="flex justify-between items-center text-sm" key={`${item.name}-${index}`}>
                    <div className="flex-1">
                      <p className="font-medium text-on-surface">{item.name}</p>
                      <p className="text-[11px] text-on-surface-variant/70 font-medium tracking-wider uppercase">{item.quantity}x</p>
                    </div>
                    <strong className="font-bold text-on-surface text-right">{formatRupiah(item.amount)}</strong>
                  </div>
                ))}
              </div>
            </section>
          )}

          {onDelete && (
            <div className="pt-2">
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-error bg-error/10 hover:bg-error/20 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                  Hapus Transaksi
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-center text-on-surface-variant">Yakin hapus? Saldo akan dikembalikan otomatis.</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                      className="flex-1 py-3.5 rounded-xl text-sm font-bold text-on-surface-variant bg-surface-container-highest hover:bg-surface-bright transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setDeleting(true);
                        try {
                          await onDelete(transaction.id);
                          onClose();
                        } catch (err) {
                          console.error("Gagal hapus transaksi", err);
                          setDeleting(false);
                        }
                      }}
                      disabled={deleting}
                      className="flex-1 py-3.5 rounded-xl text-sm font-bold text-on-primary bg-error hover:bg-error/80 transition-colors"
                    >
                      {deleting ? "Menghapus..." : "Ya, Hapus"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body
  );
}

export default TransactionDetailModal;

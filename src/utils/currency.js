const idFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0
});

export function parseRupiahInput(value) {
  const cleaned = value.replace(/[^\d]/g, "");
  if (!cleaned) {
    return 0;
  }
  return Number(cleaned);
}

export function formatRupiahInput(value) {
  if (!value) {
    return "";
  }
  return idFormatter.format(value);
}

export function formatRupiah(value) {
  const num = Number(value) || 0;
  const prefix = num < 0 ? "-Rp " : "Rp ";
  return `${prefix}${idFormatter.format(Math.abs(num))}`;
}

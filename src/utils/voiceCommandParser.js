const DIGIT_WORDS = {
  nol: 0,
  kosong: 0,
  satu: 1,
  dua: 2,
  tiga: 3,
  empat: 4,
  lima: 5,
  enam: 6,
  tujuh: 7,
  delapan: 8,
  sembilan: 9,
  sepuluh: 10,
  sebelas: 11
};

const AMOUNT_FILLERS = new Set(["rupiah", "rp", "idr", "dan"]);
const COMMAND_STOPWORDS = new Set([
  "tambah",
  "catat",
  "transaksi",
  "pemasukan",
  "pengeluaran",
  "saldo",
  "isi",
  "masuk",
  "masukin",
  "masukkan",
  "keluar",
  "uang",
  "duit",
  "kategori",
  "rekening",
  "bayar",
  "dari",
  "ke",
  "top",
  "up",
  "topup",
  "ribu",
  "rb",
  "juta",
  "jt",
  "k",
  "rp",
  "rupiah",
  "idr"
]);
const CATEGORY_COMMAND_PATTERN = /(?:^|\s)kategori\s+([a-z\s]+)/;
const NOTE_COMMAND_PATTERN = /(?:^|\s)(?:catatan|deskripsi)\s+(.+)$/;

const CATEGORY_KEYWORDS = {
  makanan_minuman: ["makan", "makanan", "minum", "minuman", "bakmi", "nasi", "restoran", "resto", "kopi", "jajan"],
  transportasi: ["transport", "transportasi", "bensin", "bbm", "ojek", "gojek", "grab", "parkir", "tol", "bus", "kereta", "taksi"],
  kebutuhan_harian: ["belanja", "sembako", "harian", "minimarket", "supermarket", "alfamart", "indomaret"],
  tagihan: ["tagihan", "listrik", "air", "internet", "wifi", "pulsa", "bpjs"],
  hiburan: ["hiburan", "film", "bioskop", "game", "musik", "langganan"],
  kesehatan: ["kesehatan", "obat", "dokter", "klinik", "rumah", "sakit"],
  pendidikan: ["edukasi", "pendidikan", "kursus", "sekolah", "kuliah", "buku"],
  lainnya: ["lain", "lainnya"]
};

function normalizeText(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumberWords(tokens) {
  let total = 0;
  let current = 0;
  let hasNumberWord = false;

  for (const token of tokens) {
    if (AMOUNT_FILLERS.has(token)) {
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(DIGIT_WORDS, token)) {
      current += DIGIT_WORDS[token];
      hasNumberWord = true;
      continue;
    }

    if (token === "seratus") {
      current += 100;
      hasNumberWord = true;
      continue;
    }

    if (token === "seribu") {
      total += 1000;
      hasNumberWord = true;
      continue;
    }

    if (token === "belas") {
      current = (current || 1) + 10;
      hasNumberWord = true;
      continue;
    }

    if (token === "puluh") {
      current = (current || 1) * 10;
      hasNumberWord = true;
      continue;
    }

    if (token === "ratus") {
      current = (current || 1) * 100;
      hasNumberWord = true;
      continue;
    }

    if (token === "ribu") {
      total += (current || 1) * 1000;
      current = 0;
      hasNumberWord = true;
      continue;
    }

    if (token === "juta") {
      total += (current || 1) * 1000000;
      current = 0;
      hasNumberWord = true;
      continue;
    }

    return 0;
  }

  if (!hasNumberWord) {
    return 0;
  }

  return total + current;
}

function parseNumericAmount(numberText, unitText) {
  if (!numberText) {
    return 0;
  }

  let normalized = String(numberText).trim().replace(/\s+/g, "");
  if (!normalized) {
    return 0;
  }

  const hasDot = normalized.includes(".");
  const hasComma = normalized.includes(",");

  if (hasDot && hasComma) {
    normalized = normalized.replace(/\./g, "").replace(/,/g, ".");
  } else if (hasComma) {
    normalized = normalized.replace(/,/g, ".");
  } else if (hasDot && !unitText) {
    normalized = normalized.replace(/\./g, "");
  }

  const base = Number(normalized);
  if (!Number.isFinite(base) || base <= 0) {
    return 0;
  }

  const normalizedUnit = String(unitText || "").toLowerCase();
  const multiplier =
    normalizedUnit === "ribu" || normalizedUnit === "rb" || normalizedUnit === "k"
      ? 1000
      : normalizedUnit === "juta" || normalizedUnit === "jt"
        ? 1000000
        : 1;

  return Math.round(base * multiplier);
}

function extractAmountFromText(normalizedText) {
  const numericWithUnitMatch = normalizedText.match(/(?:rp\s*)?([0-9]+(?:[.,][0-9]+)*)(?:\s*(ribu|rb|k|juta|jt))?/);
  if (numericWithUnitMatch?.[1]) {
    const value = parseNumericAmount(numericWithUnitMatch[1], numericWithUnitMatch[2]);
    if (value > 0) {
      return { amount: value, amountText: numericWithUnitMatch[0].trim() };
    }
  }

  const tokens = normalizedText.split(" ").filter(Boolean);
  const candidateRanges = [];

  for (let start = 0; start < tokens.length; start += 1) {
    for (let end = start + 1; end <= Math.min(tokens.length, start + 8); end += 1) {
      const chunk = tokens.slice(start, end);
      const amount = parseNumberWords(chunk);
      if (amount > 0) {
        candidateRanges.push({ start, end, amount, amountText: chunk.join(" ") });
      }
    }
  }

  if (candidateRanges.length === 0) {
    return { amount: 0, amountText: "" };
  }

  candidateRanges.sort((a, b) => {
    const byLength = b.end - b.start - (a.end - a.start);
    if (byLength !== 0) {
      return byLength;
    }
    return b.start - a.start;
  });

  const best = candidateRanges[0];
  return { amount: best.amount, amountText: best.amountText };
}

function detectCategoryId(normalizedText) {
  const categoryCommandMatch = normalizedText.match(CATEGORY_COMMAND_PATTERN);
  const searchText = categoryCommandMatch?.[1]?.trim() || normalizedText;

  if (!searchText) {
    return "";
  }

  for (const [categoryId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => searchText.includes(keyword))) {
      return categoryId;
    }
  }

  return "";
}

function detectDescription(normalizedText, amountText) {
  const noteMatch = normalizedText.match(NOTE_COMMAND_PATTERN);
  if (noteMatch?.[1]) {
    return noteMatch[1].trim();
  }

  if (CATEGORY_COMMAND_PATTERN.test(normalizedText)) {
    return "";
  }

  let description = normalizedText
    .replace(/^(tambah\s+)?(catat\s+)?(transaksi\s+)?(pengeluaran|pemasukan|saldo)\s*/, "")
    .replace(/\bkategori\s+[a-z\s]+$/, "")
    .trim();

  if (amountText) {
    const escapedAmountText = amountText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    const amountPattern = new RegExp(`\\b${escapedAmountText}\\b`, "g");
    description = description.replace(amountPattern, " ").trim();
  }

  if (!description || /^\d+$/.test(description)) {
    return "";
  }

  const filteredTokens = description
    .split(" ")
    .filter(Boolean)
    .filter((token) => !COMMAND_STOPWORDS.has(token) && !/^\d+$/.test(token));

  if (filteredTokens.length === 0) {
    return "";
  }

  return filteredTokens.join(" ").trim();
}

function detectType(normalizedText) {
  if (/\b(pengeluaran|belanja|beli|bayar|keluar)\b/.test(normalizedText)) {
    return "expense";
  }

  if (/\b(pemasukan|saldo|gaji|pendapatan|income|top\s*up|topup|masuk)\b/.test(normalizedText)) {
    return "income";
  }

  return "";
}

export function parseVoiceTransactionCommand(transcript) {
  const normalizedText = normalizeText(transcript);

  if (!normalizedText) {
    return {
      amount: 0,
      amountText: "",
      categoryId: "",
      description: "",
      type: ""
    };
  }

  const type = detectType(normalizedText);
  const { amount, amountText } = extractAmountFromText(normalizedText);
  const categoryId = detectCategoryId(normalizedText);
  const description = detectDescription(normalizedText, amountText);

  return {
    amount,
    amountText,
    categoryId,
    description,
    type
  };
}

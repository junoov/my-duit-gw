const totalKeywords = [
  "total",
  "grand total",
  "total belanja",
  "total bayar",
  "jumlah",
  "jumlah bayar",
  "total rp",
  "tagihan"
];

const ignoredMerchantTerms = [
  "total",
  "subtotal",
  "diskon",
  "kembalian",
  "cash",
  "tunai",
  "debit",
  "kartu",
  "ppn",
  "tax",
  "pajak",
  "struk",
  "receipt",
  "trx",
  "ref",
  "no.",
  "nomor"
];

const lineItemIgnoredTerms = [
  ...totalKeywords,
  "subtotal",
  "diskon",
  "discount",
  "promo",
  "hemat",
  "kembalian",
  "cash",
  "tunai",
  "debit",
  "kredit",
  "card",
  "edc",
  "ppn",
  "tax",
  "pajak",
  "pembayaran",
  "payment",
  "terima kasih",
  "thank you",
  "change",
  "no.",
  "nomor",
  "ref",
  "trx"
];

const categoryKeywordRules = [
  {
    categoryId: "makanan_minuman",
    keywords: [
      "bakmi",
      "mie",
      "nasi",
      "ayam",
      "kopi",
      "cafe",
      "resto",
      "restaurant",
      "warung",
      "teh",
      "susu",
      "roti",
      "pizza",
      "burger",
      "martabak",
      "kfc",
      "mcd",
      "starbucks"
    ]
  },
  {
    categoryId: "kebutuhan_harian",
    keywords: [
      "indomaret",
      "alfamart",
      "supermarket",
      "hypermart",
      "carrefour",
      "transmart",
      "guardian",
      "watsons",
      "shopee",
      "tokopedia",
      "lazada",
      "minimarket",
      "sabun",
      "sampo",
      "detergen",
      "tisu",
      "beras"
    ]
  },
  {
    categoryId: "transportasi",
    keywords: [
      "pertamina",
      "shell",
      "spbu",
      "parkir",
      "tol",
      "gojek",
      "grab",
      "maxim",
      "blue bird",
      "taksi",
      "stasiun",
      "terminal",
      "bensin"
    ]
  },
  {
    categoryId: "tagihan",
    keywords: [
      "pln",
      "listrik",
      "pdam",
      "telkom",
      "wifi",
      "internet",
      "indihome",
      "telkomsel",
      "xl",
      "axis",
      "tri",
      "3 ",
      "by.u",
      "voucher",
      "pulsa",
      "token"
    ]
  },
  {
    categoryId: "hiburan",
    keywords: [
      "cinema",
      "xxi",
      "cgv",
      "netflix",
      "spotify",
      "steam",
      "game",
      "playstation",
      "nintendo"
    ]
  },
  {
    categoryId: "kesehatan",
    keywords: [
      "apotek",
      "kimia farma",
      "klinik",
      "rumah sakit",
      "hospital",
      "dokter",
      "obat",
      "vitamin"
    ]
  },
  {
    categoryId: "pendidikan",
    keywords: [
      "gramedia",
      "kursus",
      "bimbel",
      "udemy",
      "coursera",
      "edx",
      "sekolah",
      "kampus",
      "buku",
      "alat tulis"
    ]
  }
];

function normalizeSpaces(text) {
  return text.replace(/\s+/g, " ").trim();
}

function parseAmountToken(token) {
  const cleaned = token.replace(/[^\d.,]/g, "").replace(/,/g, ".");
  if (!cleaned) {
    return 0;
  }

  const asThousand = cleaned.replace(/\./g, "");
  const integerOnly = asThousand.replace(/\D/g, "");
  const amount = Number(integerOnly);
  if (!Number.isFinite(amount)) {
    return 0;
  }
  return amount;
}

function cleanItemName(rawName) {
  return normalizeSpaces(
    rawName
      .replace(/[|]/g, " ")
      .replace(/\b\d+\s*[xX]\b/g, " ")
      .replace(/\bqty\s*[:.]?\s*\d+\b/gi, " ")
      .replace(/[~`^]/g, " ")
      .replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "")
  );
}

function isLikelyLineItem(line) {
  const lower = line.toLowerCase();
  if (line.length < 4) {
    return false;
  }
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(line)) {
    return false;
  }
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(line)) {
    return false;
  }
  return !lineItemIgnoredTerms.some((term) => lower.includes(term));
}

function extractLineItems(lines) {
  const result = [];
  const seen = new Set();
  const amountPattern = /(?:rp\s*)?(\d{1,3}(?:[.,]\d{3})+|\d{4,9})\s*$/i;

  for (const line of lines) {
    if (!isLikelyLineItem(line)) {
      continue;
    }

    const amountMatch = line.match(amountPattern);
    if (!amountMatch || typeof amountMatch.index !== "number") {
      continue;
    }

    const amount = parseAmountToken(amountMatch[1]);
    if (amount < 100 || amount > 100000000) {
      continue;
    }

    const rawName = line.slice(0, amountMatch.index);
    const name = cleanItemName(rawName);
    if (!name || name.length < 2) {
      continue;
    }

    const digitCount = (name.match(/\d/g) || []).length;
    if (digitCount > Math.max(4, Math.round(name.length * 0.4))) {
      continue;
    }

    const quantityMatch = line.match(/(?:^|\s)(\d+)\s*[xX](?:\s|$)/);
    const quantity = quantityMatch ? Math.max(Number(quantityMatch[1]), 1) : 1;

    const dedupeKey = `${name.toLowerCase()}-${amount}`;
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    result.push({ name, quantity, amount });
  }

  return result.slice(0, 20);
}

function inferSuggestedCategoryId(merchant, lineItems) {
  const merchantText = merchant.toLowerCase();
  const itemText = lineItems.map((item) => item.name.toLowerCase()).join(" ");

  let bestCategoryId = null;
  let bestScore = 0;

  for (const rule of categoryKeywordRules) {
    let score = 0;
    for (const keyword of rule.keywords) {
      if (merchantText.includes(keyword)) {
        score += 3;
      }
      if (itemText.includes(keyword)) {
        score += 2;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCategoryId = rule.categoryId;
    }
  }

  return bestScore > 0 ? bestCategoryId : null;
}

function collectAmountCandidates(lines) {
  const candidates = [];
  const amountPattern = /(?:rp\s*)?(\d{1,3}(?:[.,]\d{3})+|\d{4,9})/gi;

  lines.forEach((line, index) => {
    const lower = line.toLowerCase();
    const lineHasTotalKeyword = totalKeywords.some((keyword) => lower.includes(keyword));
    const matches = Array.from(line.matchAll(amountPattern));

    matches.forEach((match) => {
      const amount = parseAmountToken(match[1]);
      if (amount < 500 || amount > 200000000) {
        return;
      }

      let score = amount;
      if (lineHasTotalKeyword) {
        score += amount * 1.5;
      }
      if (lower.includes("subtotal")) {
        score -= amount * 0.2;
      }
      if (lower.includes("kembalian")) {
        score -= amount * 0.5;
      }
      score -= index * 30;

      candidates.push({ amount, score, line });
    });
  });

  return candidates;
}

function extractMerchant(lines) {
  const sanitized = lines
    .map((line) => normalizeSpaces(line))
    .filter((line) => line.length >= 3 && line.length <= 42);

  for (const line of sanitized.slice(0, 7)) {
    const lower = line.toLowerCase();
    const containsIgnoredWord = ignoredMerchantTerms.some((term) => lower.includes(term));
    const hasManyDigits = (line.match(/\d/g) || []).length > 5;
    if (containsIgnoredWord || hasManyDigits) {
      continue;
    }
    if (/^[a-zA-Z0-9 .,&'-]+$/.test(line)) {
      return line;
    }
  }

  return sanitized[0] || "Merchant tidak terdeteksi";
}

export function parseReceiptText(rawText) {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => normalizeSpaces(line))
    .filter(Boolean);

  const candidates = collectAmountCandidates(lines).sort((a, b) => b.score - a.score);
  const amount = candidates[0]?.amount || 0;
  const merchant = extractMerchant(lines);
  const lineItems = extractLineItems(lines);
  const suggestedCategoryId = inferSuggestedCategoryId(merchant, lineItems);
  const confidenceHint = candidates[0]
    ? `Terdeteksi dari baris: ${candidates[0].line}${lineItems.length ? ` | Rincian ${lineItems.length} item` : ""}`
    : lineItems.length
      ? `Nominal tidak yakin, tetapi rincian ${lineItems.length} item terdeteksi`
      : "Nominal tidak yakin";

  return {
    amount,
    merchant,
    lineItems,
    suggestedCategoryId,
    confidenceHint
  };
}

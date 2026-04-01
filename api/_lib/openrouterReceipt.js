const CATEGORY_IDS = new Set([
  "makanan_minuman",
  "transportasi",
  "kebutuhan_harian",
  "tagihan",
  "hiburan",
  "kesehatan",
  "pendidikan",
  "lainnya"
]);

function normalizeLineItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      const name = typeof item?.name === "string" ? item.name.trim() : "";
      const quantity = Number(item?.quantity ?? item?.qty);
      const amount = Number(item?.amount ?? item?.price ?? item?.total);

      return {
        name,
        quantity: Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity) : 1,
        amount: Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0
      };
    })
    .filter((item) => item.name.length > 0 && item.amount > 0)
    .slice(0, 30);
}

function extractJsonFromText(content) {
  if (typeof content !== "string" || content.trim().length === 0) {
    return null;
  }

  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] || content;

  try {
    return JSON.parse(candidate);
  } catch {
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace < 0 || lastBrace <= firstBrace) {
      return null;
    }

    try {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
    } catch {
      return null;
    }
  }
}

function buildPrompt({ ocrText, fallback }) {
  return [
    "Ekstrak data struk belanja Indonesia ke JSON valid.",
    "Kembalikan HANYA JSON, tanpa markdown/code block.",
    "Schema wajib:",
    "{",
    '  "amount": number,',
    '  "merchant": string,',
    '  "lineItems": [{"name": string, "quantity": number, "amount": number}],',
    '  "suggestedCategoryId": "makanan_minuman|transportasi|kebutuhan_harian|tagihan|hiburan|kesehatan|pendidikan|lainnya",',
    '  "confidenceHint": string',
    "}",
    "Aturan:",
    "- amount adalah grand total yang dibayar customer.",
    "- lineItems berisi item belanja (bukan subtotal, tax, diskon, kembalian).",
    "- quantity default 1 jika tidak ada.",
    "- suggestedCategoryId pilih 1 nilai valid berdasarkan merchant/item.",
    "- Jika ragu, gunakan data fallback.",
    "",
    "Fallback parser lokal:",
    JSON.stringify(fallback, null, 2),
    "",
    "OCR text:",
    ocrText
  ].join("\n");
}

function resolveAppOrigin() {
  if (typeof process.env.APP_ORIGIN === "string" && process.env.APP_ORIGIN.trim().length > 0) {
    return process.env.APP_ORIGIN.trim();
  }

  if (typeof process.env.VERCEL_PROJECT_PRODUCTION_URL === "string" && process.env.VERCEL_PROJECT_PRODUCTION_URL.trim().length > 0) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`;
  }

  if (typeof process.env.VERCEL_URL === "string" && process.env.VERCEL_URL.trim().length > 0) {
    return `https://${process.env.VERCEL_URL.trim()}`;
  }

  return "http://localhost:5173";
}

export function getModelConfig() {
  const primaryModel = process.env.OPENROUTER_MODEL || "openrouter/free";
  const fallbackModels = (process.env.OPENROUTER_MODEL_FALLBACKS || "google/gemma-3-12b-it:free")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && value !== primaryModel);

  return {
    primaryModel,
    fallbackModels
  };
}

export function sanitizeAiReceiptResult(rawResult, fallback = {}) {
  const amount = Number(rawResult?.amount);
  const merchant = typeof rawResult?.merchant === "string" ? rawResult.merchant.trim() : "";
  const lineItems = normalizeLineItems(rawResult?.lineItems);
  const suggestedCategoryId =
    typeof rawResult?.suggestedCategoryId === "string" && CATEGORY_IDS.has(rawResult.suggestedCategoryId.trim())
      ? rawResult.suggestedCategoryId.trim()
      : "";
  const confidenceHint =
    typeof rawResult?.confidenceHint === "string" && rawResult.confidenceHint.trim().length > 0
      ? rawResult.confidenceHint.trim()
      : "";

  const fallbackAmount = Number(fallback?.amount);
  const fallbackMerchant = typeof fallback?.merchant === "string" ? fallback.merchant.trim() : "";
  const fallbackLineItems = normalizeLineItems(fallback?.lineItems);
  const fallbackCategory = typeof fallback?.suggestedCategoryId === "string" ? fallback.suggestedCategoryId.trim() : "";

  return {
    amount: Number.isFinite(amount) && amount > 0 ? Math.round(amount) : Number.isFinite(fallbackAmount) ? Math.round(fallbackAmount) : 0,
    merchant: merchant || fallbackMerchant || "Merchant tidak terdeteksi",
    lineItems: lineItems.length > 0 ? lineItems : fallbackLineItems,
    suggestedCategoryId: suggestedCategoryId || fallbackCategory || "",
    confidenceHint: confidenceHint || "Hasil diperkaya AI OpenRouter"
  };
}

export async function parseReceiptWithOpenRouter({ apiKey, model, ocrText, fallback }) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": resolveAppOrigin(),
      "X-OpenRouter-Title": "Money Notes"
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 900,
      messages: [
        {
          role: "system",
          content:
            "You are a receipt extraction engine. Return strict JSON only. Never add markdown fences. Never include explanations outside JSON."
        },
        {
          role: "user",
          content: buildPrompt({ ocrText, fallback })
        }
      ]
    })
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const message = payload?.error?.message || "OpenRouter request gagal.";
    throw new Error(message);
  }

  const content = payload?.choices?.[0]?.message?.content;
  const parsedJson = extractJsonFromText(content);
  if (!parsedJson) {
    throw new Error("Respons OpenRouter tidak berformat JSON valid.");
  }

  return {
    result: sanitizeAiReceiptResult(parsedJson, fallback),
    responseModel: payload?.model || model
  };
}

import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

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

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const raw = readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^"|"$/g, "");
    process.env[key] = value;
  }
}

function loadEnvironment() {
  const rootDir = process.cwd();
  loadEnvFile(path.join(rootDir, ".env"));
  loadEnvFile(path.join(rootDir, ".env.local"));
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization"
  });
  response.end(JSON.stringify(payload));
}

function parseRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve(JSON.parse(text));
      } catch (error) {
        reject(new Error("Body request bukan JSON yang valid."));
      }
    });
    request.on("error", () => {
      reject(new Error("Gagal membaca body request."));
    });
  });
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

function sanitizeAiReceiptResult(rawResult, fallback = {}) {
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

function buildPrompt({ ocrText, fallback }) {
  return [
    "Kamu adalah mesin ekstraksi struk belanja Indonesia. Tugas kamu:",
    "1. Baca teks OCR struk berikut ini dengan teliti.",
    "2. Ekstrak SEMUA item belanja yang ada di struk tanpa terkecuali.",
    "3. Kembalikan hasilnya dalam format JSON VALID berikut (tanpa markdown, tanpa penjelasan):",
    "",
    "{",
    '  "amount": number (grand total yang dibayar, bukan subtotal),',
    '  "merchant": string (nama toko/restoran),',
    '  "lineItems": [',
    '    {"name": string, "quantity": number, "amount": number (harga per item x quantity)}',
    '  ],',
    '  "suggestedCategoryId": "makanan_minuman|transportasi|kebutuhan_harian|tagihan|hiburan|kesehatan|pendidikan|lainnya",',
    '  "confidenceHint": string (seberapa yakin hasilnya)',
    "}",
    "",
    "ATURAN PENTING:",
    "- lineItems WAJIB berisi SEMUA item yang tercetak di struk, termasuk makanan, minuman, addon, diskon item.",
    "- JANGAN skip item apapun walau kecil (es teh, nasi tambah, pajak item, dll).",
    "- Jika ada diskon pada item tertentu, kurangi dari amount item tersebut.",
    "- quantity default 1 jika tidak tertulis.",
    "- amount di lineItems = harga satuan x quantity (subtotal item tsb).",
    "- JANGAN masukkan baris subtotal, tax, service charge, kembalian, atau no. nota ke lineItems.",
    "- suggestedCategoryId pilih 1 berdasarkan jenis merchant/barang.",
    "- Jika OCR tidak terbaca jelas, gunakan data fallback sebagai acuan.",
    "",
    "Data fallback dari parser lokal (gunakan jika OCR tidak jelas):",
    JSON.stringify(fallback, null, 2),
    "",
    "===== TEKS OCR STRUK =====",
    ocrText
  ].join("\n");
}

async function parseReceiptWithOpenRouter({ apiKey, model, ocrText, fallback }) {
  const appOrigin = process.env.APP_ORIGIN || "http://localhost:5173";
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": appOrigin,
      "X-OpenRouter-Title": "Money Notes"
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content:
            "You are a receipt OCR extraction engine for Indonesian receipts. Return strict JSON only. Extract ALL line items without exception. Never add markdown fences. Never include explanations outside JSON."
        },
        {
          role: "user",
          content: buildPrompt({ ocrText, fallback })
        }
      ]
    })
  });

  const payload = await response.json();
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

loadEnvironment();

const port = Number(process.env.AI_SERVER_PORT || 8787);
const primaryModel = process.env.OPENROUTER_MODEL || "openrouter/free";
const fallbackModels = (process.env.OPENROUTER_MODEL_FALLBACKS || "google/gemma-3-12b-it:free")
  .split(",")
  .map((modelId) => modelId.trim())
  .filter((modelId) => modelId.length > 0 && modelId !== primaryModel);
const apiKey = process.env.OPENROUTER_API_KEY || "";

if (!apiKey) {
  console.warn("[ai-server] OPENROUTER_API_KEY belum diisi. Endpoint AI akan merespons 503.");
}

const server = createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 404, { ok: false, message: "Not found" });
    return;
  }

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization"
    });
    response.end();
    return;
  }

  if (request.method === "GET" && request.url === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      service: "ai-receipt-server",
      provider: "openrouter",
      model: primaryModel,
      fallbackModels,
      ready: Boolean(apiKey)
    });
    return;
  }

  if (request.method === "POST" && request.url === "/api/ai/receipt-parse") {
    if (!apiKey) {
      sendJson(response, 503, {
        ok: false,
        message: "OPENROUTER_API_KEY belum dikonfigurasi di server."
      });
      return;
    }

    try {
      const body = await parseRequestBody(request);
      const ocrText = typeof body?.ocrText === "string" ? body.ocrText.trim() : "";
      const fallback = body?.fallback && typeof body.fallback === "object" ? body.fallback : {};

      if (!ocrText) {
        sendJson(response, 400, {
          ok: false,
          message: "Field ocrText wajib diisi."
        });
        return;
      }

      const modelCandidates = [primaryModel, ...fallbackModels];
      let lastError = null;

      for (const modelId of modelCandidates) {
        try {
          const parsed = await parseReceiptWithOpenRouter({
            apiKey,
            model: modelId,
            ocrText,
            fallback
          });

          sendJson(response, 200, {
            ok: true,
            source: "openrouter",
            model: parsed.responseModel,
            result: parsed.result
          });
          return;
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError || new Error("Semua model OpenRouter gagal.");
    } catch (error) {
      sendJson(response, 502, {
        ok: false,
        message: error instanceof Error ? error.message : "Gagal memproses OCR dengan AI."
      });
      return;
    }
  }

  sendJson(response, 404, { ok: false, message: "Not found" });
});

server.listen(port, () => {
  console.log(`[ai-server] listening on http://localhost:${port}`);
});

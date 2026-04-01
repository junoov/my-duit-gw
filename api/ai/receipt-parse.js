import { getModelConfig, parseReceiptWithOpenRouter } from "../_lib/openrouterReceipt.js";

function sendJson(res, statusCode, payload) {
  res.status(statusCode).json(payload);
}

function readRequestBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string" && req.body.trim().length > 0) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return {};
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, message: "Method tidak diizinkan." });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY || "";
  if (!apiKey) {
    sendJson(res, 503, {
      ok: false,
      message: "OPENROUTER_API_KEY belum dikonfigurasi."
    });
    return;
  }

  const body = readRequestBody(req);
  const ocrText = typeof body?.ocrText === "string" ? body.ocrText.trim() : "";
  const fallback = body?.fallback && typeof body.fallback === "object" ? body.fallback : {};

  if (!ocrText) {
    sendJson(res, 400, {
      ok: false,
      message: "Field ocrText wajib diisi."
    });
    return;
  }

  const { primaryModel, fallbackModels } = getModelConfig();
  const modelCandidates = [primaryModel, ...fallbackModels];
  let lastError = null;

  for (const model of modelCandidates) {
    try {
      const parsed = await parseReceiptWithOpenRouter({
        apiKey,
        model,
        ocrText,
        fallback
      });

      sendJson(res, 200, {
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

  sendJson(res, 502, {
    ok: false,
    message: lastError instanceof Error ? lastError.message : "Semua model OpenRouter gagal."
  });
}

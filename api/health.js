import { getModelConfig } from "./_lib/openrouterReceipt.js";

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, message: "Method tidak diizinkan." });
    return;
  }

  const { primaryModel, fallbackModels } = getModelConfig();

  res.status(200).json({
    ok: true,
    service: "ai-receipt-server",
    provider: "openrouter",
    model: primaryModel,
    fallbackModels,
    ready: Boolean(process.env.OPENROUTER_API_KEY)
  });
}

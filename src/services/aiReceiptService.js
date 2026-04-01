function normalizeLineItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      const name = typeof item?.name === "string" ? item.name.trim() : "";
      const quantity = Number(item?.quantity);
      const amount = Number(item?.amount);

      return {
        name,
        quantity: Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity) : 1,
        amount: Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0
      };
    })
    .filter((item) => item.name.length > 0 && item.amount > 0);
}

export function isAiReceiptEnabled() {
  const configured = import.meta.env.VITE_ENABLE_AI_RECEIPT;
  if (typeof configured === "string") {
    return configured === "true";
  }
  return true;
}

export async function enhanceReceiptWithAI({ ocrText, fallback }) {
  const response = await fetch("/api/ai/receipt-parse", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ocrText,
      fallback
    })
  });

  const payload = await response.json().catch(() => ({ ok: false, message: "Respons AI tidak valid." }));
  if (!response.ok || !payload?.ok) {
    const message = typeof payload?.message === "string" ? payload.message : "AI receipt parser tidak tersedia.";
    throw new Error(message);
  }

  const result = payload.result || {};
  return {
    amount: Number.isFinite(Number(result.amount)) ? Math.round(Number(result.amount)) : 0,
    merchant: typeof result.merchant === "string" ? result.merchant.trim() : "",
    lineItems: normalizeLineItems(result.lineItems),
    suggestedCategoryId: typeof result.suggestedCategoryId === "string" ? result.suggestedCategoryId.trim() : "",
    confidenceHint: typeof result.confidenceHint === "string" ? result.confidenceHint.trim() : ""
  };
}

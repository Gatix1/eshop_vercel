const paypalBaseUrl = process.env.PAYPAL_ENVIRONMENT === "production"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

function paypalCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");
  return { clientId, clientSecret };
}

async function paypalRequest<T>(path: string, options: RequestInit = {}) {
  const { clientId, clientSecret } = paypalCredentials();
  const token = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${paypalBaseUrl}${path}`, {
    ...options,
    headers: { Authorization: `Basic ${token}`, "Content-Type": "application/json", ...(options.headers ?? {}) },
    cache: "no-store",
  });
  const body = await response.json() as T & { message?: string; details?: unknown[] };
  if (!response.ok) throw new Error(body.message ?? `PayPal request failed with status ${response.status}`);
  return body;
}

export function paypalCurrency() {
  return "EUR" as const;
}

export function paypalAmount(totalMdl: number) {
  const rate = Number(process.env.PAYPAL_EUR_TO_MDL_RATE);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("PAYPAL_EUR_TO_MDL_RATE must be configured with a positive EUR-to-MDL rate.");
  return (totalMdl / rate).toFixed(2);
}

export async function createPaypalOrder({ orderId, totalMdl, origin }: { orderId: string; totalMdl: number; origin: string }) {
  return paypalRequest<{ id: string; links?: { href: string; rel: string }[] }>("/v2/checkout/orders", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{ reference_id: orderId, amount: { currency_code: "EUR", value: paypalAmount(totalMdl) } }],
      application_context: {
        brand_name: "eShop",
        user_action: "PAY_NOW",
        return_url: `${origin}/checkout/paypal/return?order=${encodeURIComponent(orderId)}`,
        cancel_url: `${origin}/checkout/paypal/cancel?order=${encodeURIComponent(orderId)}`,
      },
    }),
  });
}

export async function capturePaypalOrder(paypalOrderId: string) {
  return paypalRequest<{ id: string; status: string; purchase_units?: { payments?: { captures?: { id: string; status: string }[] } }[] }>(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, { method: "POST", headers: { Prefer: "return=representation" }, body: "{}" });
}

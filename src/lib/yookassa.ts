import { randomUUID } from "node:crypto";

export type OnlinePaymentMethod = "card" | "sbp";

type YooKassaPayment = {
  id: string;
  status: "pending" | "waiting_for_capture" | "succeeded" | "canceled";
  amount: { value: string; currency: string };
  confirmation?: { type: string; confirmation_url?: string };
  metadata?: Record<string, string>;
};

function config() {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  return { shopId, secretKey, appUrl };
}

export function onlinePaymentsEnabled() {
  const { shopId, secretKey, appUrl } = config();
  return Boolean(shopId && secretKey && appUrl);
}

export function enabledOnlineMethods(): OnlinePaymentMethod[] {
  return onlinePaymentsEnabled() ? ["card", "sbp"] : [];
}

function credentialsHeader(shopId: string, secretKey: string) {
  return `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`;
}

async function yookassaRequest<T>(path: string, init: RequestInit = {}, idempotenceKey?: string): Promise<T> {
  const { shopId, secretKey } = config();
  if (!shopId || !secretKey) throw new Error("YOOKASSA_NOT_CONFIGURED");

  const response = await fetch(`https://api.yookassa.ru/v3${path}`, {
    ...init,
    headers: {
      Authorization: credentialsHeader(shopId, secretKey),
      "Content-Type": "application/json",
      ...(idempotenceKey ? { "Idempotence-Key": idempotenceKey } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`YOOKASSA_${response.status}`);
  return response.json() as Promise<T>;
}

export async function createOnlinePayment(input: {
  orderId: number;
  orderNumber: string;
  amount: number;
  email: string;
  method: OnlinePaymentMethod;
}) {
  const { appUrl } = config();
  if (!appUrl) throw new Error("YOOKASSA_NOT_CONFIGURED");

  const payment = await yookassaRequest<YooKassaPayment>(
    "/payments",
    {
      method: "POST",
      body: JSON.stringify({
        amount: { value: input.amount.toFixed(2), currency: "RUB" },
        capture: true,
        confirmation: { type: "redirect", return_url: new URL("/account?tab=orders", appUrl).toString() },
        description: `Заказ ${input.orderNumber}`,
        receipt: {
          customer: { email: input.email },
          items: [{ description: `Заказ ${input.orderNumber}`, quantity: "1.00", amount: { value: input.amount.toFixed(2), currency: "RUB" }, vat_code: 1 }],
        },
        payment_method_data: { type: input.method === "sbp" ? "sbp" : "bank_card" },
        metadata: { orderId: String(input.orderId), orderNumber: input.orderNumber },
      }),
    },
    randomUUID()
  );

  const confirmationUrl = payment.confirmation?.confirmation_url;
  if (!confirmationUrl) throw new Error("YOOKASSA_NO_CONFIRMATION_URL");
  return { paymentId: payment.id, confirmationUrl };
}

export async function getOnlinePayment(paymentId: string) {
  return yookassaRequest<YooKassaPayment>(`/payments/${encodeURIComponent(paymentId)}`);
}

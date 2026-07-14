import { customAlphabet } from "nanoid";

export function formatPrice(value: string | number) {
  const num = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

const orderSuffix = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 10);

export function generateOrderNumber() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  return `GS-${y}${m}${d}-${orderSuffix()}`;
}

export const typeLabels: Record<string, string> = {
  gasoline: "Бензиновый",
  diesel: "Дизельный",
  gas: "Газовый",
  inverter: "Инверторный",
};

export const startTypeLabels: Record<string, string> = {
  manual: "Ручной запуск",
  electric: "Электростартер",
  avr: "АВР",
};

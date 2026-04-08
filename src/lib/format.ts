export function formatPrice(amount: number, locale: string = "vi-VN"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date, locale: string = "vi-VN"): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

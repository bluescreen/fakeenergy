// Number / currency formatting helpers shared across the site.

export function formatEuro(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatKwh(kwh: number): string {
  return new Intl.NumberFormat("de-DE").format(kwh) + " kWh";
}

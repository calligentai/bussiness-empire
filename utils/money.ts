export const formatEur = (cents: number) =>
  new Intl.NumberFormat("en-NL", { style: "currency", currency: "EUR" }).format(cents / 100);

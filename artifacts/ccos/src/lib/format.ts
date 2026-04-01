export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(dateString));
}

export function getUtilizationColor(utilization: number) {
  if (utilization > 0.4) return "bg-red-500";
  if (utilization >= 0.3) return "bg-yellow-500";
  return "bg-green-500";
}

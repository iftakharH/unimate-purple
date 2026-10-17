/** Formatting helpers — keep number/date presentation consistent everywhere. */

export function formatBdt(amount: number): string {
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
  return `৳${formatted}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Initials for avatars / logos. */
export function initialsOf(name: string, fallback = "U"): string {
  const words = name.trim().split(/[\s@._-]+/).filter(Boolean);
  const initials = words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return initials || fallback;
}

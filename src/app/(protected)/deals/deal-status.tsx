import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  requested: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  accepted: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  paid: "border-primary/40 bg-primary/10 text-primary",
  handed_over:
    "border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  completed: "border-success/40 bg-success/10 text-success",
  rejected: "border-destructive/40 bg-destructive/10 text-destructive",
  cancelled: "border-border bg-muted text-muted-foreground",
};

export function DealStatusChip({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        STYLES[status] ?? "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

const CAMPUS_STEPS = ["requested", "accepted", "completed"] as const;
const IN_APP_STEPS = ["requested", "accepted", "paid", "handed_over", "completed"] as const;

/** The timeline path depends on how the deal pays — campuses skip paid/handover. */
export function dealSteps(paymentMode: string): readonly string[] {
  return paymentMode === "pay_in_app" ? IN_APP_STEPS : CAMPUS_STEPS;
}

export const TERMINAL_STATUSES = ["rejected", "cancelled"] as const;

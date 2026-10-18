"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import {
  initialActionState,
  type ActionState,
} from "@/lib/validation/helpers";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Two-step destructive action: the button reveals an inline confirmation
 * (with optional explanation) before submitting the bound Server Action.
 * Used across the admin panel so nothing destructive fires on a single tap.
 */
export function ConfirmAction({
  action,
  fields,
  label,
  confirmLabel,
  pendingText,
  description,
  icon,
  variant = "destructive",
  className,
}: {
  action: Action;
  fields: Record<string, string>;
  label: string;
  confirmLabel: string;
  pendingText: string;
  description?: string;
  icon?: React.ReactNode;
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(action, initialActionState);

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);

  if (state.status === "success" && state.message) {
    return (
      <p role="status" className="text-sm text-success">
        {state.message}
      </p>
    );
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant={variant}
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
      >
        {icon}
        {label}
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/40 p-2"
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {description ? (
        <p className="w-full text-xs text-muted-foreground">{description}</p>
      ) : null}
      <SubmitButton
        variant={variant === "ghost" ? "outline" : variant}
        size="sm"
        className="w-auto"
        pendingText={pendingText}
      >
        {confirmLabel}
      </SubmitButton>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  );
}

"use client";

import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SubmitButtonProps = ComponentProps<typeof Button> & {
  pendingText?: string;
};

/**
 * Submit button wired to the enclosing <form> via `useFormStatus` — disabled
 * and showing a spinner while the Server Action is in flight.
 */
export function SubmitButton({
  children,
  pendingText = "Working…",
  className,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      aria-busy={pending}
      disabled={pending || props.disabled}
      className={cn(className)}
      {...props}
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin" aria-hidden />
          {pendingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

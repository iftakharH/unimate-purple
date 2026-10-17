import type { ZodError } from "zod";

/**
 * Shared shape for every form driven by `useActionState` + Server Actions.
 */
export type ActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialActionState: ActionState = { status: "idle" };

/** Turn a ZodError into `{ field: [messages] }` without version-specific APIs. */
export function fieldErrorsOf(error: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export function errorState(
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionState {
  return { status: "error", message, fieldErrors };
}

export function successState(message?: string): ActionState {
  return { status: "success", message };
}

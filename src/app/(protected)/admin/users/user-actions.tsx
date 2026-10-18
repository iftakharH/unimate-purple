"use client";

import { Ban, ShieldCheck, Trash2 } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { ConfirmAction } from "@/components/confirm-action";
import { SubmitButton } from "@/components/submit-button";
import { initialActionState } from "@/lib/validation/helpers";
import { cn } from "@/lib/utils";
import { deleteUserAction, toggleBanAction, updateUserRoleAction } from "./actions";

const selectClasses =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none transition-[color,box-shadow] duration-base focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50 dark:bg-input/30";

/**
 * Per-member controls: role change, ban/unban, delete. Super Admin accounts
 * are untouchable here (the database trigger agrees); non-super admins can
 * neither touch admins nor grant the admin role.
 */
export function UserActions({
  userId,
  email,
  role,
  isBanned,
  viewerIsSuper,
  targetIsSuper,
}: {
  userId: string;
  email: string;
  role: string;
  isBanned: boolean;
  viewerIsSuper: boolean;
  targetIsSuper: boolean;
}) {
  const [roleState, roleAction] = useActionState(updateUserRoleAction, initialActionState);

  useEffect(() => {
    if (roleState.status === "success" && roleState.message) {
      toast.success(roleState.message);
    }
    if (roleState.status === "error" && roleState.message) {
      toast.error(roleState.message);
    }
  }, [roleState]);

  const lockedRole =
    targetIsSuper || (!viewerIsSuper && role === "admin");
  const canTouch = !targetIsSuper && (viewerIsSuper || role !== "admin");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={roleAction} className="flex items-center gap-2">
        <input type="hidden" name="user_id" value={userId} />
        <select
          name="role"
          defaultValue={role}
          disabled={lockedRole}
          aria-label={`Role for ${email}`}
          className={cn(selectClasses, "w-28")}
        >
          <option value="buyer">buyer</option>
          <option value="seller">seller</option>
          {viewerIsSuper ? <option value="admin">admin</option> : null}
        </select>
        <SubmitButton
          variant="outline"
          size="sm"
          className="w-auto"
          pendingText="Saving…"
          disabled={lockedRole}
        >
          <ShieldCheck aria-hidden /> Role
        </SubmitButton>
      </form>

      {canTouch ? (
        <>
          <ConfirmAction
            action={toggleBanAction}
            fields={{ user_id: userId, next: isBanned ? "unban" : "ban" }}
            label={isBanned ? "Unban" : "Ban"}
            confirmLabel={isBanned ? "Yes, unban" : "Yes, ban"}
            pendingText={isBanned ? "Unbanning…" : "Banning…"}
            description={
              isBanned
                ? "They will be able to trade again."
                : "They keep their account and can sign in, but cannot trade."
            }
            variant={isBanned ? "outline" : "secondary"}
            icon={<Ban aria-hidden />}
          />
          <ConfirmAction
            action={deleteUserAction}
            fields={{ user_id: userId }}
            label="Delete"
            confirmLabel="Delete permanently"
            pendingText="Deleting…"
            description={`Deletes ${email} and everything they own — listings, store, messages, deals. This cannot be undone.`}
            icon={<Trash2 aria-hidden />}
          />
        </>
      ) : (
        <span className="text-xs text-muted-foreground">
          {targetIsSuper ? "Super Admin — locked" : "Admin — Super Admin only"}
        </span>
      )}
    </div>
  );
}

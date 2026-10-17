"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { initialActionState } from "@/lib/validation/helpers";
import { createUserAction, inviteUserAction } from "../actions";

const selectClasses =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none transition-[color,box-shadow] duration-base focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50 dark:bg-input/30";

function StatusMessage({ state }: { state: { status: string; message?: string } }) {
  if (!state.message) return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={
        state.status === "error"
          ? "text-sm text-destructive"
          : "text-sm text-muted-foreground"
      }
    >
      {state.message}
    </p>
  );
}

export function AdminUserForm({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [inviteState, inviteAction] = useActionState(inviteUserAction, initialActionState);
  const [createState, createAction] = useActionState(createUserAction, initialActionState);
  const inviteErrors = inviteState.fieldErrors ?? {};
  const createErrors = createState.fieldErrors ?? {};

  return (
    <Tabs defaultValue="invite">
      <TabsList>
        <TabsTrigger value="invite">Invite by email</TabsTrigger>
        <TabsTrigger value="create">Create with password</TabsTrigger>
      </TabsList>

      <TabsContent value="invite" className="pt-4">
        <form action={inviteAction} className="max-w-md space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              name="email"
              type="email"
              placeholder="any email address"
              aria-invalid={Boolean(inviteErrors.email)}
              required
            />
            {inviteErrors.email && (
              <p role="alert" className="text-sm text-destructive">
                {inviteErrors.email[0]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <select id="invite-role" name="role" defaultValue="buyer" className={selectClasses}>
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
              {isSuperAdmin ? <option value="admin">Admin</option> : null}
            </select>
            <p className="text-xs text-muted-foreground">
              Sellers get a store page automatically when they join.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-note">Note (optional)</Label>
            <Input id="invite-note" name="note" placeholder="Why is this person joining?" />
          </div>

          <StatusMessage state={inviteState} />
          <SubmitButton className="w-auto" pendingText="Sending invite…">
            Send invite email
          </SubmitButton>
        </form>
      </TabsContent>

      <TabsContent value="create" className="pt-4">
        <form action={createAction} className="max-w-md space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="create-full-name">Full name</Label>
            <Input
              id="create-full-name"
              name="full_name"
              autoComplete="off"
              aria-invalid={Boolean(createErrors.full_name)}
              required
            />
            {createErrors.full_name && (
              <p role="alert" className="text-sm text-destructive">
                {createErrors.full_name[0]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-email">Email</Label>
            <Input
              id="create-email"
              name="email"
              type="email"
              autoComplete="off"
              aria-invalid={Boolean(createErrors.email)}
              required
            />
            {createErrors.email && (
              <p role="alert" className="text-sm text-destructive">
                {createErrors.email[0]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-role">Role</Label>
            <select id="create-role" name="role" defaultValue="buyer" className={selectClasses}>
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
              {isSuperAdmin ? <option value="admin">Admin</option> : null}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-password">Temporary password</Label>
            <Input
              id="create-password"
              name="password"
              type="text"
              autoComplete="off"
              aria-invalid={Boolean(createErrors.password)}
              aria-describedby={createErrors.password ? undefined : "create-password-hint"}
              required
            />
            {createErrors.password ? (
              <p role="alert" className="text-sm text-destructive">
                {createErrors.password[0]}
              </p>
            ) : (
              <p id="create-password-hint" className="text-xs text-muted-foreground">
                8+ characters with at least one letter and one number. The member
                must change it at first sign-in.
              </p>
            )}
          </div>

          <StatusMessage state={createState} />
          <SubmitButton className="w-auto" pendingText="Creating…">
            Create account
          </SubmitButton>
        </form>
      </TabsContent>
    </Tabs>
  );
}

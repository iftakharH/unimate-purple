import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, MessageCircle, Store, XCircle } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAuthContext } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { SellerRequestForm } from "./seller-request-form";

export const metadata: Metadata = { title: "Become a seller" };

export default async function BecomeSellerPage() {
  const { supabase, user, profile } = await getAuthContext();
  if (!user) redirect("/login?next=/become-seller");
  if (profile?.role === "seller") redirect("/seller/store?welcome=1");

  const { data: request } = await supabase
    .from("seller_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const isPending = request?.status === "pending";
  const wasRejected = request?.status === "rejected";

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Become a seller</h1>
        <p className="text-sm text-muted-foreground">
          Get your own campus store page — an admin reviews every request.
        </p>
      </div>

      {isPending && request ? (
        <Card className="elev-2">
          <CardHeader className="items-center text-center">
            <span className="relative grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
              <Store className="size-6" aria-hidden />
              <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full border bg-card">
                <Clock className="size-3 text-muted-foreground" aria-hidden />
              </span>
            </span>
            <CardTitle className="text-xl">Under review</CardTitle>
            <CardDescription className="text-balance">
              Your request for <span className="text-foreground">{request.business_name}</span>{" "}
              was submitted on {formatDate(request.created_at)}. We&apos;ll notify you as
              soon as an admin decides.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-success" aria-hidden />
                Submitted
              </li>
              <li aria-hidden className="h-px w-8 bg-border" />
              <li className="flex items-center gap-1.5 font-medium text-foreground">
                <Clock className="size-3.5" aria-hidden />
                Review
              </li>
              <li aria-hidden className="h-px w-8 bg-border" />
              <li className="flex items-center gap-1.5">
                <Store className="size-3.5" aria-hidden />
                Store live
              </li>
            </ol>
          </CardContent>
        </Card>
      ) : (
        <>
          {wasRejected && request && (
            <Alert variant="destructive">
              <XCircle aria-hidden />
              <span>
                Your previous request was not approved.
                {request.admin_note ? ` Admin note: “${request.admin_note}”` : ""} You
                can apply again with updated details.
              </span>
            </Alert>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Store, text: "Your own store page & shareable link" },
              { icon: MessageCircle, text: "Chat with buyers in real time" },
              { icon: CheckCircle2, text: "Deals tracker with status timeline" },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="elev-1 flex items-start gap-2.5 rounded-2xl border bg-card p-3.5"
              >
                <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>

          <SellerRequestForm defaultValues={wasRejected && request ? {
            business_name: request.business_name,
            description: request.description ?? "",
            contact_phone: request.contact_phone ?? "",
          } : undefined} />
        </>
      )}

      {!isPending && (
        <p className="text-center text-xs text-muted-foreground">
          <Badge variant="outline" className="mr-1.5">
            Tip
          </Badge>
          Sellers keep their buyer abilities — you can still shop as usual.
        </p>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import { Inbox, Store } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReviewRequest } from "./review-request";

export const metadata: Metadata = { title: "Seller requests — Admin" };

export default async function AdminRequestsPage() {
  const { supabase } = await requireAdmin();

  const { data: requests } = await supabase
    .from("seller_requests")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name");

  const admin = createAdminClient();
  const { data: authData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? ""]));
  const emailById = new Map((authData?.users ?? []).map((u) => [u.id, u.email ?? ""]));

  const pending = (requests ?? []).filter((r) => r.status === "pending");
  const history = (requests ?? []).filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
      <Card className="elev-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Inbox className="size-4" aria-hidden />
            Pending queue <span className="text-muted-foreground">({pending.length})</span>
          </CardTitle>
          <CardDescription>
            Approving creates the store page and switches the member to seller in one step.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pending.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No pending requests — nice and tidy.
            </p>
          ) : (
            pending.map((request) => (
              <ReviewRequest
                key={request.id}
                requestId={request.id}
                businessName={request.business_name}
                description={request.description}
                contactPhone={request.contact_phone}
                applicantName={nameById.get(request.user_id) ?? "Member"}
                applicantEmail={emailById.get(request.user_id) ?? ""}
                submitted={formatDate(request.created_at)}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card className="elev-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Store className="size-4" aria-hidden />
            History <span className="text-muted-foreground">({history.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {history.map((request) => (
              <li
                key={request.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{request.business_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {nameById.get(request.user_id) ?? "Member"} ·{" "}
                    {emailById.get(request.user_id) ?? ""} · {formatDate(request.created_at)}
                  </p>
                </div>
                <Badge
                  variant={request.status === "approved" ? "secondary" : "destructive"}
                  className="capitalize"
                >
                  {request.status}
                </Badge>
              </li>
            ))}
            {history.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                Decisions will appear here.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import { ShieldX } from "lucide-react";
import { redirect } from "next/navigation";

import { signOutAction } from "@/app/(auth)/actions";
import { getAuthContext } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Account suspended" };

export default async function BannedPage() {
  const { user } = await getAuthContext();
  if (!user) {
    redirect("/login");
  }

  return (
    <Card className="elev-2">
      <CardHeader className="items-center text-center">
        <ShieldX className="size-10 text-destructive" aria-hidden />
        <CardTitle className="text-xl">Account suspended</CardTitle>
        <CardDescription className="text-balance">
          This account can&apos;t use Unimate right now. If you believe this is a
          mistake, contact a platform admin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={signOutAction}>
          <Button type="submit" variant="outline" className="w-full">
            Sign out
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

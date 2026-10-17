import { redirect } from "next/navigation";

import { SellerTabs } from "@/components/seller-tabs";
import { getAuthContext } from "@/lib/auth";

/** Only sellers (and admins, for support) may enter the seller area. */
export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getAuthContext();
  if (!user) redirect("/login");
  if (profile?.role !== "seller" && profile?.role !== "admin") {
    redirect("/become-seller");
  }
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <SellerTabs />
      {children}
    </div>
  );
}

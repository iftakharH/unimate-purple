import { AdminTabs } from "@/components/admin-tabs";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
          <p className="text-sm text-muted-foreground">
            Platform management. Every action here is recorded in the audit log.
          </p>
        </div>
        <AdminTabs />
      </div>
      {children}
    </div>
  );
}

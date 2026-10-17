import type { Metadata } from "next";

import { SettingsTabs } from "@/components/settings-tabs";
import { requireUser } from "@/lib/auth";
import { AvatarUploader } from "./avatar-uploader";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user, profile } = await requireUser();

  return (
    <div className="space-y-6">
      <SettingsTabs />

      <section aria-labelledby="avatar-heading" className="space-y-3">
        <h2 id="avatar-heading" className="text-sm font-medium text-muted-foreground">
          Photo
        </h2>
        <AvatarUploader
          userId={user.id}
          fullName={profile?.full_name ?? ""}
          email={user.email ?? ""}
          avatarUrl={profile?.avatar_url ?? null}
        />
      </section>

      <section aria-labelledby="profile-heading" className="space-y-3">
        <h2 id="profile-heading" className="text-sm font-medium text-muted-foreground">
          Public profile
        </h2>
        <ProfileForm
          defaultValues={{
            full_name: profile?.full_name ?? "",
            phone: profile?.phone ?? "",
            bio: profile?.bio ?? "",
          }}
          email={user.email ?? ""}
          role={profile?.role ?? "buyer"}
        />
      </section>
    </div>
  );
}

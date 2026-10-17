"use client";

import { LayoutDashboard, LogOut, Settings, Shield } from "lucide-react";
import Link from "next/link";

import { signOutAction } from "@/app/(auth)/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initialsOf(name: string, email: string): string {
  const source = name.trim() || email;
  const words = source.split(/[\s@._-]+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserMenu({
  fullName,
  email,
  role,
  avatarUrl,
}: {
  fullName: string;
  email: string;
  role: string;
  avatarUrl: string | null;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="Account menu"
          />
        }
      >
        <Avatar size="sm">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
          <AvatarFallback>{initialsOf(fullName, email)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel>
          <span className="block truncate font-medium text-foreground">
            {fullName || "Unimate member"}
          </span>
          <span className="block truncate font-normal">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/settings" />}>
          <Settings aria-hidden /> Settings
        </DropdownMenuItem>
        {role === "seller" ? (
          <DropdownMenuItem render={<Link href="/seller/store" />}>
            <LayoutDashboard aria-hidden /> My store
          </DropdownMenuItem>
        ) : null}
        {role === "admin" ? (
          <DropdownMenuItem render={<Link href="/admin/users" />}>
            <Shield aria-hidden /> Admin panel
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void signOutAction()}>
          <LogOut aria-hidden /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

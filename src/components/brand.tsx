import { Store } from "lucide-react";
import Link from "next/link";

import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Brand({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
    >
      <span className="elev-1 grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Store className="size-4" aria-hidden />
      </span>
      <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
    </Link>
  );
}

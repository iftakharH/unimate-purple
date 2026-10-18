import { GraduationCap } from "lucide-react";
import Link from "next/link";

import { Brand } from "@/components/brand";
import { getAuthContext } from "@/lib/auth";

const linkClasses =
  "text-sm text-muted-foreground transition-colors duration-fast hover:text-foreground";

/**
 * Shared site footer — marketplace surfaces only (landing, browse, listing).
 * Signed-in/out link sets differ; no placeholder links, ever.
 */
export async function SiteFooter() {
  const { user, profile } = await getAuthContext();
  const canSell = profile?.role === "seller";

  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Brand />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
            The East Delta University student marketplace — books, tech, dorm
            gear and more. Deal in ৳ BDT, meet on campus.
          </p>
        </div>

        <nav aria-label="Marketplace">
          <h2 className="text-sm font-medium">Marketplace</h2>
          <ul className="mt-3 space-y-2.5">
            <li>
              <Link href="/browse" className={linkClasses}>
                Browse listings
              </Link>
            </li>
            {user && (
              <li>
                <Link href="/saved" className={linkClasses}>
                  Saved items
                </Link>
              </li>
            )}
            {user && (
              <li>
                <Link href="/deals" className={linkClasses}>
                  My deals
                </Link>
              </li>
            )}
            {canSell ? (
              <li>
                <Link href="/seller/listings" className={linkClasses}>
                  My listings
                </Link>
              </li>
            ) : (
              <li>
                <Link
                  href={user ? "/become-seller" : "/signup"}
                  className={linkClasses}
                >
                  Become a seller
                </Link>
              </li>
            )}
          </ul>
        </nav>

        <nav aria-label="Account">
          <h2 className="text-sm font-medium">Account</h2>
          <ul className="mt-3 space-y-2.5">
            {user ? (
              <>
                {canSell && (
                  <li>
                    <Link href="/seller/store" className={linkClasses}>
                      My store
                    </Link>
                  </li>
                )}
                <li>
                  <Link href="/settings" className={linkClasses}>
                    Settings
                  </Link>
                </li>
                <li>
                  <Link href="/settings/security" className={linkClasses}>
                    Security
                  </Link>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link href="/login" className={linkClasses}>
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className={linkClasses}>
                    Create account
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-medium">Campus</h2>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground">
            <GraduationCap className="size-3.5 text-primary" aria-hidden />
            Students only · @eastdelta.edu.bd
          </p>
        </div>
      </div>

      <div className="border-t">
        <p className="mx-auto w-full max-w-6xl px-4 py-5 text-xs text-muted-foreground">
          © 2026 Unimate · Built for East Delta University · Currency ৳ BDT
        </p>
      </div>
    </footer>
  );
}

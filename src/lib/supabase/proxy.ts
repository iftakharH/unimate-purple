import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";

/**
 * Refreshes the Supabase session on every request.
 *
 * Called from `src/proxy.ts` (the Next.js 16 successor to `middleware.ts` —
 * the file and function were renamed in Next 16, behaviour is the same).
 *
 * Per Supabase SSR guidance:
 *  - session refresh in the request pipeline is mandatory; server pages
 *    cannot reliably write refreshed cookies themselves;
 *  - do not run logic between creating the client and the auth call below;
 *  - use `getClaims()`, never `getSession()`, on the server.
 *
 * Session policy note (Phase 2 decision): `getClaims()` INITIALIZES/refreshes
 * the session but does not expire it, so an idle visitor's cookie stays
 * present past its expiry. Route protection (redirecting unauthenticated
 * users away from /saved, /messages, /admin, …) therefore lives in the
 * layouts/pages themselves via `getUser()`, not here.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Propagate refreshed cookies onto both the request (so the
          // current render sees them) and the response (so the browser
          // stores them).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getClaims();

  return supabaseResponse;
}

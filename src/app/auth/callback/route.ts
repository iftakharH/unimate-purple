import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { sanitizeNextPath } from "@/lib/urls";

/**
 * PKCE callback for every email link Supabase sends (signup confirmation,
 * recovery, email change). Exchanges the one-time code for a session, then
 * forwards to `next` (defaults to home).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=link", request.url));
}

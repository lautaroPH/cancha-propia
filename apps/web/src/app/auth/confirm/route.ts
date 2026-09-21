import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Only a same-origin relative path is a valid redirect target — `next` comes
// from a query param an attacker fully controls (it's embedded in the actual
// magic-link email we send), so an absolute/protocol-relative URL here would
// be an open redirect straight out of a real login flow.
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const next = safeNext(searchParams.get("next"));
  const supabase = await createClient();

  // Default Supabase email templates point at their own /auth/v1/verify
  // endpoint, which redirects back here with `?code=` for PKCE-flow clients
  // (the default for @supabase/ssr) — this is what actually gets hit unless
  // the template is customized to embed `{{ .TokenHash }}` directly (that
  // requires custom SMTP, which we're not using). Handle both regardless.
  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=invalid_link", request.url));
}

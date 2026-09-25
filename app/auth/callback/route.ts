import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/account";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const errorUrl = new URL("/auth", url.origin);
      errorUrl.searchParams.set("error", "Unable to confirm your email. Please try signing in again.");
      return NextResponse.redirect(errorUrl);
    }
  }

  return NextResponse.redirect(new URL(next.startsWith("/") ? next : "/account", url.origin));
}

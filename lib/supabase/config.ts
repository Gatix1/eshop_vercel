export function getSupabaseConfig() {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!configuredUrl || !anonKey) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.");
  }

  try {
    const parsedUrl = new URL(configuredUrl);
    if (parsedUrl.protocol !== "https:") {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL must be the Supabase project URL, for example https://your-project-ref.supabase.co");
    }

    // Supabase also displays a REST endpoint ending in /rest/v1. Auth needs
    // the project root because it appends /auth/v1 to this URL.
    if (parsedUrl.pathname === "/rest/v1") parsedUrl.pathname = "";
    if (parsedUrl.pathname !== "") {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL must be the Supabase project URL, for example https://your-project-ref.supabase.co");
    }

    return { url: parsedUrl.toString().replace(/\/$/, ""), anonKey };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("NEXT_PUBLIC_SUPABASE_URL")) throw error;
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS Supabase project URL, for example https://your-project-ref.supabase.co");
  }
}

export function getSupabaseConfig() {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!configuredUrl || !anonKey) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.");
  }

  try {
    const parsedUrl = new URL(configuredUrl);
    if (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "localhost") {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL must be the Supabase project URL, for example https://your-project-ref.supabase.co");
    }

    // Auth and database clients append their own API paths. Ignore any path
    // copied from the Supabase REST settings and use only the project origin.
    return { url: parsedUrl.origin, anonKey };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("NEXT_PUBLIC_SUPABASE_URL")) throw error;
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS Supabase project URL, for example https://your-project-ref.supabase.co");
  }
}

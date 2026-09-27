import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireStaff(roles: string[], next = "/admin") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(next)}`);
  const { data: profile } = await supabase.from("profiles").select("id, role, is_active").eq("id", user.id).single();
  if (!profile?.is_active || !roles.includes(profile.role)) redirect("/account");
  return { user, profile, admin: createAdminClient() };
}

export async function logAdminAction(admin: ReturnType<typeof createAdminClient>, adminUserId: string, action: string, entityType: string, entityId?: string, metadata: Record<string, unknown> = {}) {
  await admin.from("admin_activity_logs").insert({ admin_user_id: adminUserId, action, entity_type: entityType, entity_id: entityId ?? null, metadata });
}

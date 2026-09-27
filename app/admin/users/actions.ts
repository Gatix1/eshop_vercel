"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAdminAction, requireStaff } from "@/app/admin/operations";

const roles = ["admin", "inventory_manager", "order_manager", "customer"];

export async function inviteStaff(formData: FormData) {
  const { user, admin } = await requireStaff(["owner"], "/admin/users");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "admin");
  if (!email || !email.includes("@") || !roles.includes(role) || role === "customer") redirect("/admin/users?error=Enter%20a%20valid%20staff%20email%20and%20role");
  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { invited_role: role } });
  if (error || !invited.user) redirect(`/admin/users?error=${encodeURIComponent(error?.message ?? "Invitation failed")}`);
  await admin.from("profiles").update({ role }).eq("id", invited.user.id);
  await logAdminAction(admin, user.id, "invite", "profile", invited.user.id, { email, role });
  revalidatePath("/admin/users");
  redirect("/admin/users?invited=1");
}

export async function updateStaff(formData: FormData) {
  const { user, admin } = await requireStaff(["owner"], "/admin/users");
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");
  const isActive = formData.get("is_active") === "true";
  if (!id || id === user.id || !roles.includes(role)) redirect("/admin/users?error=Invalid%20staff%20update");
  const { error } = await admin.from("profiles").update({ role, is_active: !isActive }).eq("id", id);
  if (error) redirect(`/admin/users?error=${encodeURIComponent(error.message)}`);
  await logAdminAction(admin, user.id, "update_access", "profile", id, { role, is_active: !isActive });
  revalidatePath("/admin/users");
}

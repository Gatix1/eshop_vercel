import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CategoryEditor } from "@/app/admin/categories/category-editor";

export default async function EditCategoryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(`/admin/categories/${id}`)}`);
  const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", user.id).single();
  if (!profile?.is_active || !["owner", "admin", "inventory_manager"].includes(profile.role)) redirect("/admin");
  const admin = createAdminClient();
  const { data: category } = await admin.from("categories").select("id, name, slug, description").eq("id", id).maybeSingle();
  if (!category) notFound();
  return <CategoryEditor category={category} error={query.error} saved={query.saved} />;
}

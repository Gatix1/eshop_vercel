import { CategoryEditor } from "@/app/admin/categories/category-editor";

export default async function NewCategoryPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const query = await searchParams;
  return <CategoryEditor error={query.error} saved={query.saved} />;
}

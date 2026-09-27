import { loadProductForm } from "@/app/admin/products/form-data";
import { ProductEditor } from "@/app/admin/products/product-editor";

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string; variant_error?: string; variant_saved?: string }> }) {
  const { categories, error, saved } = await loadProductForm(undefined, searchParams);
  return <ProductEditor title="Add product" categories={categories} error={error} saved={saved} />;
}

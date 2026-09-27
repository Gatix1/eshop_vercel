import { loadProductForm } from "@/app/admin/products/form-data";
import { ProductEditor } from "@/app/admin/products/product-editor";

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { id } = await params;
  const { categories, product, error, saved } = await loadProductForm(id, searchParams);
  return <ProductEditor title="Edit product" product={product ?? undefined} categories={categories} error={error} saved={saved} />;
}

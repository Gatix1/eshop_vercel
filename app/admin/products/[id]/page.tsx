import { loadProductForm } from "@/app/admin/products/form-data";
import { ProductEditor } from "@/app/admin/products/product-editor";

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string; variant_error?: string; variant_saved?: string }> }) {
  const { id } = await params;
  const { categories, product, variants, error, saved, variantError, variantSaved } = await loadProductForm(id, searchParams);
  return <ProductEditor title="Edit product" product={product ?? undefined} categories={categories} variants={variants} error={error} saved={saved} variantError={variantError} variantSaved={variantSaved} />;
}

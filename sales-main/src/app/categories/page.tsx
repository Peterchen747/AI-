import { db, schema } from "@/db";
import { desc } from "drizzle-orm";
import { CategoriesClient } from "@/components/categories/categories-client";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await db
    .select({
      id: schema.categories.id,
      name: schema.categories.name,
      description: schema.categories.description,
      isActive: schema.categories.isActive,
    })
    .from(schema.categories)
    .orderBy(desc(schema.categories.createdAt));

  return <CategoriesClient categories={categories} />;
}

import type { Metadata } from "next";
import { Tags } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { CategoryAddForm, CategoryRow } from "./category-forms";

export const metadata: Metadata = { title: "Categories — Admin" };

export default async function AdminCategoriesPage() {
  const { supabase } = await requireAdmin();

  const [{ data: categories }, { data: listingRows }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug, icon, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("listings").select("category_id"),
  ]);

  const counts = new Map<string, number>();
  let uncategorised = 0;
  for (const row of listingRows ?? []) {
    if (row.category_id) {
      counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
    } else {
      uncategorised += 1;
    }
  }

  const rows = categories ?? [];
  const nextSortOrder =
    rows.reduce((max, c) => Math.max(max, c.sort_order), 0) + 1;

  return (
    <div className="space-y-6">
      <Card className="elev-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Tags className="size-4" aria-hidden />
            Add a category
          </CardTitle>
          <CardDescription>
            Categories power the browse filters and the hero rail. The slug is
            generated from the name.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryAddForm nextSortOrder={nextSortOrder} />
        </CardContent>
      </Card>

      <Card className="elev-1">
        <CardHeader>
          <CardTitle className="text-base">
            Categories <span className="text-muted-foreground">({rows.length})</span>
          </CardTitle>
          <CardDescription>
            <span className="tabular">{uncategorised}</span> listings are
            uncategorised.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-2xl border">
            {rows.map((category) => (
              <li key={category.slug} className="px-4 py-3">
                <CategoryRow
                  key={`${category.id}-${category.sort_order}-${category.name}-${category.icon ?? ""}`}
                  categoryId={category.id}
                  name={category.name}
                  icon={category.icon}
                  sortOrder={category.sort_order}
                  listingCount={counts.get(category.id) ?? 0}
                />
              </li>
            ))}
            {rows.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                No categories yet — add the first one above.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

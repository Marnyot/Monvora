'use client'

import { useCategories } from '@/lib/hooks/use-categories'
import { CategoryListClient } from '@/components/dashboard/category-list-client'
import { SkeletonList } from '@/components/shared/skeleton-card'
import { Skeleton } from '@/components/ui/skeleton'

export default function CategoriesPage() {
  const { data: categories, isLoading, sessionLoading } = useCategories()

  if (isLoading || sessionLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <Skeleton className="h-7 w-28" />
        <SkeletonList count={6} />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold text-foreground mb-6">Kategori</h1>
      <CategoryListClient categories={categories ?? []} />
    </div>
  )
}

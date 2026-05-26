import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CategoryListClient } from '@/components/dashboard/category-list-client'

export const metadata = { title: 'Kategori — Monvora' }

export default async function CategoriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, icon, color, type, is_system, user_id')
    .is('deleted_at', null)
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .order('is_system', { ascending: false })
    .order('name', { ascending: true })

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold text-foreground mb-6">Kategori</h1>
      <CategoryListClient categories={categories ?? []} />
    </div>
  )
}

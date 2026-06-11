import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useSession } from './use-session'

export interface CategoryItem {
  id: string
  name: string
  icon: string
  color: string
  type: string
  is_system: boolean | null
  user_id: string | null
}

export function useCategories() {
  const { user, loading: sessionLoading } = useSession()

  const query = useQuery({
    queryKey: ['categories', user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('categories')
        .select('id, name, icon, color, type, is_system, user_id')
        .is('deleted_at', null)
        .or(`user_id.eq.${user!.id},user_id.is.null`)
        .order('is_system', { ascending: false })
        .order('name', { ascending: true })
      return (data ?? []) as CategoryItem[]
    },
  })

  return { ...query, sessionLoading }
}

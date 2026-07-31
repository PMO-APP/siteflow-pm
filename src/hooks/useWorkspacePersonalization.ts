import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { getRecentItems, getWorkspacePreferences, recordRecentItem, saveWorkspacePreferences, type PersonalItem } from '@/services/personalization'

export function useWorkspacePersonalization() {
  const user = useAuthStore(state => state.user)
  const client = useQueryClient()
  const recent = useQuery({ queryKey: ['workspace-recent', user?.id], enabled: !!user?.id, queryFn: () => getRecentItems(user!.id) })
  const preferences = useQuery({ queryKey: ['workspace-preferences', user?.id], enabled: !!user?.id, queryFn: () => getWorkspacePreferences(user!.id) })
  const remember = useMutation({ mutationFn: (item: PersonalItem) => recordRecentItem(user!.id, item), onSuccess: () => client.invalidateQueries({ queryKey: ['workspace-recent', user?.id] }) })
  const toggleFavorite = useMutation({ mutationFn: async (item: PersonalItem) => { const current = preferences.data || { favorites: [], pinnedModules: [], usage: {} }; const exists = current.favorites.some(x => x.id === item.id); await saveWorkspacePreferences(user!.id, { ...current, favorites: exists ? current.favorites.filter(x => x.id !== item.id) : [item, ...current.favorites].slice(0, 20) }) }, onSuccess: () => client.invalidateQueries({ queryKey: ['workspace-preferences', user?.id] }) })
  return { recentItems: recent.data || [], favorites: preferences.data?.favorites || [], preferences: preferences.data, isLoading: recent.isLoading || preferences.isLoading, remember: remember.mutate, toggleFavorite: toggleFavorite.mutate }
}

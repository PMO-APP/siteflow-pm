import { supabase } from '@/lib/supabase'
import type { PersonalItem, WorkspacePreference } from './personalizationTypes'

const RECENT_KEY = 'pmocorex_recent_items_v2'
const PREF_KEY = 'pmocorex_workspace_preferences_v2'
const DEFAULT_PREFS: WorkspacePreference = { favorites: [], pinnedModules: [], usage: {} }

function readLocal<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback } catch { return fallback }
}
function writeLocal(key: string, value: unknown) { localStorage.setItem(key, JSON.stringify(value)) }

export async function getRecentItems(userId: string, limit = 12): Promise<PersonalItem[]> {
  const local = readLocal<PersonalItem[]>(RECENT_KEY, [])
  const { data, error } = await supabase.from('user_recent_items').select('*').eq('user_id', userId).order('viewed_at', { ascending: false }).limit(limit)
  if (error) return local.slice(0, limit)
  return (data || []).map(row => ({ id: row.id, itemType: row.item_type, itemId: row.item_id, title: row.title, subtitle: row.subtitle, route: row.route, projectId: row.project_id, projectName: row.project_name, organizationId: row.organization_id, portfolioId: row.portfolio_id, metadata: row.metadata || {}, viewedAt: row.viewed_at }))
}

export async function recordRecentItem(userId: string, item: PersonalItem): Promise<void> {
  const entry = { ...item, id: `${item.itemType}:${item.itemId ?? item.route}`, viewedAt: new Date().toISOString() }
  const local = [entry, ...readLocal<PersonalItem[]>(RECENT_KEY, []).filter(x => x.id !== entry.id)].slice(0, 30)
  writeLocal(RECENT_KEY, local)
  await supabase.from('user_recent_items').upsert({ user_id: userId, item_type: item.itemType, item_id: String(item.itemId ?? item.route), title: item.title, subtitle: item.subtitle || null, route: item.route, project_id: item.projectId || null, project_name: item.projectName || null, organization_id: item.organizationId || null, portfolio_id: item.portfolioId || null, metadata: item.metadata || {}, viewed_at: entry.viewedAt }, { onConflict: 'user_id,item_type,item_id' })
}

export async function getWorkspacePreferences(userId: string): Promise<WorkspacePreference> {
  const local = readLocal<WorkspacePreference>(PREF_KEY, DEFAULT_PREFS)
  const { data, error } = await supabase.from('user_workspace_preferences').select('preferences').eq('user_id', userId).maybeSingle()
  if (error || !data?.preferences) return local
  return { ...DEFAULT_PREFS, ...data.preferences }
}

export async function saveWorkspacePreferences(userId: string, preferences: WorkspacePreference): Promise<void> {
  writeLocal(PREF_KEY, preferences)
  await supabase.from('user_workspace_preferences').upsert({ user_id: userId, preferences, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
}

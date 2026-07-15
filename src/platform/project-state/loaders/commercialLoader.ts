import { supabase } from '@/lib/supabase'

export async function loadCommercial(projectId: string | number): Promise<any[]> {
  const { data, error } = await supabase
    .from('financial')
    .select('*')
    .eq('project_id', projectId)

  if (error) throw error
  return data || []
}

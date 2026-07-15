import { supabase } from '@/lib/supabase'

export async function loadProcurement(projectId: string | number): Promise<any[]> {
  const { data, error } = await supabase
    .from('procurement')
    .select('*')
    .eq('project_id', projectId)

  if (error) throw error
  return data || []
}

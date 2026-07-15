import { supabase } from '@/lib/supabase'

export async function loadRisks(projectId: string | number): Promise<any[]> {
  const { data, error } = await supabase
    .from('risks')
    .select('*')
    .eq('project_id', projectId)

  if (error) throw error
  return data || []
}

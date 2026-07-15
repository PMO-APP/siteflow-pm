import { supabase } from '@/lib/supabase'

export async function loadApprovals(projectId: string | number): Promise<any[]> {
  const { data, error } = await supabase
    .from('approvals')
    .select('*')
    .eq('project_id', projectId)

  if (error) throw error
  return data || []
}

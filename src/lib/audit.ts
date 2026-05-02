import { supabase } from '@/lib/supabase'

export async function logAudit(
  user: any,
  action: string,
  module: string,
  itemId: string,
  description: string
) {
  await supabase
    .from('audit_logs')
    .insert({
      user_email: user?.email,
      user_id: user?.id,
      action,
      module,
      item_id: itemId,
      description
    })
}

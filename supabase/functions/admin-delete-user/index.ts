import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authorization = request.headers.get('Authorization') || ''

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    })
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser()
    if (callerError || !caller) throw new Error('Authentication required.')

    const { data: callerMemberships, error: membershipError } = await adminClient
      .from('memberships')
      .select('role')
      .eq('user_id', caller.id)

    if (membershipError) throw membershipError

    const isAdmin = (callerMemberships || []).some(membership =>
      ['workspace_admin', 'admin'].includes(String(membership.role || '').toLowerCase())
    )
    if (!isAdmin) throw new Error('Only a workspace administrator can delete users.')

    const { userId, email } = await request.json()
    if (!userId && !email) throw new Error('A user ID or email address is required.')
    if (userId === caller.id) throw new Error('You cannot delete your own administrator account.')

    let targetUserId = userId as string | undefined
    if (!targetUserId && email) {
      const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
      if (listError) throw listError
      targetUserId = usersData.users.find(user => user.email?.toLowerCase() === String(email).toLowerCase())?.id
    }

    if (email) {
      await adminClient.from('project_team_members').delete().eq('email', String(email).toLowerCase())
      await adminClient.from('team_invitations').delete().eq('email', String(email).toLowerCase())
      await adminClient.from('memberships').delete().eq('email', String(email).toLowerCase())
    }

    if (targetUserId) {
      await adminClient.from('memberships').delete().eq('user_id', targetUserId)
      await adminClient.from('profiles').delete().eq('id', targetUserId)
      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(targetUserId)
      if (deleteAuthError) throw deleteAuthError
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unable to delete user.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

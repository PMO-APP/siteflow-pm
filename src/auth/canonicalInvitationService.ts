import { supabase } from '@/lib/supabase'

export async function loadCanonicalInvitation(token: string) {
  const { data, error } = await supabase.rpc(
    'get_canonical_invitation_by_token',
    {
      p_token: token.trim(),
    }
  )

  if (error) throw error

  return data
}

export async function completeCanonicalInvitation(input: {
  token: string
  fullName: string
}) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) throw sessionError

  if (!session?.access_token) {
    throw new Error(
      'Your login session is missing. Please sign in again before accepting this invitation.'
    )
  }

  const { data, error } = await supabase.rpc(
    'pmocorex_accept_invitation_v2',
    {
      p_token: input.token.trim(),
      p_full_name: input.fullName.trim(),
    }
  )

  if (error) {
    console.error(
      'PMOCorex invitation acceptance RPC failed:',
      error
    )

    throw new Error(
      [
        error.message,
        error.details,
        error.hint,
        error.code ? `Code: ${error.code}` : null,
      ]
        .filter(Boolean)
        .join(' ')
    )
  }

  return data as {
    workspaceId: string
    userId: string
    role: string
    scope: string
    accepted: boolean
  }
}

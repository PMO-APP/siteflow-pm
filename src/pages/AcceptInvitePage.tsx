import { useEffect, useState } from 'react'
import { CheckCircle, AlertTriangle } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [invite, setInvite] = useState<any>(null)
  const [error, setError] = useState('')
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    loadInvite()
  }, [token])

  async function loadInvite() {
    if (!token) {
      setError('Invite token is missing.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('organization_invites')
      .select('*, organizations(name)')
      .eq('token', token)
      .single()

    if (error || !data) {
      setError('Invite not found or expired.')
      setLoading(false)
      return
    }

    setInvite(data)
    setLoading(false)
  }

  async function acceptInvite() {
    if (!user) {
      navigate(`/signup?invite=${token}`)
      return
    }

    if (!invite) return

    const userEmail = user.email?.toLowerCase()
    const inviteEmail = invite.email?.toLowerCase()

    if (userEmail !== inviteEmail) {
      setError(
        `This invite was sent to ${invite.email}. Please sign in with that email.`
      )
      return
    }

    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: invite.organization_id,
        user_id: user.id,
        role: invite.role,
      })

    if (memberError) {
      setError(memberError.message)
      return
    }

    const { error: inviteError } = await supabase
      .from('organization_invites')
      .update({
        status: 'accepted',
        accepted_by: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invite.id)

    if (inviteError) {
      setError(inviteError.message)
      return
    }

    setAccepted(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c1014] text-white flex items-center justify-center">
        Loading invite…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0c1014] text-white flex items-center justify-center p-6">
      <div className="card w-full max-w-md p-8 text-center">
        {accepted ? (
          <>
            <CheckCircle
              size={42}
              className="text-emerald-400 mx-auto mb-4"
            />

            <h1 className="text-2xl font-bold">
              Invite accepted
            </h1>

            <p className="text-slate-400 mt-3">
              You now have access to {invite.organizations?.name}.
            </p>

            <button
              onClick={() => navigate('/projects')}
              className="btn-gold btn w-full justify-center mt-6"
            >
              Go to Workspace Hub
            </button>
          </>
        ) : (
          <>
            <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
              PMOCorex Invite
            </div>

            <h1 className="text-2xl font-bold">
              Join {invite?.organizations?.name}
            </h1>

            <p className="text-slate-400 mt-3">
              You have been invited as{' '}
              <span className="text-[#c49e48]">
                {invite?.role?.replace('_', ' ')}
              </span>
              .
            </p>

            {error && (
              <div className="mt-4 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex gap-2 text-left">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            <button
              onClick={acceptInvite}
              className="btn-gold btn w-full justify-center mt-6"
            >
              {user ? 'Accept Invite' : 'Create Account to Accept'}
            </button>

            {!user && (
              <button
                onClick={() => navigate('/login')}
                className="btn-ghost btn w-full justify-center mt-3"
              >
                I already have an account
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

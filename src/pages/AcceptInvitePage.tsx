import { useEffect, useState } from 'react'
import { CheckCircle, AlertTriangle } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [invite, setInvite] = useState<any>(null)
  const [error, setError] = useState('')
  const [accepted, setAccepted] = useState(false)

  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

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
      .from('team_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .maybeSingle()

    if (error || !data) {
      setError('Invite not found, expired, or already accepted.')
      setLoading(false)
      return
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setError('This invitation has expired.')
      setLoading(false)
      return
    }

    setInvite(data)
    setFullName(data.full_name || '')
    setLoading(false)
  }

  async function acceptInvite() {
    if (!invite) {
      setError(
        'Invite data could not be loaded. Please refresh or request a new invite link.'
      )
      return
    }

    setError('')

    if (!fullName.trim()) {
      setError('Full name is required.')
      return
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    const email = invite.email.trim().toLowerCase()
    const inviteScope = invite.invite_scope || invite.access_scope || 'project'

    const { data: signUpData, error: signUpError } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: invite.role,
          },
        },
      })

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    const userId = signUpData.user?.id

    if (!userId) {
      setError('Account created, but user profile was not returned.')
      return
    }

    const { error: profileError } = await supabase.from('profiles').insert({
  id: userId,
  email,
  full_name: fullName,
  role: invite.role,
  updated_at: new Date().toISOString(),
})

    if (profileError) {
      setError(profileError.message)
      return
    }

    const { error: membershipError } = await supabase
      .from('memberships')
      .insert({
        user_id: userId,
        organization_id: invite.organization_id || 1,
        email,
        full_name: fullName,
        role: invite.role,
        access_scope: inviteScope,
        project_id: inviteScope === 'project' ? invite.project_id : null,
        portfolio_id: inviteScope === 'portfolio' ? invite.portfolio_id : null,
      })

    if (membershipError) {
      setError(membershipError.message)
      return
    }

    if (inviteScope === 'project') {
      const { error: teamError } = await supabase
        .from('project_team_members')
        .insert({
          project_id: invite.project_id,
          email,
          full_name: fullName,
          role: invite.role,
        })

      if (teamError) {
        setError(teamError.message)
        return
      }
    }

    const { error: inviteError } = await supabase
      .from('team_invitations')
      .update({
        status: 'accepted',
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
            <CheckCircle size={42} className="text-emerald-400 mx-auto mb-4" />

            <h1 className="text-2xl font-bold text-[#ede8de]">
              Account activated
            </h1>

            <p className="text-[#6e7d8c] mt-3">
              Your PMOCorex access has been created successfully.
            </p>

            <button
              onClick={() => navigate('/mixta-admin-login')}
              className="btn-gold btn w-full justify-center mt-6"
            >
              Go to Login
            </button>
          </>
        ) : (
          <>
            <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
              PMOCorex Invitation
            </div>

            <h1 className="text-2xl font-bold text-[#ede8de]">
              Join PMOCorex
            </h1>

            <p className="text-[#6e7d8c] mt-3">
              You have been invited as{' '}
              <span className="text-[#c49e48] font-semibold">
                {invite?.role || 'team member'}
              </span>
              .
            </p>

            {error && (
              <div className="mt-4 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex gap-2 text-left">
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3 mt-6 text-left">
              <input
                className="form-control"
                placeholder="Full Name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />

              <input
                className="form-control"
                value={invite?.email || ''}
                disabled
              />

              <input
                className="form-control"
                type="password"
                placeholder="Create Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />

              <input
                className="form-control"
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              onClick={acceptInvite}
              className="btn-gold btn w-full justify-center mt-6"
            >
              Activate Account
            </button>
          </>
        )}
      </div>
    </div>
  )
}

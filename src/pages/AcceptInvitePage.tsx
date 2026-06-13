import { useEffect, useState } from 'react'
import {
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

const EXTERNAL_ROLES = [
  'consultant',
  'contractor',
  'vendor',
  'subcontractor',
]

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [invite, setInvite] = useState<any>(null)
  const [error, setError] = useState('')
  const [accepted, setAccepted] = useState(false)

  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    loadInvite()
  }, [token])

  function cleanRole(role: string | null | undefined) {
    return String(role || '').toLowerCase().trim()
  }

  function getInviteScope() {
    return invite?.invite_scope || invite?.access_scope || 'project'
  }

  function getProjectIds() {
    const idsFromArray = Array.isArray(invite?.project_ids)
      ? invite.project_ids
      : []

    const idsFromSingle = invite?.project_id ? [invite.project_id] : []

    return [...new Set([...idsFromArray, ...idsFromSingle])]
      .map(id => Number(id))
      .filter(Boolean)
  }

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

    try {
      setSubmitting(true)

      const email = invite.email.trim().toLowerCase()
      const role = cleanRole(invite.role)
      const inviteScope = getInviteScope()
      const projectIds = getProjectIds()

      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role,
            },
          },
        })

      if (signUpError) {
        if (
          signUpError.message.toLowerCase().includes('already registered')
        ) {
          setError(
            'An account already exists for this email. Please sign in instead.'
          )
          return
        }

        setError(signUpError.message)
        return
      }

      const userId = signUpData.user?.id

      if (!userId) {
        setError('Account created, but user profile was not returned.')
        return
      }

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        email,
        full_name: fullName,
        role,
        updated_at: new Date().toISOString(),
      })

      if (profileError) {
        setError(profileError.message)
        return
      }

      if (inviteScope === 'workspace') {
        const { error: membershipError } = await supabase
          .from('memberships')
          .insert({
            user_id: userId,
            organization_id: invite.organization_id || 1,
            email,
            full_name: fullName,
            role,
            access_scope: 'workspace',
            project_id: null,
            portfolio_id: null,
          })

        if (membershipError) {
          setError(membershipError.message)
          return
        }
      }

      if (inviteScope === 'project') {
        if (projectIds.length === 0) {
          setError('No project was attached to this invitation.')
          return
        }

        const membershipRows = projectIds.map(projectId => ({
          user_id: userId,
          organization_id: invite.organization_id || 1,
          email,
          full_name: fullName,
          role,
          access_scope: 'project',
          project_id: projectId,
          portfolio_id: null,
        }))

        const { error: membershipError } = await supabase
          .from('memberships')
          .insert(membershipRows)

        if (membershipError) {
          setError(membershipError.message)
          return
        }

        const teamRows = projectIds.map(projectId => ({
          user_id: userId,
          project_id: projectId,
          email,
          full_name: fullName,
          role,
        }))

        const { error: teamError } = await supabase
          .from('project_team_members')
          .upsert(teamRows, {
            onConflict: 'project_id,email',
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
    } finally {
      setSubmitting(false)
    }
  }

  const inviteScope = getInviteScope()
  const projectCount = getProjectIds().length
  const roleLabel = cleanRole(invite?.role) || 'team member'
  const isExternal = EXTERNAL_ROLES.includes(roleLabel)

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
              onClick={() =>
                navigate(isExternal ? '/external-project' : '/mixta-admin-login')
              }
              className="btn-gold btn w-full justify-center mt-6"
            >
              {isExternal ? 'Go to External Portal' : 'Go to Login'}
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
                {roleLabel}
              </span>
              .
            </p>

            {inviteScope === 'project' && projectCount > 0 && (
              <div className="mt-4 rounded-xl border border-[#c49e48]/20 bg-[#c49e48]/10 p-3 text-sm text-[#ede8de]">
                This invitation grants access to {projectCount} project
                {projectCount === 1 ? '' : 's'}.
              </div>
            )}

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

              <div className="relative">
                <input
                  className="form-control pr-10"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(current => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6e7d8c] hover:text-[#ede8de]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="relative">
                <input
                  className="form-control pr-10"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(current => !current)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6e7d8c] hover:text-[#ede8de]"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={acceptInvite}
              disabled={submitting}
              className="btn-gold btn w-full justify-center mt-6"
            >
              {submitting ? 'Activating…' : 'Activate Account'}
            </button>

            <div className="mt-4 text-center">
              <span className="text-[#6e7d8c] text-sm">
                Already have an account?{' '}
              </span>

              <button
                type="button"
                onClick={() => navigate('/mixta-admin-login')}
                className="text-[#c49e48] text-sm hover:underline"
              >
                Sign In
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import {
  completeCanonicalInvitation,
  loadCanonicalInvitation,
} from '@/auth/canonicalInvitationService'
import {
  AlertTriangle,
  CheckCircle,
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

type InvitationData = {
  id: string
  token: string
  email: string
  full_name?: string | null
  role?: string | null
  workspace_id?: string | null
  workspace_type?: string | null
  portal_role?: string | null
  invite_scope?: string | null
  access_scope?: string | null
  project_id?: number | string | null
  project_ids?: Array<number | string> | null
  expires_at?: string | null
}

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [invite, setInvite] = useState<InvitationData | null>(null)
  const [error, setError] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [signedInUserId, setSignedInUserId] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    void loadInvite()
  }, [token])

  function cleanRole(role: string | null | undefined) {
    return String(role || '')
      .toLowerCase()
      .trim()
  }

  function getInviteScope() {
    return invite?.invite_scope || invite?.access_scope || 'project'
  }

  function getProjectIds() {
    const idsFromArray = Array.isArray(invite?.project_ids)
      ? invite.project_ids
      : []

    const idsFromSingle = invite?.project_id
      ? [invite.project_id]
      : []

    return [...new Set([...idsFromArray, ...idsFromSingle])]
      .map(id => Number(id))
      .filter(Number.isFinite)
  }

  async function loadInvite() {
    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      setSignedInUserId(user?.id || null)

      if (!token) {
        setError('Invite token is missing.')
        return
      }

      const invitation = await loadCanonicalInvitation(token)

      if (!invitation) {
        setError(
          'This invitation is invalid, expired or has already been accepted.'
        )
        return
      }

      const typedInvitation = invitation as InvitationData

      if (
        typedInvitation.expires_at &&
        new Date(typedInvitation.expires_at) < new Date()
      ) {
        setError('This invitation has expired.')
        return
      }

      setInvite(typedInvitation)
      setFullName(typedInvitation.full_name ?? '')
    } catch (loadError) {
      console.error('Unable to load invitation:', loadError)

      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load this invitation.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function acceptInvite() {
    if (!invite) {
      setError(
        'Invite data could not be loaded. Please refresh or request a new invite link.'
      )
      return
    }

    /*
     * searchParams.get() returns string | null.
     * This guard narrows token to string for the rest of this function.
     */
    if (!token) {
      setError('Invite token is missing.')
      return
    }

    const cleanFullName = fullName.trim()

    if (!cleanFullName) {
      setError('Full name is required.')
      return
    }

    if (!invite.email?.trim()) {
      setError('The invitation does not contain a valid email address.')
      return
    }

    if (!signedInUserId) {
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters.')
        return
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }
    }

    setError('')
    setSubmitting(true)

    try {
      const email = invite.email.trim().toLowerCase()
      const invitedRole = cleanRole(invite.role)
      const role = invitedRole || 'viewer'

      let userId = signedInUserId

      if (userId) {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) {
          throw userError
        }

        if (!user) {
          setSignedInUserId(null)
          setError(
            'Your session has expired. Please sign in again and reopen the invitation link.'
          )
          return
        }

        if (!user.email || user.email.toLowerCase() !== email) {
          setError(
            'This invitation belongs to a different email address. Please sign in with the invited account.'
          )
          return
        }
      } else {
        const {
          data: signUpData,
          error: signUpError,
        } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: cleanFullName,
              role,
            },
          },
        })

        if (signUpError) {
          const errorMessage = signUpError.message.toLowerCase()

          if (
            errorMessage.includes('already registered') ||
            errorMessage.includes('already exists')
          ) {
            setError(
              'An account already exists for this email. Sign in, then reopen this invitation link.'
            )
            return
          }

          throw signUpError
        }

        userId = signUpData.user?.id || null

        if (!userId) {
          setError(
            'The account was created, but the user profile was not returned.'
          )
          return
        }

        if (!signUpData.session) {
          setError(
            'Your account has been created. Verify your email, sign in, then reopen this invitation link to complete your access.'
          )
          return
        }

        setSignedInUserId(userId)
      }

      /*
       * Milestone 3.8:
       * The database RPC validates the signed-in email, invitation status,
       * expiry, workspace membership and scoped assignments transactionally.
       */
      await completeCanonicalInvitation({
        token,
        fullName: cleanFullName,
      })

      setAccepted(true)
    } catch (acceptError) {
      console.error('Unable to accept invitation:', acceptError)

      setError(
        acceptError instanceof Error
          ? acceptError.message
          : 'Unable to activate your PMOCorex access.'
      )
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
        Loading invitation…
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

            <h1 className="text-2xl font-bold text-[#ede8de]">
              Account activated
            </h1>

            <p className="text-[#6e7d8c] mt-3">
              Your PMOCorex access has been created successfully.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate(
                  isExternal
                    ? '/external-project'
                    : '/mixta-admin-login'
                )
              }
              className="btn-gold btn w-full justify-center mt-6"
            >
              {isExternal
                ? 'Go to External Portal'
                : 'Go to Login'}
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

            {invite && (
              <p className="text-[#6e7d8c] mt-3">
                You have been invited as{' '}
                <span className="text-[#c49e48] font-semibold">
                  {roleLabel}
                </span>
                .
              </p>
            )}

            {inviteScope === 'project' && projectCount > 0 && (
              <div className="mt-4 rounded-xl border border-[#c49e48]/20 bg-[#c49e48]/10 p-3 text-sm text-[#ede8de]">
                This invitation grants access to {projectCount}{' '}
                project{projectCount === 1 ? '' : 's'}.
              </div>
            )}

            {signedInUserId && invite && (
              <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-300">
                You are already signed in. Confirm your name and activate
                the invitation.
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex gap-2 text-left">
                <AlertTriangle
                  size={16}
                  className="shrink-0 mt-0.5"
                />
                <span>{error}</span>
              </div>
            )}

            {invite && (
              <>
                <div className="space-y-3 mt-6 text-left">
                  <input
                    className="form-control"
                    placeholder="Full name"
                    value={fullName}
                    onChange={event =>
                      setFullName(event.target.value)
                    }
                    autoComplete="name"
                  />

                  <input
                    className="form-control"
                    value={invite.email || ''}
                    disabled
                    aria-label="Invited email address"
                  />

                  {!signedInUserId && (
                    <>
                      <div className="relative">
                        <input
                          className="form-control pr-10"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Create password"
                          value={password}
                          onChange={event =>
                            setPassword(event.target.value)
                          }
                          autoComplete="new-password"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowPassword(current => !current)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6e7d8c] hover:text-[#ede8de]"
                          aria-label={
                            showPassword
                              ? 'Hide password'
                              : 'Show password'
                          }
                        >
                          {showPassword ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </div>

                      <div className="relative">
                        <input
                          className="form-control pr-10"
                          type={
                            showConfirmPassword
                              ? 'text'
                              : 'password'
                          }
                          placeholder="Confirm password"
                          value={confirmPassword}
                          onChange={event =>
                            setConfirmPassword(event.target.value)
                          }
                          autoComplete="new-password"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(
                              current => !current
                            )
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6e7d8c] hover:text-[#ede8de]"
                          aria-label={
                            showConfirmPassword
                              ? 'Hide confirmation password'
                              : 'Show confirmation password'
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => void acceptInvite()}
                  disabled={submitting}
                  className="btn-gold btn w-full justify-center mt-6"
                >
                  {submitting
                    ? 'Activating…'
                    : signedInUserId
                      ? 'Accept Invitation'
                      : 'Activate Account'}
                </button>
              </>
            )}

            {!signedInUserId && (
              <div className="mt-4 text-center">
                <span className="text-[#6e7d8c] text-sm">
                  Already have an account?{' '}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    const redirect = token
                      ? `/accept-invite?token=${encodeURIComponent(token)}`
                      : '/projects'

                    navigate(
                      `/mixta-admin-login?redirect=${encodeURIComponent(
                        redirect
                      )}`
                    )
                  }}
                  className="text-[#c49e48] text-sm hover:underline"
                >
                  Sign in
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

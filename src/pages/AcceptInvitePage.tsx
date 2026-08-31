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
  LogOut,
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

function isMissingSessionError(error: unknown) {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()

  return (
    message.includes('auth session missing') ||
    message.includes('session missing') ||
    message.includes('no session')
  )
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
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null)

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

  async function loadCurrentUser() {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError && !isMissingSessionError(sessionError)) {
      throw sessionError
    }

    const user = session?.user || null

    setSignedInUserId(user?.id || null)
    setSignedInEmail(user?.email?.toLowerCase() || null)

    return user
  }

  async function loadInvite() {
    setLoading(true)
    setError('')

    try {
      await loadCurrentUser()

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

  async function createAccountAndSession(
    email: string,
    cleanFullName: string,
    role: string
  ) {
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
      const message = signUpError.message.toLowerCase()

      if (
        message.includes('already registered') ||
        message.includes('already exists') ||
        message.includes('user already registered')
      ) {
        throw new Error(
          'An account already exists for this email. Use Sign in instead, then return to this invitation.'
        )
      }

      throw signUpError
    }

    if (!signUpData.user) {
      throw new Error('The account could not be created.')
    }

    /*
     * When email confirmation is disabled, signUpData.session is returned
     * immediately and the invitation can be accepted in this same flow.
     */
    if (signUpData.session) {
      setSignedInUserId(signUpData.user.id)
      setSignedInEmail(signUpData.user.email?.toLowerCase() || email)

      return signUpData.user
    }

    /*
     * When email confirmation is enabled, Supabase creates the user but does
     * not issue a session until the email is confirmed.
     */
    throw new Error(
      'Your account has been created. Please verify your email, then reopen this invitation link to complete your access.'
    )
  }

  async function acceptInvite() {
    if (!invite) {
      setError(
        'Invite data could not be loaded. Please refresh or request a new invite link.'
      )
      return
    }

    if (!token) {
      setError('Invite token is missing.')
      return
    }

    const cleanFullName = fullName.trim()
    const invitedEmail = invite.email?.trim().toLowerCase()
    const role = cleanRole(invite.role) || 'viewer'

    if (!cleanFullName) {
      setError('Full name is required.')
      return
    }

    if (!invitedEmail) {
      setError('The invitation does not contain a valid email address.')
      return
    }

    setError('')
    setSubmitting(true)

    try {
      let currentUser = await loadCurrentUser()

      if (currentUser) {
        const currentEmail = currentUser.email?.toLowerCase()

        if (!currentEmail || currentEmail !== invitedEmail) {
          setError(
            'This invitation belongs to a different email address. Please sign out and use the invited account.'
          )
          return
        }
      } else {
        if (!password || password.length < 6) {
          setError('Password must be at least 6 characters.')
          return
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match.')
          return
        }

        currentUser = await createAccountAndSession(
          invitedEmail,
          cleanFullName,
          role
        )
      }

      if (!currentUser) {
        throw new Error(
          'Your account could not be authenticated. Please try again.'
        )
      }

      await completeCanonicalInvitation({
        token,
        fullName: cleanFullName,
      })

      // Invitation acceptance is the authoritative first-entry event for
      // PMOCorex onboarding. Do not reset users who have already started,
      // completed or skipped the guide (for example, when accepting another
      // project invitation later).
      const currentOnboardingState = String(
        currentUser.user_metadata?.pmocorex_onboarding_v2 || ''
      )

      if (!currentOnboardingState) {
        const { error: onboardingError } = await supabase.auth.updateUser({
          data: {
            pmocorex_onboarding_v2: 'pending',
            pmocorex_onboarding_required: true,
          },
        })

        if (onboardingError) {
          console.warn(
            '[PMOCorex onboarding] Invitation was accepted but onboarding could not be marked as pending:',
            onboardingError
          )
        }
      }

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

  async function switchAccount() {
    setError('')

    const { error: signOutError } = await supabase.auth.signOut()

    if (signOutError) {
      setError(signOutError.message)
      return
    }

    setSignedInUserId(null)
    setSignedInEmail(null)
    setPassword('')
    setConfirmPassword('')
  }

  function goToSignIn() {
    const redirectPath = token
      ? `/accept-invite?token=${encodeURIComponent(token)}`
      : '/projects'

    navigate(
      `/login?redirect=${encodeURIComponent(redirectPath)}`
    )
  }

  const inviteScope = getInviteScope()
  const projectCount = getProjectIds().length
  const roleLabel = cleanRole(invite?.role) || 'team member'
  const isExternal = EXTERNAL_ROLES.includes(roleLabel)

  const invitedEmail = invite?.email?.trim().toLowerCase() || ''
  const signedInWithWrongAccount =
    Boolean(signedInEmail) &&
    Boolean(invitedEmail) &&
    signedInEmail !== invitedEmail

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
                    : '/projects'
                )
              }
              className="btn-gold btn w-full justify-center mt-6"
            >
              Enter PMOCorex
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
                  {roleLabel.replace(/_/g, ' ')}
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

            {signedInUserId && !signedInWithWrongAccount && invite && (
              <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-300">
                You are already signed in. Confirm your name and activate
                the invitation.
              </div>
            )}

            {!signedInUserId && invite && (
              <div className="mt-4 rounded-xl border border-sky-400/20 bg-sky-400/10 p-3 text-sm text-sky-300">
                Create your PMOCorex account and password to accept this
                invitation.
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

            {signedInWithWrongAccount && (
              <button
                type="button"
                onClick={() => void switchAccount()}
                className="mt-3 w-full rounded-xl border border-[#1d4f70] px-4 py-3 text-sm font-semibold text-[#1d4f70] flex items-center justify-center gap-2"
              >
                <LogOut size={16} />
                Sign out and switch account
              </button>
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
                  disabled={submitting || signedInWithWrongAccount}
                  className="btn-gold btn w-full justify-center mt-6"
                >
                  {submitting
                    ? 'Activating…'
                    : signedInUserId
                      ? 'Accept Invitation'
                      : 'Create Account and Accept Invitation'}
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
                  onClick={goToSignIn}
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

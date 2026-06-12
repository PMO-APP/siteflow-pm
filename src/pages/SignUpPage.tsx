import { useState } from 'react'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function SignUpPage() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const cleanEmail = email.trim().toLowerCase()
      const cleanName = name.trim()
      const cleanOrgName = organizationName.trim()

      if (!cleanName) throw new Error('Full name is required.')
      if (!cleanOrgName) throw new Error('Organization name is required.')
      if (!cleanEmail) throw new Error('Email is required.')
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters.')
      }

      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: cleanName,
              role: 'workspace_admin',
              organization_name: cleanOrgName,
            },
            emailRedirectTo: `${window.location.origin}/Login`,
          },
        })

      if (signUpError) throw signUpError

      const userId = signUpData.user?.id

      if (!userId) {
        throw new Error('Account created, but user ID was not returned.')
      }

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        email: cleanEmail,
        full_name: cleanName,
        role: 'workspace_admin',
        updated_at: new Date().toISOString(),
      })

      if (profileError) throw profileError

      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: cleanOrgName,
          created_by: userId,
        })
        .select()
        .single()

      if (orgError) throw orgError

      const { error: membershipError } = await supabase
        .from('memberships')
        .insert({
          user_id: userId,
          organization_id: organization.id,
          email: cleanEmail,
          full_name: cleanName,
          role: 'workspace_admin',
          access_scope: 'workspace',
          project_id: null,
          portfolio_id: null,
        })

      if (membershipError) throw membershipError

      setName('')
      setOrganizationName('')
      setEmail('')
      setPassword('')

      setSuccess(
        'Workspace created successfully. Please check your email to verify your account before signing in.'
      )
    } catch (err: any) {
      const msg = err.message?.toLowerCase() || ''

      if (msg.includes('already')) {
        setError('You already have an account. Please sign in.')
      } else {
        setError(err.message || 'Unable to create account.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0c1014] text-white grid lg:grid-cols-2 overflow-hidden">
      <div className="relative hidden lg:flex flex-col justify-between p-12 border-r border-white/[0.06] bg-gradient-to-br from-[#101820] via-[#121b24] to-[#0c1014]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(196,158,72,0.20),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(69,153,212,0.12),transparent_35%)]" />

        <div className="relative z-10">
          <div className="text-3xl font-black text-[#c49e48]">
            PMOCorex
          </div>
          <div className="text-xs uppercase tracking-[0.35em] text-slate-500 mt-1">
            Portfolio Control System
          </div>
        </div>

        <div className="relative z-10 max-w-xl">
          <div className="inline-flex mb-5 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
            Start your project command centre
          </div>

          <h1 className="text-5xl font-black leading-tight">
            Build a smarter control layer for project delivery.
          </h1>

          <p className="mt-5 text-slate-400 text-lg leading-relaxed">
            Create your PMOCorex workspace and manage schedules, risks,
            approvals, snags, procurement, documents, and reports from one place.
          </p>
        </div>

        <div className="relative z-10 text-xs text-slate-500">
          Designed for teams that need clarity before issues become delays.
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-[#c49e48] mb-6"
          >
            <ArrowLeft size={15} />
            Back to home
          </button>

          <div className="card relative overflow-hidden">
            <div className="gold-bar" />

            <div className="p-7">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-[#ede8de]">
                  Create workspace
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Set up your organization and administrator account.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="form-label">Full Name</label>
                  <input
                    className="form-control"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your full name"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Organization Name</label>
                  <input
                    className="form-control"
                    type="text"
                    value={organizationName}
                    onChange={e => setOrganizationName(e.target.value)}
                    placeholder="e.g. Mixta Africa"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Email</label>
                  <input
                    className="form-control"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Password</label>

                  <div className="relative">
                    <input
                      className="form-control pr-10"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Create a secure password"
                      required
                      minLength={8}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-[#6e7d8c] hover:text-white"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-gold btn w-full justify-center mt-2 py-3"
                >
                  {loading ? 'Creating workspace…' : 'Create Workspace'}
                </button>
              </form>

              <div className="mt-6 text-center text-xs text-slate-500">
                Already have an account?{' '}
                <button
                  onClick={() => navigate('/Login')}
                  className="text-[#c49e48] hover:underline"
                >
                  Sign in
                </button>
              </div>
            </div>
          </div>

          <div className="text-center mt-5 text-[10px] text-[#6e7d8c]">
            ©️ PMOCorex. Built for project delivery intelligence.
          </div>
        </div>
      </div>
    </div>
  )
}

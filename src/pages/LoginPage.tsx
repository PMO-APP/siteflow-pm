import { useEffect, useState } from 'react'
import { Eye, EyeOff, ShieldCheck, BarChart3, ClipboardCheck } from 'lucide-react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const { user } = useAuthStore()
  const [searchParams] = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] =
    useState<'login' | 'signup'>(
      searchParams.get('mode') === 'signup'
        ? 'signup'
        : 'login'
    )
  const [name, setName] = useState('')
  const [success, setSuccess] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const savedEmail = localStorage.getItem('savedEmail')
    const savedPassword = localStorage.getItem('savedPassword')

    if (savedEmail) setEmail(savedEmail)

    if (savedPassword) {
      setPassword(savedPassword)
      setRememberMe(true)
    }
  }, [])

  if (user) return <Navigate to="/projects" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo:
              'https://siteflow-pm-n8fp-2q49fgxpq-ebi-bio-ibogomos-projects.vercel.app/login',
          },
        })

        if (error) throw error

        setName('')
        setEmail('')
        setPassword('')

        setSuccess(
          'Account created successfully. Please check your email to verify your account.'
        )
      } else {
        const { error } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          })

        if (error) throw error

        localStorage.setItem('savedEmail', email)

        if (rememberMe) {
          localStorage.setItem('savedPassword', password)
        } else {
          localStorage.removeItem('savedPassword')
        }

        localStorage.removeItem('projectId')
        localStorage.removeItem('projectName')

        window.location.href = '/projects'
      }
    } catch (err: any) {
      const msg = err.message?.toLowerCase() || ''

      if (msg.includes('invalid')) {
        setError('Incorrect email or password.')
      } else if (msg.includes('already')) {
        setError('You already have an account. Please sign in.')
      } else if (msg.includes('confirm')) {
        setError('Please verify your email first.')
      } else {
        setError(err.message || 'Unable to continue.')
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
            Built for project delivery teams
          </div>

          <h1 className="text-5xl font-black leading-tight">
            Control delivery before delays control you.
          </h1>

          <p className="mt-5 text-slate-400 text-lg leading-relaxed">
            Manage schedules, risks, approvals, procurement, snags,
            financials, and executive reporting from one portfolio command centre.
          </p>

          <div className="grid grid-cols-3 gap-4 mt-8">
            {[
              ['Risk Control', ShieldCheck],
              ['Exec Reports', BarChart3],
              ['Quality Closeout', ClipboardCheck],
            ].map(([label, Icon]: any) => (
              <div
                key={label}
                className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4"
              >
                <Icon size={18} className="text-[#c49e48] mb-3" />
                <div className="text-sm font-semibold">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-500">
          Built for construction, real estate, and PMO-led delivery teams.
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="text-4xl font-black text-[#c49e48]">
              PMOCorex
            </div>
            <div className="text-slate-500 text-sm mt-1">
              The Portfolio Control System for Project Delivery
            </div>
          </div>

          <div className="card relative overflow-hidden">
            <div className="gold-bar" />

            <div className="p-7">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-[#ede8de]">
                  {mode === 'login'
                    ? 'Welcome back'
                    : 'Create your account'}
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  {mode === 'login'
                    ? 'Sign in to continue to your project hub.'
                    : 'Start building your project delivery command centre.'}
                </p>
              </div>

              <div className="grid grid-cols-2 bg-white/[0.04] rounded-lg p-1 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login')
                    setError('')
                    setSuccess('')
                  }}
                  className={`py-2 rounded-md text-sm transition ${
                    mode === 'login'
                      ? 'bg-[#c49e48] text-black font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('signup')
                    setError('')
                    setSuccess('')
                  }}
                  className={`py-2 rounded-md text-sm transition ${
                    mode === 'signup'
                      ? 'bg-[#c49e48] text-black font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
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
                {mode === 'signup' && (
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
                )}

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
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-[#6e7d8c] hover:text-white"
                    >
                      {showPassword ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                </div>

                {mode === 'login' && (
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={() => setRememberMe(!rememberMe)}
                      />
                      <span>Remember me</span>
                    </label>

                    <button
                      type="button"
                      className="text-[#c49e48] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-gold btn w-full justify-center mt-2 py-3"
                >
                  {loading
                    ? 'Please wait…'
                    : mode === 'login'
                    ? 'Sign In'
                    : 'Create Account'}
                </button>
              </form>

              <div className="mt-6 text-center text-xs text-slate-500">
                {mode === 'login'
                  ? 'New to PMOCorex? '
                  : 'Already have an account? '}

                <button
                  onClick={() => {
                    setMode(mode === 'login' ? 'signup' : 'login')
                    setError('')
                    setSuccess('')
                  }}
                  className="text-[#c49e48] hover:underline"
                >
                  {mode === 'login'
                    ? 'Create an account'
                    : 'Sign in instead'}
                </button>
              </div>
            </div>
          </div>

          <div className="text-center mt-5 text-[10px] text-[#6e7d8c]">
            © PMOCorex. Built for project delivery intelligence.
          </div>
        </div>
      </div>
    </div>
  )
}

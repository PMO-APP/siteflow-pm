import { useEffect, useState } from 'react'
import { Eye, EyeOff, ArrowLeft, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const savedEmail = localStorage.getItem('savedEmail')
    if (savedEmail) setEmail(savedEmail)
  }, [])

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  setLoading(true)
  setError('')

  try {
    const cleanEmail = email.toLowerCase().trim()

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })

    if (error) throw error
    if (!data.user) throw new Error('Unable to sign in.')

    localStorage.setItem('savedEmail', cleanEmail)

    localStorage.removeItem('projectId')
    localStorage.removeItem('projectName')
    localStorage.removeItem('organizationId')
    localStorage.removeItem('portfolioId')

    window.location.assign('/projects')
  } catch (err: any) {
    const msg = err.message?.toLowerCase() || ''

    if (msg.includes('invalid')) {
      setError('Incorrect email or password.')
    } else if (msg.includes('confirm')) {
      setError('Please verify your email first.')
    } else {
      setError(err.message || 'Unable to sign in.')
    }

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
            Authorized Access
          </div>

          <h1 className="text-5xl font-black leading-tight">
            Continue controlling delivery with confidence.
          </h1>

          <p className="mt-5 text-slate-400 text-lg leading-relaxed">
            Access your project hub, review active risks, track approvals,
            manage schedules, and keep portfolio delivery under control.
          </p>
        </div>

        <div className="relative z-10 text-xs text-slate-500">
          Built for construction, real estate, and PMO-led delivery teams.
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
                  Secure sign in
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Authorized PMOCorex users only.
                </p>
              </div>

              <div className="mb-4 p-3 rounded-md bg-[#c49e48]/10 border border-[#c49e48]/20 text-[#c49e48] text-sm flex gap-2">
                <ShieldCheck size={16} className="mt-0.5 flex-shrink-0" />
                <span>
                  Access is restricted to approved workspace members.
                </span>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
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
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-400">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                  />
                  Remember me
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-gold btn w-full justify-center mt-2 py-3"
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>

              <div className="mt-6 text-center text-xs text-slate-500">
                No public registration. Access is managed by the administrator.
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

import { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const { user } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [success, setSuccess] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
const [showPassword, setShowPassword] = useState(false)
  useEffect(() => {
  const savedEmail =
    localStorage.getItem('savedEmail')

  const savedPassword =
    localStorage.getItem('savedPassword')

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

      localStorage.setItem(
  'savedEmail',
  email
)

if (rememberMe) {
  localStorage.setItem(
    'savedPassword',
    password
  )
} else {
  localStorage.removeItem(
    'savedPassword'
  )
}

localStorage.removeItem('projectId')
localStorage.removeItem('projectName')

window.location.href = '/projects'
    }
  } catch (err: any) {
    const msg =
  err.message?.toLowerCase() || ''

if (msg.includes('invalid')) {
  setError(
    'Incorrect email or password.'
  )
} else if (
  msg.includes('already')
) {
  setError(
    'You already have an account. Please sign in.'
  )
} else if (
  msg.includes('confirm')
) {
  setError(
    'Please verify your email first.'
  )
} else {
  setError(
    err.message ||
      'Unable to continue.'
  )
}
  } finally {
    setLoading(false)
  }
}

  return (
    <div className="h-full flex items-center justify-center bg-[#0c1014] p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
       <div className="text-center mb-8">
  <div className="font-display text-4xl font-bold text-[#c49e48] mb-1">
    PMOCorex
  </div>

  <div className="text-[#6e7d8c] text-sm">
    The Portfolio Control System for Project Delivery
  </div>
</div>

        {/* Card */}
        <div className="card relative">
          <div className="gold-bar" />
          <div className="p-6">
            <h2 className="font-display text-xl font-semibold text-[#ede8de] mb-5">
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </h2>

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
  <label className="form-label">
    Password
  </label>

  <div className="relative">
    <input
      className="form-control pr-10"
      type={
        showPassword
          ? 'text'
          : 'password'
      }
      value={password}
      onChange={e =>
        setPassword(
          e.target.value
        )
      }
      placeholder="••••••••"
      required
      minLength={6}
    />

    <button
      type="button"
      onClick={() =>
        setShowPassword(
          !showPassword
        )
      }
      className="absolute right-3 top-3 text-[#6e7d8c]"
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
  <div className="flex items-center gap-2 text-sm text-slate-400">
    <input
      type="checkbox"
      checked={rememberMe}
      onChange={() =>
        setRememberMe(!rememberMe)
      }
    />
    <span>
      Remember me
    </span>
  </div>
)}
              <button
                type="submit"
                disabled={loading}
                className="btn-gold btn w-full justify-center mt-2"
              >
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
               onClick={() => {
  setError('')
  setSuccess('')

  const nextMode =
    mode === 'login'
      ? 'signup'
      : 'login'

  setMode(nextMode)

  if (nextMode === 'signup') {
    setName('')
    setEmail('')
    setPassword('')
    setRememberMe(false)
  } else {
    const savedEmail =
      localStorage.getItem('savedEmail')

    const savedPassword =
      localStorage.getItem('savedPassword')

    setEmail(savedEmail || '')
    setPassword(savedPassword || '')
  }
}}
                className="text-[12px] text-[#6e7d8c] hover:text-[#c49e48] transition-colors"
              >
                {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-4 text-[10px] text-[#6e7d8c]">
          Developed by E.B.I
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const hasMinLength = password.length >= 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)

  async function updatePassword() {
    setError('')

    if (!hasMinLength || !hasUppercase || !hasNumber) {
      setError('Password does not meet the requirements.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)

    setTimeout(() => {
      navigate('/mixta-admin-login')
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-[#0c1014] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-3xl font-black text-[#c49e48]">
            PMOCorex
          </div>

          <div className="text-xs uppercase tracking-[0.35em] text-slate-500 mt-1">
            Portfolio Control System
          </div>
        </div>

        <div className="card p-8 text-center">
          {success ? (
            <>
              <CheckCircle
                size={46}
                className="text-emerald-400 mx-auto mb-4"
              />

              <h1 className="text-2xl font-bold text-[#ede8de]">
                Password Updated Successfully
              </h1>

              <p className="text-[#6e7d8c] mt-3">
                Your PMOCorex password has been changed.
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
                PMOCorex Password Reset
              </div>

              <h1 className="text-2xl font-bold text-[#ede8de]">
                Create new password
              </h1>

              <p className="text-[#6e7d8c] mt-3">
                Enter and confirm your new password below.
              </p>

              {error && (
                <div className="mt-4 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-left">
                  {error}
                </div>
              )}

              <div className="space-y-4 mt-6 text-left">
                <div>
                  <label className="form-label">New Password</label>

                  <div className="relative">
                    <input
                      className="form-control pr-10"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create new password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6e7d8c] hover:text-white"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <div className="mt-3 space-y-1 text-xs">
                    <Requirement passed={hasMinLength} text="8+ characters" />
                    <Requirement passed={hasUppercase} text="1 uppercase letter" />
                    <Requirement passed={hasNumber} text="1 number" />
                  </div>
                </div>

                <div>
                  <label className="form-label">Confirm Password</label>

                  <div className="relative">
                    <input
                      className="form-control pr-10"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6e7d8c] hover:text-white"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={updatePassword}
                disabled={loading}
                className="btn-gold btn w-full justify-center mt-6"
              >
                {loading ? 'Updating…' : 'Update Password'}
              </button>

              <button
                onClick={() => navigate('/mixta-admin-login')}
                className="btn btn-ghost w-full justify-center mt-4"
              >
                Back to Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Requirement({ passed, text }: { passed: boolean; text: string }) {
  return (
    <div
      className={`flex items-center gap-2 ${
        passed ? 'text-emerald-400' : 'text-[#6e7d8c]'
      }`}
    >
      <span>{passed ? '✓' : '•'}</span>
      <span>{text}</span>
    </div>
  )
}

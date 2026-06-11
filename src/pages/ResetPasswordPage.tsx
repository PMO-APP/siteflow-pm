import { useState } from 'react'
import { Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react'
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

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()

    setError('')

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.')
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
  }

  return (
    <div className="min-h-screen bg-[#0c1014] text-white flex items-center justify-center p-6">
      <div className="card w-full max-w-md p-8">
        {success ? (
          <div className="text-center">
            <CheckCircle size={42} className="text-emerald-400 mx-auto mb-4" />

            <h1 className="text-2xl font-bold text-[#ede8de]">
              Password updated
            </h1>

            <p className="text-[#6e7d8c] mt-3">
              Your password has been changed successfully.
            </p>

            <button
              onClick={() => navigate('/mixta-admin-login')}
              className="btn-gold btn w-full justify-center mt-6"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <>
            <div className="text-center">
              <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
                PMOCorex Password Reset
              </div>

              <h1 className="text-2xl font-bold text-[#ede8de]">
                Create new password
              </h1>

              <p className="text-[#6e7d8c] mt-3 text-sm">
                Enter and confirm your new password below.
              </p>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex gap-2 text-left">
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4 mt-6">
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
                    onClick={() => setShowPassword(current => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6e7d8c] hover:text-[#ede8de]"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
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
                type="submit"
                disabled={loading}
                className="btn-gold btn w-full justify-center mt-2 py-3"
              >
                {loading ? 'Updating…' : 'Update Password'}
              </button>
            </form>

            <button
              onClick={() => navigate('/mixta-admin-login')}
              className="btn-ghost btn w-full justify-center mt-4"
            >
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  )
}

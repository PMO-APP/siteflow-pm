import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { resolveCanonicalLoginPath } from '@/auth/canonicalAuthService'

function LoginBrand() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-[12px] bg-[#173f5f]">
        <span className="absolute inset-x-0 top-0 h-[3px] bg-[#08B5A6]" />
        <svg viewBox="0 0 40 40" className="h-7 w-7" aria-hidden="true">
          <path d="M8 29V11h10.5c5.5 0 9 3.2 9 8.2 0 5.1-3.5 8.3-9 8.3h-4.2V29H8Zm6.3-7h3.8c2 0 3.2-1 3.2-2.8 0-1.7-1.2-2.7-3.2-2.7h-3.8V22Z" fill="white" />
          <path d="M27.8 25.4 32 29.6" stroke="#08B5A6" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      </div>
      <div className="leading-none">
        <div className="text-[17px] font-extrabold tracking-[-0.04em] text-[#173f5f]">PMOCorex</div>
        <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.19em] text-[#71838d]">Project delivery control</div>
      </div>
    </div>
  )
}

type PublicBranding = {
  workspace_name: string
  product_name: string
  product_tagline: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
  favicon_url: string | null
  login_background_url: string | null
  login_headline: string | null
  login_subheadline: string | null
  hide_platform_brand: boolean
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [publicBranding, setPublicBranding] = useState<PublicBranding | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get('workspace')
    if (!slug) return
    supabase.rpc('get_public_workspace_branding', { workspace_slug: slug })
      .then(({ data, error }) => {
        if (error || !data?.[0]) return
        const brand = data[0] as PublicBranding
        setPublicBranding(brand)
        document.documentElement.style.setProperty('--workspace-primary', brand.primary_color)
        document.documentElement.style.setProperty('--workspace-secondary', brand.secondary_color)
        document.title = `${brand.workspace_name} | ${brand.product_name}`
        if (brand.favicon_url) {
          let favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement | null
          if (!favicon) {
            favicon = document.createElement('link')
            favicon.rel = 'icon'
            document.head.appendChild(favicon)
          }
          favicon.href = brand.favicon_url
        }
      })
  }, [])

  useEffect(() => {
    const savedEmail = localStorage.getItem('savedEmail')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }
  }, [])


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setNotice('')

    try {
      const cleanEmail = email.toLowerCase().trim()
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
      if (error) {
        setError(error.message)
        return
      }

      if (rememberMe) localStorage.setItem('savedEmail', cleanEmail)
      else localStorage.removeItem('savedEmail')

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) {
        setError(userError.message)
        return
      }
      if (!user) {
        navigate('/projects')
        return
      }
      navigate(await resolveCanonicalLoginPath(user.id))
    } catch (err: any) {
      setError(err?.message || 'Unable to sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    setError('')
    setNotice('')
    const cleanEmail = email.toLowerCase().trim()
    if (!cleanEmail) {
      setError('Enter your email address first, then select Forgot password.')
      return
    }

    setResetLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) setError(error.message)
    else setNotice('A password reset link has been sent to your email.')
    setResetLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#f7f8f6] text-[#183044]">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
        <section
          className="relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16"
          style={{
            backgroundColor: publicBranding?.primary_color || '#173f5f',
            backgroundImage: publicBranding?.login_background_url
              ? `linear-gradient(rgba(7,28,45,.72),rgba(7,28,45,.82)),url(${publicBranding.login_background_url})`
              : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,.055)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.055)_1px,transparent_1px)] bg-[size:34px_34px]" />
          <div className="absolute -bottom-28 -right-28 h-96 w-96 rounded-full border border-white/10" />
          <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full border border-[#08B5A6]/55" />

          <div className="relative flex items-center gap-3">
            {publicBranding?.logo_url ? (
              <img src={publicBranding.logo_url} alt={`${publicBranding.product_name} logo`} className="h-11 max-w-40 object-contain" />
            ) : (
              <div className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-[13px] bg-white font-black" style={{color:publicBranding?.primary_color||'#173f5f'}}>
                {(publicBranding?.product_name || 'PMOCorex').slice(0,1)}
              </div>
            )}
            <div><div className="text-lg font-extrabold tracking-[-.04em]">{publicBranding?.product_name || 'PMOCorex'}</div><div className="mt-1 text-[9px] font-bold uppercase tracking-[.2em] text-white/50">{publicBranding?.product_tagline || 'Project delivery control'}</div></div>
          </div>

          <div className="relative max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-3 py-1.5 text-xs font-bold text-white/75"><LockKeyhole size={14} className="text-[#ffad89]" /> Authorised workspace access</div>
            <h1 className="text-5xl font-extrabold leading-[1.05] tracking-[-.055em] xl:text-6xl">{publicBranding?.login_headline || 'Return to the work that moves delivery forward.'}</h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/65">{publicBranding?.login_subheadline || 'Review your portfolio position, respond to project risks and keep every control area connected.'}</p>
            <div className="mt-9 grid gap-3">
              {['One view across active projects', 'Role-based access for every delivery team', 'Live controls, decisions and reporting'].map(item => (
                <div key={item} className="flex items-center gap-3 text-sm font-semibold text-white/78"><CheckCircle2 size={17} className="text-[#ffad89]" />{item}</div>
              ))}
            </div>
          </div>

          <div className="relative text-xs text-white/40">{publicBranding?.hide_platform_brand ? publicBranding.workspace_name : `${publicBranding?.product_name || 'PMOCorex'} · Built for disciplined project delivery`}</div>
        </section>

        <section className="relative flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(23,63,95,.035)_1px,transparent_1px),linear-gradient(rgba(23,63,95,.035)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
          <div className="relative w-full max-w-[470px]">
            <div className="mb-10 flex items-center justify-between lg:hidden">
              <LoginBrand />
            </div>

            <button onClick={() => navigate('/')} className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-[#627985] transition hover:text-[#173f5f]"><ArrowLeft size={16} /> Back to PMOCorex</button>

            <div className="rounded-[22px] border border-[#d6e0e3] bg-white p-6 shadow-[0_22px_60px_rgba(21,55,73,.10)] sm:p-9">
              <div className="mb-7">
                <div className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-[#eaf1f4] text-[#2f6f91]"><ShieldCheck size={21} /></div>
                <h2 className="text-3xl font-extrabold tracking-[-.045em] text-[#173f5f]">Sign in to your workspace</h2>
                <p className="mt-2 text-sm leading-6 text-[#6b7f89]">Access is available to approved PMOCorex users only.</p>
              </div>

              {error && <div className="mb-5 rounded-xl border border-[#f0c4b2] bg-[#fff5f1] px-4 py-3 text-sm font-semibold text-[#b84f27]">{error}</div>}
              {notice && <div className="mb-5 rounded-xl border border-[#bddbc5] bg-[#f0f8f2] px-4 py-3 text-sm font-semibold text-[#347a4a]">{notice}</div>}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-xs font-extrabold uppercase tracking-[.11em] text-[#526975]">Work email</label>
                  <input className="h-12 w-full rounded-xl border border-[#cdd9de] bg-[#fbfcfc] px-4 text-sm text-[#173f5f] outline-none transition placeholder:text-[#9aa9b0] focus:border-[#2f6f91] focus:bg-white focus:ring-4 focus:ring-[#2f6f91]/10" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between"><label className="block text-xs font-extrabold uppercase tracking-[.11em] text-[#526975]">Password</label><button type="button" onClick={handleForgotPassword} disabled={resetLoading} className="text-xs font-bold text-[#2f6f91] hover:underline disabled:opacity-60">{resetLoading ? 'Sending…' : 'Forgot password?'}</button></div>
                  <div className="relative">
                    <input className="h-12 w-full rounded-xl border border-[#cdd9de] bg-[#fbfcfc] px-4 pr-12 text-sm text-[#173f5f] outline-none transition placeholder:text-[#9aa9b0] focus:border-[#2f6f91] focus:bg-white focus:ring-4 focus:ring-[#2f6f91]/10" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required minLength={6} />
                    <button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7a8c95] hover:text-[#173f5f]" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-[#607580]">
                  <input type="checkbox" checked={rememberMe} onChange={() => setRememberMe(value => !value)} className="h-4 w-4 rounded border-[#bdcbd1] accent-[#173f5f]" /> Remember my email
                </label>

                <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center rounded-xl bg-[#173f5f] text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(23,63,95,.18)] transition hover:-translate-y-0.5 hover:bg-[#0f334e] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0">{loading ? 'Signing in…' : 'Sign in'}</button>
              </form>

              <div className="mt-7 border-t border-[#e1e8ea] pt-5 text-center text-xs leading-5 text-[#7a8c95]">There is no public registration. New workspaces and users are onboarded by invitation.</div>
            </div>

            <div className="mt-6 text-center text-xs text-[#84949b]">Need access? Contact your PMOCorex workspace administrator.</div>
          </div>
        </section>
      </div>
    </div>
  )
}

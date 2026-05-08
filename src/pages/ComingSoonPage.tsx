import { Lock, Clock3 } from 'lucide-react'

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-[#0c1014] text-white flex items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#c49e48]/20 bg-[#c49e48]/10 text-[#c49e48] text-sm mb-6">
          <Clock3 size={16} />
          Private Beta
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-[#ede8de]">
          PMOCorex
        </h1>

        <p className="mt-4 text-lg md:text-xl text-slate-400 leading-relaxed">
          Enterprise portfolio control platform for construction and real estate delivery teams.
        </p>

        <div className="mt-10 p-6 rounded-2xl border border-white/[0.06] bg-white/[0.03]">
          <div className="flex items-center justify-center gap-2 text-[#c49e48] mb-3">
            <Lock size={18} />
            <span className="font-semibold">
              Access Restricted
            </span>
          </div>

          <p className="text-slate-400 text-sm leading-relaxed">
            PMOCorex is currently undergoing private testing and internal deployment.
            Access is limited to authorized project teams only.
          </p>
        </div>

        <div className="mt-8 text-xs text-slate-500">
          © PMOCorex · Built for project delivery intelligence
        </div>
      </div>
    </div>
  )
}

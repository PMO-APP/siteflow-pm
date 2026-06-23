import { Wallet } from 'lucide-react'

export default function CostingPage() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#c49e48]/20 bg-gradient-to-br from-[#111820] via-[#162230] to-[#0f151c] p-6 sm:p-8">
        <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
          Cost Control
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-[#ede8de]">
          Costing
        </h1>

        <p className="text-slate-400 mt-3 max-w-2xl">
          Weekly cost reports, payments, contracts, variations and procurement
          updates for PMO executive reporting.
        </p>
      </section>

      <div className="card p-10 text-center">
        <Wallet size={42} className="mx-auto text-[#c49e48] mb-4" />

        <div className="text-xl font-bold text-white">
          Costing Module Ready
        </div>

        <div className="text-slate-500 mt-2">
          Next, we will add the weekly cost report form.
        </div>
      </div>
    </div>
  )
}

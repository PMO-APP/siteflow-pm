import { Check, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'

const plans = [
  {
    name: 'Starter',
    price: '$19',
    desc: 'For small teams managing a few active projects.',
    features: [
      'Up to 3 projects',
      'Project dashboard',
      'Schedule tracking',
      'Risk register',
      'Basic reports',
    ],
  },
  {
    name: 'Professional',
    price: '$49',
    desc: 'For PMO teams managing multiple portfolios.',
    featured: true,
    features: [
      'Unlimited projects',
      'Portfolio workspace',
      'AI insights',
      'Recovery forecast',
      'Approvals and procurement',
      'Executive reporting',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    desc: 'For organizations needing advanced control and governance.',
    features: [
      'Multi-organization setup',
      'Custom roles',
      'Audit trail',
      'Advanced reporting',
      'Dedicated onboarding',
      'Priority support',
    ],
  },
]

export default function PricingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0c1014] text-white px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <PMOCorexLogo />

          <button
            onClick={() => navigate('/signup')}
            className="btn-gold btn"
          >
            Get Started
          </button>
        </div>

        <div className="text-center mt-20">
          <div className="text-xs uppercase tracking-[0.35em] text-[#c49e48]">
            Pricing
          </div>

          <h1 className="text-5xl font-black mt-4">
            Choose the control level your team needs.
          </h1>

          <p className="text-slate-400 mt-4 max-w-2xl mx-auto">
            PMOCorex scales from a single delivery team to a full portfolio PMO.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-14">
          {plans.map(plan => (
            <div
              key={plan.name}
              className={`card p-6 ${
                plan.featured
                  ? 'border-[#c49e48]/40 bg-[#c49e48]/5'
                  : ''
              }`}
            >
              {plan.featured && (
                <div className="inline-flex mb-4 rounded-full bg-[#c49e48]/10 border border-[#c49e48]/20 px-3 py-1 text-xs text-[#c49e48]">
                  Recommended
                </div>
              )}

              <h2 className="text-2xl font-bold">
                {plan.name}
              </h2>

              <div className="mt-4 text-4xl font-black">
                {plan.price}
                {plan.price !== 'Custom' && (
                  <span className="text-sm text-slate-500 font-normal">
                    /month
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-400 mt-3">
                {plan.desc}
              </p>

              <button
                onClick={() => navigate('/signup')}
                className={`btn w-full justify-center mt-6 ${
                  plan.featured ? 'btn-gold' : 'btn-ghost'
                }`}
              >
                Start with {plan.name}
                <ArrowRight size={15} />
              </button>

              <div className="mt-6 space-y-3">
                {plan.features.map(item => (
                  <div key={item} className="flex gap-2 text-sm text-slate-300">
                    <Check size={15} className="text-[#c49e48]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

import { useWorkspace } from '@/workspace/WorkspaceProvider'

const PMOCOREX_NAVY = '#0B2A3C'
const PMOCOREX_TEAL = '#08B5A6'

export function PMOCorexLogo({
  size = 34,
  showText = true,
  tone = 'light',
}: {
  size?: number
  showText?: boolean
  tone?: 'light' | 'dark'
}) {
  const { activeWorkspace } = useWorkspace()
  const branding = activeWorkspace?.branding
  const configuredName = (branding?.productName || 'PMOCorex').trim()
  const isPmocorexBrand = /^(pmo\s*)?corex$/i.test(configuredName) || /^pmocorex$/i.test(configuredName)
  const productName = isPmocorexBrand ? 'PMOCorex' : configuredName
  const productTagline = isPmocorexBrand
    ? 'Portfolio Control Centre'
    : (branding?.productTagline || 'Project delivery control')
  const primary = isPmocorexBrand ? PMOCOREX_NAVY : (branding?.primaryColor || PMOCOREX_NAVY)
  const secondary = isPmocorexBrand ? PMOCOREX_TEAL : (branding?.secondaryColor || PMOCOREX_TEAL)
  const customPrimaryText = tone === 'light' ? 'text-[#173f5f]' : 'text-white'
  const secondaryText = tone === 'light' ? 'text-[#71838d]' : 'text-white/55'

  return (
    <div className="flex items-center gap-3">
      {branding?.logoUrl ? (
        <img
          src={branding.logoUrl}
          alt={`${productName} logo`}
          className="shrink-0 object-contain"
          style={{ width: Math.max(size, 34), height: size }}
        />
      ) : isPmocorexBrand ? (
        <img
          src="/brand/pmocorex-mark.svg"
          alt="PMOCorex logo"
          className="shrink-0 object-contain"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="relative grid shrink-0 place-items-center overflow-hidden rounded-[13px] shadow-[0_8px_22px_rgba(11,42,60,.14)]"
          style={{ width: size, height: size, backgroundColor: primary }}
        >
          <span className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: secondary }} />
          <span className="text-sm font-black text-white">{productName.slice(0,1).toUpperCase()}</span>
        </div>
      )}

      {showText && (
        <div className="leading-tight">
          {isPmocorexBrand ? (
            <div className="text-sm font-extrabold tracking-[-.035em]">
              <span style={{ color: tone === 'dark' ? '#FFFFFF' : PMOCOREX_NAVY }}>PMO</span>
              <span style={{ color: PMOCOREX_TEAL }}>Corex</span>
            </div>
          ) : (
            <div className={`text-sm font-extrabold tracking-[-.035em] ${customPrimaryText}`}>{productName}</div>
          )}
          <div className={`mt-1 text-[9px] font-bold uppercase tracking-[.19em] ${secondaryText}`}>
            {productTagline}
          </div>
        </div>
      )}
    </div>
  )
}

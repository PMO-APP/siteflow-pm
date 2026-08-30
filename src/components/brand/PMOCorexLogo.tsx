
import { useWorkspace } from '@/workspace/WorkspaceProvider'

export function PMOCorexLogo({
  size = 34,
  showText = true,
  tone = 'dark',
}: {
  size?: number
  showText?: boolean
  tone?: 'light' | 'dark'
}) {
  const { activeWorkspace } = useWorkspace()
  const branding = activeWorkspace?.branding
  const productName = branding?.productName || 'PMOCorex'
  const productTagline = branding?.productTagline || 'Project delivery control'
  const primary = branding?.primaryColor || '#0B2A3C'
  const secondary = branding?.secondaryColor || '#08B5A6'
  const primaryText = tone === 'light' ? 'text-[#173f5f]' : 'text-white'
  const secondaryText = tone === 'light' ? 'text-[#71838d]' : 'text-white/50'

  return (
    <div className="flex items-center gap-3">
      {branding?.logoUrl ? (
        <img
          src={branding.logoUrl}
          alt={`${productName} logo`}
          className="shrink-0 object-contain"
          style={{ width: Math.max(size, 34), height: size }}
        />
      ) : (
        <div
          className="relative grid shrink-0 place-items-center overflow-hidden rounded-[13px] shadow-[0_8px_22px_rgba(23,63,95,.14)]"
          style={{ width: size, height: size, backgroundColor: primary }}
        >
          <span className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: secondary }} />
          <span className="text-sm font-black text-white">{productName.slice(0,1).toUpperCase()}</span>
        </div>
      )}

      {showText && (
        <div className="leading-tight">
          <div className={`text-sm font-extrabold tracking-[-.035em] ${primaryText}`}>{productName}</div>
          <div className={`mt-1 text-[9px] font-bold uppercase tracking-[.19em] ${secondaryText}`}>
            {productTagline}
          </div>
        </div>
      )}
    </div>
  )
}

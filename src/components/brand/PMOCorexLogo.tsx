import { useWorkspace } from '@/workspace/WorkspaceProvider'

export function PMOCorexLogo({
  size = 34,
  showText = true,
  showTagline = false,
  iconOnly = false,
  inverse = false,
  tone = 'dark',
  className = '',
}: {
  size?: number
  showText?: boolean
  showTagline?: boolean
  iconOnly?: boolean
  inverse?: boolean
  tone?: 'light' | 'dark'
  className?: string
}) {
  const { activeWorkspace } = useWorkspace()
  const branding = activeWorkspace?.branding
  const productName = branding?.productName || 'PMOCorex'
  const productTagline = branding?.productTagline || 'Portfolio Control Centre'
  const isInverse = inverse || tone === 'dark'
  const wordColor = isInverse ? '#FFFFFF' : '#0B2A3C'
  const mutedColor = isInverse ? 'rgba(255,255,255,.64)' : '#506776'

  if (branding?.logoUrl) {
    return (
      <div className={`inline-flex items-center gap-3 ${className}`}>
        <img src={branding.logoUrl} alt={`${productName} logo`} className="shrink-0 object-contain" style={{ width: Math.max(size, 34), height: size }} />
        {showText && !iconOnly && (
          <div className="leading-tight">
            <div className="text-sm font-extrabold tracking-[-.035em]" style={{ color: wordColor }}>{productName}</div>
            {(showTagline || branding?.productTagline) && <div className="mt-1 text-[9px] font-bold uppercase tracking-[.19em]" style={{ color: mutedColor }}>{productTagline}</div>}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center ${className}`} style={{ gap: Math.max(8, size * .22) }} aria-label="PMOCorex — Portfolio Control Centre">
      <img src="/brand/pmocorex-mark.svg" alt="" aria-hidden="true" style={{ width: size, height: size, flex: '0 0 auto' }} />
      {showText && !iconOnly && (
        <div className="min-w-0 leading-none">
          <div style={{ whiteSpace:'nowrap', fontWeight:800, fontSize:Math.max(18,size*.62), letterSpacing:'-.045em' }}>
            <span style={{ color: wordColor }}>PMO</span><span style={{ color:'#08B5A6' }}>Corex</span>
          </div>
          {showTagline && <div style={{ marginTop:Math.max(4,size*.08), color:mutedColor, fontSize:Math.max(7,size*.18), fontWeight:600, letterSpacing:'.22em', textTransform:'uppercase', whiteSpace:'nowrap' }}>Portfolio Control Centre</div>}
        </div>
      )}
    </div>
  )
}

export default PMOCorexLogo

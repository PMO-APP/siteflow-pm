export function PMOCorexLogo({
  size = 36,
  showText = true,
}: {
  size?: number
  showText?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 64 64">
        <defs>
          <linearGradient id="pmocorexGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e3c06a" />
            <stop offset="100%" stopColor="#c49e48" />
          </linearGradient>
        </defs>

        <rect width="64" height="64" rx="14" fill="#0c1014" />
        <circle
          cx="32"
          cy="32"
          r="20"
          stroke="url(#pmocorexGold)"
          strokeWidth="2"
          fill="none"
          opacity="0.45"
        />
        <circle cx="32" cy="32" r="14" fill="url(#pmocorexGold)" />
        <circle cx="32" cy="32" r="5" fill="#0c1014" />
      </svg>

      {showText && (
        <div className="leading-tight">
          <div className="text-white font-semibold text-sm">
            PMOCorex
          </div>
          <div className="text-[9px] text-slate-500 tracking-widest">
            CONTROL SYSTEM
          </div>
        </div>
      )}
    </div>
  )
}

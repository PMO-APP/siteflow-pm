export function PMOCorexLogo({
  size = 34,
  showText = true,
  tone = 'dark',
}: {
  size?: number
  showText?: boolean
  tone?: 'light' | 'dark'
}) {
  const primaryText = tone === 'light' ? 'text-[#173f5f]' : 'text-white'
  const secondaryText = tone === 'light' ? 'text-[#71838d]' : 'text-white/50'

  return (
    <div className="flex items-center gap-3">
      <div
        className="relative grid shrink-0 place-items-center overflow-hidden rounded-[13px] bg-[#173f5f] shadow-[0_8px_22px_rgba(23,63,95,.14)]"
        style={{ width: size, height: size }}
      >
        <span className="absolute inset-x-0 top-0 h-[3px] bg-[#ef8354]" />
        <svg viewBox="0 0 40 40" className="h-[64%] w-[64%]" aria-hidden="true">
          <path
            d="M8 29V11h10.5c5.5 0 9 3.2 9 8.2 0 5.1-3.5 8.3-9 8.3h-4.2V29H8Zm6.3-7h3.8c2 0 3.2-1 3.2-2.8 0-1.7-1.2-2.7-3.2-2.7h-3.8V22Z"
            fill="white"
          />
          <path d="M27.8 25.4 32 29.6" stroke="#ef8354" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      </div>

      {showText && (
        <div className="leading-tight">
          <div className={`text-sm font-extrabold tracking-[-.035em] ${primaryText}`}>PMOCorex</div>
          <div className={`mt-1 text-[9px] font-bold uppercase tracking-[.19em] ${secondaryText}`}>
            Project delivery control
          </div>
        </div>
      )}
    </div>
  )
}

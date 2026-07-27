import { AlertTriangle, Archive, CheckCircle2, Info, ShieldAlert, Trash2, X } from 'lucide-react'

export type PMOCorexDialogVariant = 'info' | 'success' | 'warning' | 'danger' | 'archive'

export interface PMOCorexDialogProps {
  open: boolean
  variant?: PMOCorexDialogVariant
  eyebrow?: string
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  showCancel?: boolean
  inputLabel?: string
  inputPlaceholder?: string
  inputValue?: string
  expectedValue?: string
  busy?: boolean
  onInputChange?: (value: string) => void
  onConfirm: () => void | Promise<void>
  onClose: () => void
}

const variantConfig = {
  info: { icon: Info, iconClass: 'bg-[#eaf3f8] text-[#173f5f]', eyebrow: 'PMOCorex notice' },
  success: { icon: CheckCircle2, iconClass: 'bg-[#eaf8f1] text-[#1f8a60]', eyebrow: 'Action completed' },
  warning: { icon: AlertTriangle, iconClass: 'bg-[#fff4ea] text-[#d66a3d]', eyebrow: 'Attention required' },
  danger: { icon: Trash2, iconClass: 'bg-[#fff0ed] text-[#d84f3f]', eyebrow: 'Permanent action' },
  archive: { icon: Archive, iconClass: 'bg-[#edf3f7] text-[#173f5f]', eyebrow: 'Archive project' },
}

export function PMOCorexDialog({
  open,
  variant = 'info',
  eyebrow,
  title,
  message,
  confirmLabel = 'Continue',
  cancelLabel = 'Cancel',
  showCancel = false,
  inputLabel,
  inputPlaceholder,
  inputValue = '',
  expectedValue,
  busy = false,
  onInputChange,
  onConfirm,
  onClose,
}: PMOCorexDialogProps) {
  if (!open) return null

  const config = variantConfig[variant]
  const Icon = config.icon
  const requiresMatch = Boolean(expectedValue)
  const confirmDisabled = busy || (requiresMatch && inputValue.trim() !== expectedValue?.trim())

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#0d2940]/55 px-4 py-8 backdrop-blur-[3px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pmocorex-dialog-title"
        className="w-full max-w-[560px] overflow-hidden rounded-[28px] border border-[#d9e5ec] bg-white shadow-[0_28px_80px_rgba(15,51,78,0.28)]"
      >
        <div className="h-1.5 bg-gradient-to-r from-[#173f5f] via-[#2f7396] to-[#ef8354]" />

        <div className="p-7 sm:p-8">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${config.iconClass}`}>
              <Icon size={23} strokeWidth={1.9} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6f8798]">
                    {eyebrow || config.eyebrow}
                  </p>
                  <h2 id="pmocorex-dialog-title" className="mt-1 text-[25px] font-bold leading-tight text-[#173f5f]">
                    {title}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d9e5ec] text-[#526a7a] transition hover:bg-[#eef4f7] hover:text-[#173f5f] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="whitespace-pre-line text-[15px] leading-7 text-[#526a7a]">{message}</p>
            </div>
          </div>

          {inputLabel && (
            <div className="mt-6 rounded-2xl border border-[#d9e5ec] bg-[#f7fafb] p-4">
              <label className="mb-2 block text-[12px] font-bold uppercase tracking-[0.12em] text-[#536f81]">
                {inputLabel}
              </label>
              <input
                autoFocus
                value={inputValue}
                onChange={event => onInputChange?.(event.target.value)}
                placeholder={inputPlaceholder}
                className="h-12 w-full rounded-xl border border-[#cbdbe5] bg-white px-4 text-[15px] font-medium text-[#173f5f] outline-none transition placeholder:text-[#9aabb6] focus:border-[#ef8354] focus:ring-4 focus:ring-[#ef8354]/10"
              />
              {expectedValue && (
                <p className="mt-2 flex items-center gap-2 text-[12px] text-[#6f8798]">
                  <ShieldAlert size={14} />
                  Enter the exact project name to unlock permanent deletion.
                </p>
              )}
            </div>
          )}

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {showCancel && (
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-[#cbdbe5] bg-white px-5 text-[14px] font-bold text-[#173f5f] transition hover:bg-[#f2f6f8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancelLabel}
              </button>
            )}

            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmDisabled}
              className={`inline-flex h-12 items-center justify-center rounded-xl px-6 text-[14px] font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-45 ${
                variant === 'danger'
                  ? 'bg-[#d84f3f] hover:bg-[#bd3f32]'
                  : variant === 'warning'
                    ? 'bg-[#ef8354] hover:bg-[#db7147]'
                    : 'bg-[#173f5f] hover:bg-[#0f334e]'
              }`}
            >
              {busy ? 'Processing…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

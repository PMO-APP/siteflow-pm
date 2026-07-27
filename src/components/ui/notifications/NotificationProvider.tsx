import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import {
  pmoAlert,
  registerNotificationBridge,
  type AlertOptions,
  type ConfirmOptions,
  type NotificationTone,
  type PromptOptions,
} from '@/lib/notifications'

type DialogState = {
  mode: 'alert' | 'confirm' | 'prompt'
  options: AlertOptions | ConfirmOptions | PromptOptions
  resolve: (value: any) => void
} | null

type ToastItem = AlertOptions & { id: number; duration?: number }

const toneStyle: Record<NotificationTone, { icon: typeof Info; iconBg: string; iconColor: string; button: string }> = {
  success: { icon: CheckCircle2, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', button: 'bg-[#173f5f] hover:bg-[#0f334e]' },
  error: { icon: XCircle, iconBg: 'bg-red-50', iconColor: 'text-red-600', button: 'bg-red-600 hover:bg-red-700' },
  warning: { icon: AlertTriangle, iconBg: 'bg-[#fff2ec]', iconColor: 'text-[#ef8354]', button: 'bg-[#173f5f] hover:bg-[#0f334e]' },
  info: { icon: Info, iconBg: 'bg-[#eef5f8]', iconColor: 'text-[#2f7898]', button: 'bg-[#173f5f] hover:bg-[#0f334e]' },
}

export default function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>(null)
  const [promptValue, setPromptValue] = useState('')
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const toastId = useRef(0)

  const closeDialog = useCallback((value: any) => {
    setDialog(current => {
      current?.resolve(value)
      return null
    })
    setPromptValue('')
  }, [])

  const bridge = useMemo(() => ({
    alert: (options: AlertOptions) => new Promise<void>(resolve => setDialog({ mode: 'alert', options, resolve })),
    confirm: (options: ConfirmOptions) => new Promise<boolean>(resolve => setDialog({ mode: 'confirm', options, resolve })),
    prompt: (options: PromptOptions) => new Promise<string | null>(resolve => {
      setPromptValue(options.initialValue || '')
      setDialog({ mode: 'prompt', options, resolve })
    }),
    toast: (options: AlertOptions & { duration?: number }) => {
      const id = ++toastId.current
      setToasts(current => [...current, { ...options, id }])
      window.setTimeout(() => setToasts(current => current.filter(item => item.id !== id)), options.duration || 4200)
    },
  }), [])

  useEffect(() => {
    registerNotificationBridge(bridge)
    const nativeAlert = window.alert
    window.alert = (message?: any) => { void pmoAlert(String(message ?? '')) }
    return () => {
      registerNotificationBridge(null)
      window.alert = nativeAlert
    }
  }, [bridge])

  const options = dialog?.options
  const tone = (options?.tone || 'info') as NotificationTone
  const style = toneStyle[tone]
  const Icon = style.icon
  const promptOptions = dialog?.mode === 'prompt' ? dialog.options as PromptOptions : null
  const promptDisabled = Boolean(promptOptions?.required && !promptValue.trim())

  return (
    <>
      {children}

      <div className="fixed right-5 top-5 z-[220] flex w-[min(390px,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map(item => {
          const itemTone = item.tone || 'info'
          const itemStyle = toneStyle[itemTone]
          const ToastIcon = itemStyle.icon
          return (
            <div key={item.id} className="overflow-hidden rounded-2xl border border-[#dce7ef] bg-white shadow-[0_22px_60px_rgba(23,63,95,.18)]">
              <div className="h-1 bg-[#ef8354]" />
              <div className="flex gap-3 p-4">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${itemStyle.iconBg} ${itemStyle.iconColor}`}><ToastIcon size={20} /></div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[#173f5f]">{item.title || 'PMOCorex'}</div>
                  <div className="mt-1 text-sm leading-5 text-[#5f7483]">{item.message}</div>
                </div>
                <button onClick={() => setToasts(current => current.filter(toast => toast.id !== item.id))} className="text-[#7a8c99] hover:text-[#173f5f]" aria-label="Dismiss"><X size={18} /></button>
              </div>
            </div>
          )
        })}
      </div>

      {dialog && options && (
        <div className="fixed inset-0 z-[210] grid place-items-center bg-[#102943]/55 p-4 backdrop-blur-[3px]" onMouseDown={event => { if (event.target === event.currentTarget && dialog.mode === 'alert') closeDialog(undefined) }}>
          <section role="dialog" aria-modal="true" className="w-full max-w-[520px] overflow-hidden rounded-[26px] border border-white/60 bg-white shadow-[0_34px_100px_rgba(10,32,51,.32)]">
            <div className="h-1.5 bg-[#ef8354]" />
            <div className="p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${style.iconBg} ${style.iconColor}`}><Icon size={24} /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a8c99]">PMOCorex control system</div>
                  <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-[#173f5f]">{options.title || 'Notification'}</h2>
                  <p className="mt-3 whitespace-pre-line text-[15px] leading-7 text-[#516779]">{options.message}</p>
                </div>
                <button onClick={() => closeDialog(dialog.mode === 'confirm' ? false : dialog.mode === 'prompt' ? null : undefined)} className="rounded-xl p-2 text-[#7a8c99] hover:bg-[#eef3f4] hover:text-[#173f5f]" aria-label="Close"><X size={19} /></button>
              </div>

              {dialog.mode === 'prompt' && (
                <label className="mt-6 block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#516779]">{promptOptions?.inputLabel || 'Comment or reason'}</span>
                  <textarea autoFocus rows={4} value={promptValue} onChange={event => setPromptValue(event.target.value)} placeholder={promptOptions?.placeholder || 'Enter the required details…'} className="w-full resize-none rounded-2xl border border-[#cfdce4] bg-[#f9fbfc] px-4 py-3 text-[#173f5f] outline-none transition focus:border-[#2f7898] focus:ring-4 focus:ring-[#2f7898]/10" />
                </label>
              )}

              <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-[#e4ebef] pt-5">
                {dialog.mode !== 'alert' && (
                  <button onClick={() => closeDialog(dialog.mode === 'confirm' ? false : null)} className="rounded-xl border border-[#cfdce4] bg-white px-5 py-2.5 text-sm font-semibold text-[#173f5f] hover:bg-[#f4f7f8]">{(options as ConfirmOptions).cancelLabel || 'Cancel'}</button>
                )}
                <button disabled={promptDisabled} onClick={() => closeDialog(dialog.mode === 'confirm' ? true : dialog.mode === 'prompt' ? promptValue.trim() : undefined)} className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-45 ${style.button}`}>{options.confirmLabel || (dialog.mode === 'alert' ? 'Done' : 'Continue')}</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

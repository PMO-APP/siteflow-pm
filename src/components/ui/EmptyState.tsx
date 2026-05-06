import { ReactNode } from 'react'

interface Props {
  icon?: ReactNode
  title: string
  message: string
  action?: ReactNode
}

export default function EmptyState({
  icon,
  title,
  message,
  action,
}: Props) {
  return (
    <div className="card p-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#c49e48]/10 border border-[#c49e48]/20 text-[#c49e48]">
        {icon || '◇'}
      </div>

      <div className="text-lg font-semibold text-[#ede8de]">
        {title}
      </div>

      <div className="text-sm text-[#6e7d8c] mt-2 max-w-md mx-auto">
        {message}
      </div>

      {action && (
        <div className="mt-5">
          {action}
        </div>
      )}
    </div>
  )
}

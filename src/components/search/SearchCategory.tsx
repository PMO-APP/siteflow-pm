import type { ReactNode } from 'react'

export default function SearchCategory({ label, count, children }: { label: string; count: number; children: ReactNode }) {
  return (
    <section className="mb-4 last:mb-0">
      <div className="mb-1.5 flex items-center justify-between px-2">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7a8e99]">{label}</h3>
        <span className="text-[10px] font-semibold text-[#9aabb3]">{count}</span>
      </div>
      <div className="space-y-1">{children}</div>
    </section>
  )
}

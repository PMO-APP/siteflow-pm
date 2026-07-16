import type { ReactNode } from 'react'

export default function InspectorCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="pmx-inspector-card">
      <h3 className="pmx-inspector-title">{title}</h3>
      {description ? <p className="pmx-inspector-description">{description}</p> : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  )
}

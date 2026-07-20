import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { RFI_DISCIPLINES, RFI_PRIORITIES } from '../constants'
import { useRFI, useUpdateRFI } from '../hooks/useRFIs'
import type { RFIDiscipline, RFIPriority } from '../types'
import { hasRFIFormErrors, validateRFIInput } from '../validation/rfi.validation'

export default function EditRFIPage() {
  const { rfiId } = useParams()
  const navigate = useNavigate()
  const { data: rfi, isLoading, error } = useRFI(rfiId)
  const updateRFI = useUpdateRFI()
  const [form, setForm] = useState({ title: '', question: '', discipline: 'General' as RFIDiscipline, priority: 'Medium' as RFIPriority, due_date: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!rfi) return
    setForm({
      title: rfi.title,
      question: rfi.question,
      discipline: rfi.discipline,
      priority: rfi.priority,
      due_date: rfi.due_date || '',
    })
  }, [rfi])

  if (isLoading) return <div className="panel p-8">Loading…</div>
  if (error || !rfi) return <div className="panel p-8 text-red-300">{(error as Error)?.message || 'RFI not found'}</div>
  if (rfi.status !== 'Draft') return <div className="panel p-8 text-amber-200">Only draft RFIs can be edited.</div>

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!rfi) return
    const input = { ...form, project_id: rfi.project_id, due_date: form.due_date || null }
    const nextErrors = validateRFIInput(input)
    setErrors(nextErrors)
    if (hasRFIFormErrors(nextErrors)) return

    await updateRFI.mutateAsync({
      id: rfi.id,
      values: { ...form, due_date: form.due_date || null },
    })
    navigate(`/app/rfis/${rfi.id}`)
  }

  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[.2em] text-[#c49e48]">{rfi.reference_no}</p>
        <h1 className="mt-1 text-2xl font-semibold">Edit draft RFI</h1>
      </div>
      <form onSubmit={submit} className="panel space-y-5 p-6">
        <div>
          <label className="form-label">Title</label>
          <input className="form-control" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} />
          {errors.title && <p className="mt-1 text-xs text-red-300">{errors.title}</p>}
        </div>
        <div>
          <label className="form-label">Question / clarification required</label>
          <textarea rows={7} className="form-control" value={form.question} onChange={event => setForm({ ...form, question: event.target.value })} />
          {errors.question && <p className="mt-1 text-xs text-red-300">{errors.question}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="form-label">Discipline</label>
            <select className="form-control" value={form.discipline} onChange={event => setForm({ ...form, discipline: event.target.value as RFIDiscipline })}>
              {RFI_DISCIPLINES.map(value => <option key={value}>{value}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Priority</label>
            <select className="form-control" value={form.priority} onChange={event => setForm({ ...form, priority: event.target.value as RFIPriority })}>
              {RFI_PRIORITIES.map(value => <option key={value}>{value}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Response due</label>
            <input type="date" className="form-control" value={form.due_date} onChange={event => setForm({ ...form, due_date: event.target.value })} />
          </div>
        </div>
        {updateRFI.error && <p className="text-sm text-red-300">{(updateRFI.error as Error).message}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => navigate(`/app/rfis/${rfi.id}`)}>Cancel</button>
          <button className="btn-primary" disabled={updateRFI.isPending}>{updateRFI.isPending ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>
    </section>
  )
}

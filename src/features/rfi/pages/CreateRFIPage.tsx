import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/store/project'
import { RFI_DISCIPLINES, RFI_PRIORITIES } from '../constants'
import { useCreateRFI } from '../hooks/useRFIs'
import type { RFIDiscipline, RFIPriority } from '../types'
import { hasRFIFormErrors, validateRFIInput } from '../validation/rfi.validation'

export default function CreateRFIPage() {
  const navigate = useNavigate()
  const projectId = useProjectStore(state => state.projectId)
  const createRFI = useCreateRFI()
  const [form, setForm] = useState({
    title: '',
    question: '',
    discipline: 'General' as RFIDiscipline,
    priority: 'Medium' as RFIPriority,
    due_date: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!projectId) return

    const input = { ...form, project_id: projectId, due_date: form.due_date || null }
    const nextErrors = validateRFIInput(input)
    setErrors(nextErrors)
    if (hasRFIFormErrors(nextErrors)) return

    const rfi = await createRFI.mutateAsync(input)
    navigate(`/app/rfis/${rfi.id}`)
  }

  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[.2em] text-[#c49e48]">Technical coordination</p>
        <h1 className="mt-1 text-2xl font-semibold">Create RFI</h1>
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
            {errors.due_date && <p className="mt-1 text-xs text-red-300">{errors.due_date}</p>}
          </div>
        </div>
        {createRFI.error && <p className="text-sm text-red-300">{(createRFI.error as Error).message}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => navigate('/app/rfis')}>Cancel</button>
          <button className="btn-primary" disabled={createRFI.isPending}>{createRFI.isPending ? 'Creating…' : 'Create RFI'}</button>
        </div>
      </form>
    </section>
  )
}

import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/store/project'
import { useCreateRFI } from '../hooks/useRFIs'
import type { RFIDiscipline, RFIPriority } from '../types'

const disciplines: RFIDiscipline[] = ['Architectural', 'Structural', 'MEP', 'Civil', 'Commercial', 'HSE', 'General']
const priorities: RFIPriority[] = ['Low', 'Medium', 'High', 'Critical']

export default function CreateRFIPage() {
  const navigate = useNavigate()
  const projectId = useProjectStore((state) => state.projectId)
  const createRFI = useCreateRFI()
  const [form, setForm] = useState({ title: '', question: '', discipline: 'General' as RFIDiscipline, priority: 'Medium' as RFIPriority, due_date: '' })
  const [validationError, setValidationError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setValidationError('')
    if (!projectId) return setValidationError('Select a project before creating an RFI.')
    if (!form.title.trim() || !form.question.trim()) return setValidationError('Title and question are required.')

    const rfi = await createRFI.mutateAsync({
      project_id: projectId,
      title: form.title.trim(),
      question: form.question.trim(),
      discipline: form.discipline,
      priority: form.priority,
      due_date: form.due_date || null,
    })
    navigate(`/app/rfis/${rfi.id}`)
  }

  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <div><p className="text-xs uppercase tracking-[.2em] text-[#c49e48]">Technical coordination</p><h1 className="mt-1 text-2xl font-semibold">Create RFI</h1></div>
      <form onSubmit={submit} className="panel space-y-5 p-6">
        <div><label className="form-label">Title</label><input required className="form-control" value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} /></div>
        <div><label className="form-label">Question / clarification required</label><textarea required rows={7} className="form-control" value={form.question} onChange={(e) => setForm((current) => ({ ...current, question: e.target.value }))} /></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><label className="form-label">Discipline</label><select className="form-control" value={form.discipline} onChange={(e) => setForm((current) => ({ ...current, discipline: e.target.value as RFIDiscipline }))}>{disciplines.map((item) => <option key={item}>{item}</option>)}</select></div>
          <div><label className="form-label">Priority</label><select className="form-control" value={form.priority} onChange={(e) => setForm((current) => ({ ...current, priority: e.target.value as RFIPriority }))}>{priorities.map((item) => <option key={item}>{item}</option>)}</select></div>
          <div><label className="form-label">Response due</label><input type="date" className="form-control" value={form.due_date} onChange={(e) => setForm((current) => ({ ...current, due_date: e.target.value }))} /></div>
        </div>
        {(validationError || createRFI.error) && <p className="text-sm text-red-300">{validationError || (createRFI.error as Error).message}</p>}
        <div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => navigate('/app/rfis')}>Cancel</button><button className="btn-primary" disabled={createRFI.isPending}>{createRFI.isPending ? 'Creating…' : 'Create RFI'}</button></div>
      </form>
    </section>
  )
}

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarCheck,
  CheckCircle,
  Clock,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useProjectStore } from '@/store/project'
import { fdate } from '@/lib/utils'

const FREQUENCIES = ['Once', 'Daily', 'Weekly', 'Monthly']
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
const STATUSES = ['Pending', 'Completed', 'Skipped']

type Reminder = {
  id: string
  user_id: string
  user_email?: string | null
  project_id?: number | null
  title: string
  description?: string | null
  reminder_date: string
  reminder_time?: string | null
  frequency?: string | null
  priority?: string | null
  status?: string | null
  email_reminder?: boolean | null
  created_at?: string | null
}

export default function PlannerPage() {
  const { user } = useAuthStore()
  const { projectId, projectName, organizationId, portfolioId } =
    useProjectStore()

  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modal, setModal] = useState<Reminder | null | 'new'>(null)

  useEffect(() => {
    loadReminders()
  }, [user?.id, projectId])

  async function loadReminders() {
    if (!user?.id) {
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('personal_reminders')
      .select('*')
      .eq('user_id', user.id)
      .order('reminder_date', { ascending: true })
      .order('reminder_time', { ascending: true })

    if (error) {
      setNotice(error.message)
      setLoading(false)
      return
    }

    setReminders(data || [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase
      .from('personal_reminders')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      setNotice(error.message)
      return
    }

    await loadReminders()
  }

  async function deleteReminder(id: string) {
    const confirmed = window.confirm('Delete this reminder?')
    if (!confirmed) return

    const { error } = await supabase
      .from('personal_reminders')
      .delete()
      .eq('id', id)

    if (error) {
      setNotice(error.message)
      return
    }

    await loadReminders()
  }

  const filtered = useMemo(() => {
    return reminders.filter(item => {
      const term = search.toLowerCase().trim()

      if (
        term &&
        !item.title.toLowerCase().includes(term) &&
        !String(item.description || '').toLowerCase().includes(term)
      ) {
        return false
      }

      if (statusFilter && item.status !== statusFilter) return false

      return true
    })
  }, [reminders, search, statusFilter])

  const today = new Date().toISOString().slice(0, 10)

  const dueToday = reminders.filter(
    item => item.reminder_date === today && item.status !== 'Completed'
  )

  const overdue = reminders.filter(
    item => item.reminder_date < today && item.status !== 'Completed'
  )

  const pending = reminders.filter(item => item.status !== 'Completed')

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#c49e48]/20 bg-gradient-to-br from-[#111820] via-[#162230] to-[#0f151c] p-6 sm:p-8">
        <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
          Personal Productivity
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-[#ede8de]">
          Planner
        </h1>

        <p className="text-slate-400 mt-3 max-w-2xl">
          Plan your week, set personal reminders, and track actions like reports,
          schedule updates, inspections, and project follow-ups.
        </p>

        <div className="text-xs text-[#6e7d8c] mt-4">
          Project:{' '}
          <span className="text-[#c49e48]">
            {projectName || 'No project selected'}
          </span>
        </div>
      </section>

      {notice && (
        <div className="rounded-xl border border-[#c49e48]/20 bg-[#c49e48]/10 p-3 text-sm text-[#ede8de]">
          {notice}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          icon={CalendarCheck}
          title="Pending"
          value={pending.length}
        />
        <MetricCard icon={Clock} title="Due Today" value={dueToday.length} />
        <MetricCard icon={Clock} title="Overdue" value={overdue.length} danger />
        <MetricCard
          icon={CheckCircle}
          title="Completed"
          value={reminders.filter(item => item.status === 'Completed').length}
          good
        />
      </div>

      <div className="card p-4 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e7d8c]"
          />

          <input
            className="form-control pl-8 text-sm"
            placeholder="Search reminders..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-control w-auto text-sm"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          {STATUSES.map(status => (
            <option key={status}>{status}</option>
          ))}
        </select>

        <button
          className="btn btn-gold ml-auto"
          onClick={() => setModal('new')}
        >
          <Plus size={14} />
          Add Reminder
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 text-slate-400">Loading reminders…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <CalendarCheck size={36} className="mx-auto text-[#c49e48] mb-3" />
            <div className="text-lg font-bold text-white">
              No reminders found
            </div>
            <div className="text-sm text-slate-500 mt-1">
              Add reminders for reports, schedules, site updates, inspections,
              and follow-ups.
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {filtered.map(item => (
              <ReminderCard
                key={item.id}
                item={item}
                onEdit={() => setModal(item)}
                onDelete={() => deleteReminder(item.id)}
                onStatusChange={status => updateStatus(item.id, status)}
              />
            ))}
          </div>
        )}
      </div>

      {modal !== null && (
        <ReminderModal
          item={modal === 'new' ? null : modal}
          userId={user?.id || ''}
          userEmail={user?.email || ''}
          projectId={projectId}
          organizationId={organizationId}
          portfolioId={portfolioId}
          onClose={() => setModal(null)}
          onSaved={loadReminders}
        />
      )}
    </div>
  )
}

function ReminderModal({
  item,
  userId,
  userEmail,
  projectId,
  organizationId,
  portfolioId,
  onClose,
  onSaved,
}: {
  item: Reminder | null
  userId: string
  userEmail: string
  projectId: number | null
  organizationId: number | null
  portfolioId: number | null
  onClose: () => void
  onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    title: item?.title || '',
    description: item?.description || '',
    reminder_date: item?.reminder_date || new Date().toISOString().slice(0, 10),
    reminder_time: item?.reminder_time || '09:00',
    frequency: item?.frequency || 'Once',
    priority: item?.priority || 'Medium',
    status: item?.status || 'Pending',
    email_reminder: item?.email_reminder ?? true,
  })

  const set = (key: string, value: any) => {
    setForm(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  async function save() {
    if (!form.title.trim()) return

    setSaving(true)

    const payload = {
      user_id: userId,
      user_email: userEmail,
      project_id: item?.project_id || projectId,
      organization_id: organizationId,
      portfolio_id: portfolioId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      reminder_date: form.reminder_date,
      reminder_time: form.reminder_time || null,
      frequency: form.frequency,
      priority: form.priority,
      status: form.status,
      email_reminder: form.email_reminder,
      updated_at: new Date().toISOString(),
    }

    const query = item?.id
      ? supabase.from('personal_reminders').update(payload).eq('id', item.id)
      : supabase.from('personal_reminders').insert(payload)

    const { error } = await query

    if (error) {
      alert(error.message)
      setSaving(false)
      return
    }

    setSaving(false)
    await onSaved()
    onClose()
  }

  return (
    <div
      className="modal-overlay"
      onClick={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="modal max-w-xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="gold-bar" />

        <div className="modal-head">
          <div className="modal-title">
            {item ? 'Edit Reminder' : 'New Reminder'}
          </div>

          <button
            onClick={onClose}
            className="text-[#6e7d8c] hover:text-[#ede8de]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <Field label="Title *">
            <input
              className="form-control"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Update schedule, fill report..."
            />
          </Field>

          <Field label="Description">
            <textarea
              className="form-control"
              rows={3}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Add notes or context..."
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <input
                type="date"
                className="form-control"
                value={form.reminder_date}
                onChange={e => set('reminder_date', e.target.value)}
              />
            </Field>

            <Field label="Time">
              <input
                type="time"
                className="form-control"
                value={form.reminder_time}
                onChange={e => set('reminder_time', e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Frequency">
              <select
                className="form-control"
                value={form.frequency}
                onChange={e => set('frequency', e.target.value)}
              >
                {FREQUENCIES.map(item => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>

            <Field label="Priority">
              <select
                className="form-control"
                value={form.priority}
                onChange={e => set('priority', e.target.value)}
              >
                {PRIORITIES.map(item => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Status">
            <select
              className="form-control"
              value={form.status}
              onChange={e => set('status', e.target.value)}
            >
              {STATUSES.map(item => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.email_reminder}
              onChange={e => set('email_reminder', e.target.checked)}
            />
            Send email reminder
          </label>
        </div>

        <div className="flex gap-2 justify-end px-5 py-3 border-t border-white/[0.06]">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>

          <button
            className="btn btn-gold btn-sm"
            onClick={save}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Reminder'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ReminderCard({
  item,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  item: Reminder
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (status: string) => void
}) {
  const today = new Date().toISOString().slice(0, 10)

  const isOverdue = item.reminder_date < today && item.status !== 'Completed'
  const isDueToday =
    item.reminder_date === today && item.status !== 'Completed'

  const priorityClass =
    item.priority === 'Critical'
      ? 'text-red-400'
      : item.priority === 'High'
      ? 'text-orange-400'
      : item.priority === 'Low'
      ? 'text-slate-400'
      : 'text-[#c49e48]'

  return (
    <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-4">
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-bold text-[#ede8de]">
            {item.title}
          </h2>

          {isOverdue && (
            <span className="badge badge-red">Overdue</span>
          )}

          {isDueToday && (
            <span className="badge badge-amber">Due Today</span>
          )}

          <span className="badge badge-muted">
            {item.frequency || 'Once'}
          </span>
        </div>

        {item.description && (
          <p className="text-sm text-slate-500 mt-1">{item.description}</p>
        )}

        <div className="flex flex-wrap gap-2 mt-3 text-xs text-slate-400">
          <span>Date: {fdate(item.reminder_date)}</span>
          <span>Time: {item.reminder_time || '—'}</span>
          <span className={priorityClass}>
            Priority: {item.priority || 'Medium'}
          </span>
          <span>Email: {item.email_reminder ? 'On' : 'Off'}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <select
          className="form-control text-xs w-auto"
          value={item.status || 'Pending'}
          onChange={e => onStatusChange(e.target.value)}
        >
          {STATUSES.map(status => (
            <option key={status}>{status}</option>
          ))}
        </select>

        <button className="btn btn-ghost btn-sm" onClick={onEdit}>
          Edit
        </button>

        <button className="btn btn-ghost btn-sm text-red-400" onClick={onDelete}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  title,
  value,
  good,
  danger,
}: {
  icon: any
  title: string
  value: number
  good?: boolean
  danger?: boolean
}) {
  const color = danger
    ? 'text-red-400'
    : good
    ? 'text-emerald-400'
    : 'text-[#c49e48]'

  return (
    <div className="card p-4">
      <Icon size={18} className={color} />
      <div className={`font-display text-3xl font-bold mt-3 ${color}`}>
        {value}
      </div>
      <div className="text-[9px] uppercase tracking-widest text-[#6e7d8c] mt-1">
        {title}
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="form-label">{label}</label>
      {children}
    </div>
  )
}

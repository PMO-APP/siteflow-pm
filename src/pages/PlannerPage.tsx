import { useEffect, useMemo, useState } from 'react'
import {
  CalendarCheck,
  CalendarDays,
  CheckCircle,
  Clock,
  ListTodo,
  Sparkles,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useProjectStore } from '@/store/project'
import { fdate } from '@/lib/utils'

import { pmoConfirm, pmoToast } from '@/lib/notifications'
const RECURRENCE_TYPES = ['Once', 'Daily', 'Weekly', 'Monthly']
const WEEK_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]
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
  recurrence_type?: string | null
  recurrence_interval?: number | null
  recurrence_day?: string | null
  recurrence_end_date?: string | null
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
    const confirmed = await pmoConfirm('Delete this reminder?')
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

  const completed = reminders.filter(item => item.status === 'Completed')
  const dueThisWeek = reminders.filter(item => {
    if (item.status === 'Completed') return false
    const date = new Date(`${item.reminder_date}T00:00:00`)
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const finish = new Date(start)
    finish.setDate(start.getDate() + 7)
    return date >= start && date <= finish
  })

  const weekDays = Array.from({ length: 5 }, (_, index) => {
    const date = new Date()
    const day = date.getDay()
    const mondayOffset = day === 0 ? -6 : 1 - day
    date.setDate(date.getDate() + mondayOffset + index)
    const iso = date.toISOString().slice(0, 10)
    return {
      iso,
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dateLabel: date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
      items: reminders.filter(item => item.reminder_date === iso),
    }
  })

  return (
    <div className="min-h-screen bg-[#f6f5f1] text-[#18212b] -m-4 p-4 sm:-m-6 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <section className="overflow-hidden rounded-[24px] border border-[#dfe3e7] bg-white">
          <div className="grid lg:grid-cols-[1fr_320px]">
            <div className="border-l-[6px] border-[#ff7657] p-6 sm:p-8 lg:p-10">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#df5f41]">Personal productivity</div>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-[#102943] sm:text-4xl">Weekly Planning Centre</h1>
              <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[#65717c]">Plan inspections, meetings, reports, schedule updates and follow-up actions for the current week.</p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#eef4f7] px-3 py-1.5 text-xs font-semibold text-[#31526d]">
                <CalendarDays size={14} /> {projectName || 'No project selected'}
              </div>
            </div>
            <div className="border-t border-[#e7eaed] bg-[#123a60] p-7 text-white lg:border-l lg:border-t-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">This week</div>
              <div className="mt-3 text-5xl font-semibold tracking-[-0.05em]">{dueThisWeek.length}</div>
              <div className="mt-1 text-sm text-white/70">open action{dueThisWeek.length === 1 ? '' : 's'} due</div>
              <button onClick={() => setModal('new')} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#ff7657] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#ed6749]"><Plus size={14}/>Add action</button>
            </div>
          </div>
        </section>

        {notice && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{notice}</div>}

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MetricCard icon={ListTodo} title="Today's priorities" value={dueToday.length} subtitle={dueToday.length ? `${dueToday.length} action${dueToday.length === 1 ? '' : 's'} need attention` : 'No actions due today'} />
          <MetricCard icon={CalendarCheck} title="Due this week" value={dueThisWeek.length} subtitle={dueThisWeek.length ? 'Protect these commitments' : 'No weekly deadlines recorded'} />
          <MetricCard icon={Clock} title="Overdue actions" value={overdue.length} subtitle={overdue.length ? 'Immediate follow-up required' : 'No overdue actions'} danger={overdue.length > 0} />
          <MetricCard icon={CheckCircle} title="Completed" value={completed.length} subtitle={completed.length ? 'Actions closed successfully' : 'No completed actions yet'} good />
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-2xl border border-[#dfe3e7] bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6f7d89]">Weekly calendar</div><h2 className="mt-2 text-xl font-semibold text-[#102943]">Plan the working week</h2></div>
              <span className="rounded-full bg-[#eef4f7] px-3 py-1.5 text-xs font-semibold text-[#31526d]">Monday – Friday</span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-5">
              {weekDays.map(day => <div key={day.iso} className={`min-h-[170px] rounded-2xl border p-3 ${day.iso === today ? 'border-[#ff9b83] bg-[#fff7f3]' : 'border-[#e3e8ec] bg-[#fafbfb]'}`}>
                <div className="flex items-center justify-between"><span className="text-xs font-semibold text-[#102943]">{day.label}</span><span className="text-[10px] text-[#7d8993]">{day.dateLabel}</span></div>
                <div className="mt-3 space-y-2">{day.items.length ? day.items.slice(0,3).map(item => <button key={item.id} onClick={() => setModal(item)} className="w-full rounded-xl border border-[#e2e7eb] bg-white p-2 text-left hover:border-[#9db4c5]"><div className="line-clamp-2 text-[11px] font-semibold leading-4 text-[#26384a]">{item.title}</div><div className="mt-1 text-[9px] text-[#87939d]">{item.reminder_time || 'Any time'}</div></button>) : <div className="rounded-xl border border-dashed border-[#d9e0e5] p-3 text-center text-[10px] text-[#9aa4ad]">No actions</div>}</div>
              </div>)}
            </div>
          </section>

          <section className="rounded-2xl border border-[#dfe3e7] bg-white p-5 sm:p-6">
            <div className="flex items-center gap-2"><Sparkles size={17} className="text-[#ff7657]"/><div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6f7d89]">Planning intelligence</div></div>
            <h2 className="mt-4 text-xl font-semibold text-[#102943]">Your focus</h2>
            <p className="mt-3 text-sm leading-7 text-[#536170]">{overdue.length ? `Start with the ${overdue.length} overdue action${overdue.length === 1 ? '' : 's'}, then protect this week's deadlines before adding new commitments.` : dueToday.length ? `You have ${dueToday.length} priority action${dueToday.length === 1 ? '' : 's'} today. Close them before moving to lower-priority follow-ups.` : 'No immediate pressure is recorded. Use this time to prepare reports, confirm inspections and protect upcoming milestones.'}</p>
            <div className="mt-5 space-y-3 border-t border-[#edf0f2] pt-5 text-sm">
              <div className="flex items-center justify-between"><span className="text-[#6f7d89]">Pending</span><span className="font-semibold text-[#102943]">{pending.length}</span></div>
              <div className="flex items-center justify-between"><span className="text-[#6f7d89]">Due today</span><span className="font-semibold text-[#102943]">{dueToday.length}</span></div>
              <div className="flex items-center justify-between"><span className="text-[#6f7d89]">Completion rate</span><span className="font-semibold text-[#102943]">{reminders.length ? Math.round((completed.length/reminders.length)*100) : 0}%</span></div>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-[#dfe3e7] bg-white">
          <div className="border-b border-[#e5e8eb] p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[230px] flex-1 max-w-md"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#87939d]"/><input className="w-full rounded-xl border border-[#dfe3e7] bg-white py-2.5 pl-9 pr-3 text-sm text-[#28394b] outline-none focus:border-[#123a60]" placeholder="Search reminders and follow-ups" value={search} onChange={e => setSearch(e.target.value)}/></div>
              <select className="rounded-xl border border-[#dfe3e7] bg-white px-3 py-2.5 text-sm text-[#536170]" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">All status</option>{STATUSES.map(status => <option key={status}>{status}</option>)}</select>
              <button className="ml-auto inline-flex items-center gap-2 rounded-xl bg-[#123a60] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d2e4d]" onClick={() => setModal('new')}><Plus size={14}/>Add reminder</button>
            </div>
          </div>
          {loading ? <div className="p-10 text-center text-sm text-[#7c8892]">Loading planner…</div> : filtered.length === 0 ? <div className="p-12 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff2ec] text-[#df5f41]"><CalendarCheck size={25}/></div><div className="mt-4 text-lg font-semibold text-[#102943]">No actions in this view</div><div className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#7b8791]">Add reminders for reports, schedules, inspections, meetings and project follow-ups.</div><button onClick={() => setModal('new')} className="mt-5 rounded-xl bg-[#123a60] px-4 py-2.5 text-sm font-semibold text-white">Create first action</button></div> : <div className="divide-y divide-[#edf0f2]">{filtered.map(item => <ReminderCard key={item.id} item={item} onEdit={() => setModal(item)} onDelete={() => deleteReminder(item.id)} onStatusChange={status => updateStatus(item.id,status)}/>)}</div>}
        </section>
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
    recurrence_type: item?.recurrence_type || item?.frequency || 'Once',
    recurrence_interval: item?.recurrence_interval || 1,
    recurrence_day: item?.recurrence_day || 'Friday',
    recurrence_end_date: item?.recurrence_end_date || '',
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
      frequency: form.recurrence_type,
      recurrence_type: form.recurrence_type,
      recurrence_interval: Number(form.recurrence_interval) || 1,
      recurrence_day:
        form.recurrence_type === 'Weekly' ? form.recurrence_day : null,
      recurrence_end_date: form.recurrence_end_date || null,
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
      pmoToast({ title: 'Unable to save reminder', message: error.message, tone: 'error' })
      setSaving(false)
      return
    }

    setSaving(false)
    await onSaved()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#102943]/45 p-4 backdrop-blur-sm"
      onClick={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-[24px] bg-white shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="h-1.5 bg-[#ff7657]" />

        <div className="flex items-start justify-between border-b border-[#e5e8eb] p-6">
          <div className="text-2xl font-semibold text-[#102943]">
            {item ? 'Edit Reminder' : 'New Reminder'}
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[#6f7d89] hover:bg-[#f2f5f7]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-6">
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
            <Field label="Start Date">
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
            <Field label="Repeat">
              <select
                className="form-control"
                value={form.recurrence_type}
                onChange={e => set('recurrence_type', e.target.value)}
              >
                {RECURRENCE_TYPES.map(item => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>

            <Field label="Every">
              <input
                type="number"
                min={1}
                className="form-control"
                value={form.recurrence_interval}
                disabled={form.recurrence_type === 'Once'}
                onChange={e =>
                  set('recurrence_interval', Number(e.target.value))
                }
              />
            </Field>
          </div>

          {form.recurrence_type === 'Weekly' && (
            <Field label="Day of Week">
              <select
                className="form-control"
                value={form.recurrence_day}
                onChange={e => set('recurrence_day', e.target.value)}
              >
                {WEEK_DAYS.map(day => (
                  <option key={day}>{day}</option>
                ))}
              </select>
            </Field>
          )}

          {form.recurrence_type !== 'Once' && (
            <Field label="Repeat Until">
              <input
                type="date"
                className="form-control"
                value={form.recurrence_end_date}
                onChange={e => set('recurrence_end_date', e.target.value)}
              />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <label className="flex items-center gap-2 text-sm text-[#536170]">
            <input
              type="checkbox"
              checked={form.email_reminder}
              onChange={e => set('email_reminder', e.target.checked)}
            />
            Send email reminder
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-[#e5e8eb] p-5">
          <button className="rounded-xl border border-[#dfe3e7] px-4 py-2.5 text-sm font-semibold text-[#536170]" onClick={onClose}>
            Cancel
          </button>

          <button
            className="rounded-xl bg-[#123a60] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
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

function downloadCalendarFile(item: Reminder) {
  const cleanTitle = cleanIcsText(item.title || 'PMOCorex Reminder')
  const cleanDescription = cleanIcsText(item.description || '')
  const date = item.reminder_date.replace(/-/g, '')
  const time = (item.reminder_time || '09:00').replace(':', '')
  const interval = item.recurrence_interval || 1
  const recurrenceType = item.recurrence_type || item.frequency || 'Once'

  const dayMap: Record<string, string> = {
    Monday: 'MO',
    Tuesday: 'TU',
    Wednesday: 'WE',
    Thursday: 'TH',
    Friday: 'FR',
    Saturday: 'SA',
    Sunday: 'SU',
  }

  let rrule = ''

  if (recurrenceType === 'Daily') {
    rrule = `RRULE:FREQ=DAILY;INTERVAL=${interval}`
  }

  if (recurrenceType === 'Weekly') {
    const day = dayMap[item.recurrence_day || 'Friday'] || 'FR'
    rrule = `RRULE:FREQ=WEEKLY;INTERVAL=${interval};BYDAY=${day}`
  }

  if (recurrenceType === 'Monthly') {
    rrule = `RRULE:FREQ=MONTHLY;INTERVAL=${interval}`
  }

  if (rrule && item.recurrence_end_date) {
    rrule += `;UNTIL=${item.recurrence_end_date.replace(/-/g, '')}T235959`
  }

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PMOCorex//Planner//EN',
    'BEGIN:VEVENT',
    `UID:${item.id || crypto.randomUUID()}@pmocorex.com`,
    `SUMMARY:${cleanTitle}`,
    cleanDescription ? `DESCRIPTION:${cleanDescription}` : '',
    `DTSTART:${date}T${time}00`,
    `DTEND:${date}T${time}00`,
    rrule,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n')

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `${item.title || 'reminder'}.ics`
  link.click()

  URL.revokeObjectURL(url)
}

function cleanIcsText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
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
      ? 'text-red-600'
      : item.priority === 'High'
      ? 'text-amber-600'
      : item.priority === 'Low'
      ? 'text-[#7d8993]'
      : 'text-[#df5f41]'

  const recurrenceLabel = getRecurrenceLabel(item)

  return (
    <div className="flex flex-col gap-4 p-5 transition hover:bg-[#fafbfb] lg:flex-row lg:items-center">
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-[#26384a]">
            {item.title}
          </h2>

          {isOverdue && <span className="badge badge-red">Overdue</span>}
          {isDueToday && <span className="badge badge-amber">Due Today</span>}

          <span className="badge badge-muted">{recurrenceLabel}</span>
        </div>

        {item.description && (
          <p className="mt-1 text-sm leading-6 text-[#6f7d89]">{item.description}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#7d8993]">
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
          className="rounded-xl border border-[#dfe3e7] bg-white px-3 py-2 text-xs text-[#536170]"
          value={item.status || 'Pending'}
          onChange={e => onStatusChange(e.target.value)}
        >
          {STATUSES.map(status => (
            <option key={status}>{status}</option>
          ))}
        </select>

        <button
          className="rounded-xl border border-[#dfe3e7] px-3 py-2 text-xs font-semibold text-[#536170] hover:bg-[#f4f6f7]"
          onClick={() => downloadCalendarFile(item)}
        >
          Calendar
        </button>

        <button className="rounded-xl border border-[#dfe3e7] px-3 py-2 text-xs font-semibold text-[#123a60] hover:bg-[#eef4f7]" onClick={onEdit}>
          Edit
        </button>

        <button className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100" onClick={onDelete}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

function getRecurrenceLabel(item: Reminder) {
  const type = item.recurrence_type || item.frequency || 'Once'
  const interval = item.recurrence_interval || 1

  if (type === 'Once') return 'Once'
  if (type === 'Daily') return interval === 1 ? 'Daily' : `Every ${interval} days`
  if (type === 'Weekly') {
    const day = item.recurrence_day || 'Friday'
    return interval === 1
      ? `Every ${day}`
      : `Every ${interval} weeks on ${day}`
  }
  if (type === 'Monthly') {
    return interval === 1 ? 'Monthly' : `Every ${interval} months`
  }

  return type
}

function MetricCard({
  icon: Icon,
  title,
  value,
  subtitle,
  good,
  danger,
}: {
  icon: any
  title: string
  value: number
  subtitle: string
  good?: boolean
  danger?: boolean
}) {
  const tone = danger ? 'text-red-600 bg-red-50' : good ? 'text-emerald-600 bg-emerald-50' : 'text-[#31526d] bg-[#eef4f7]'
  return (
    <div className="rounded-2xl border border-[#dfe3e7] bg-white p-5">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon size={17}/></div>
      <div className={`mt-4 text-3xl font-semibold tracking-[-0.04em] ${danger ? 'text-red-600' : good ? 'text-emerald-600' : 'text-[#102943]'}`}>{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#6f7d89]">{title}</div>
      <div className="mt-2 text-xs leading-5 text-[#9aa4ad]">{subtitle}</div>
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

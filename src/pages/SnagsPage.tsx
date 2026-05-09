import { useProjectStore } from '@/store/project'
import { logAudit } from '@/lib/audit'
import { useAuthStore } from '@/store/auth'
import { getRole } from '@/lib/access'
import { useState } from 'react'
import { Plus, X, Search } from 'lucide-react'
import { useSnags, useUpsertSnag } from '@/hooks/useData'
import { fdate } from '@/lib/utils'
import type { Snag } from '@/types'

const SEVERITIES: Snag['severity'][] = ['Critical', 'Major', 'Minor']

const STATUSES: Snag['status'][] = [
  'Open',
  'In Progress',
  'Pending Verification',
  'Closed',
]

const ROOMS = [
  'Entrance / Reception',
  'Hammam Suite',
  'Treatment Room 1',
  'Treatment Room 2',
  'Treatment Room 3',
  'Treatment Room 4',
  'Steam Room',
  'Relaxation Lounge',
  'Koi Garden',
  'Water Cascade Area',
  'Changing Rooms',
  'WC / Toilets',
  'Plant Room',
  'Store',
  'External / Driveway',
  'General',
]

function SnagModal({
  item,
  onClose,
}: {
  item: Snag | null
  onClose: () => void
}) {
  const upsert = useUpsertSnag()
const { user } = useAuthStore()
const { projectId } = useProjectStore()

  const [form, setForm] = useState({
    title: item?.title || '',
    description: item?.description || '',
    location: item?.location || '',
    room: item?.room || 'General',
    severity: item?.severity || ('Minor' as Snag['severity']),
    status: item?.status || ('Open' as Snag['status']),
    assigned_contractor: item?.assigned_contractor || '',
    raised_date:
      item?.raised_date || new Date().toISOString().slice(0, 10),
    target_close_date: item?.target_close_date || '',
    closed_date: item?.closed_date || '',
    notes: item?.notes || '',
  })

  const set = (key: string, value: any) => {
    setForm(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  const save = async () => {
    if (!form.title.trim()) return

    const payload = {
  ...form,
  project_id: item?.project_id || projectId,
  closed_date:
    form.status === 'Closed' && !form.closed_date
      ? new Date().toISOString().slice(0, 10)
      : form.closed_date || null,
  target_close_date: form.target_close_date || null,
  raised_date: form.raised_date || null,
  created_by: item?.created_by || user?.id,
}

    await upsert.mutateAsync({
      id: item?.id,
      ...payload,
    } as any)

    await logAudit(
      user,
      item ? 'UPDATE' : 'CREATE',
      'Snags',
      item?.id || 'new',
      form.title
    )

    onClose()
  }

  return (
    <div
      className="modal-overlay"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal max-w-xl" onClick={e => e.stopPropagation()}>
        <div className="gold-bar" />

        <div className="modal-head">
          <div className="modal-title">
            {item ? `Edit Snag #${item.snag_number}` : 'New Snag'}
          </div>

          <button
            onClick={onClose}
            className="text-[#6e7d8c] hover:text-[#ede8de]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="form-label">Title *</label>
            <input
              className="form-control"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Brief description of defect…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Severity</label>
              <select
                className="form-control"
                value={form.severity}
                onChange={e => set('severity', e.target.value)}
              >
                {SEVERITIES.map(severity => (
                  <option key={severity}>{severity}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Status</label>
              <select
                className="form-control"
                value={form.status}
                onChange={e => set('status', e.target.value)}
              >
                {STATUSES.map(status => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Room / Area</label>
              <select
                className="form-control"
                value={form.room}
                onChange={e => set('room', e.target.value)}
              >
                {ROOMS.map(room => (
                  <option key={room}>{room}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Specific Location</label>
              <input
                className="form-control"
                value={form.location}
                onChange={e => set('location', e.target.value)}
                placeholder="e.g. North wall, column 3…"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Assigned Contractor</label>
            <input
              className="form-control"
              value={form.assigned_contractor}
              onChange={e => set('assigned_contractor', e.target.value)}
              placeholder="Company responsible for fix…"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="form-label">Date Raised</label>
              <input
                type="date"
                className="form-control"
                value={form.raised_date}
                onChange={e => set('raised_date', e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Target Close</label>
              <input
                type="date"
                className="form-control"
                value={form.target_close_date}
                onChange={e => set('target_close_date', e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Closed Date</label>
              <input
                type="date"
                className="form-control"
                value={form.closed_date}
                onChange={e => set('closed_date', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Full Description</label>
            <textarea
              className="form-control"
              rows={3}
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          <div>
            <label className="form-label">Notes / Remediation Action</label>
            <textarea
              className="form-control"
              rows={2}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end px-5 py-3 border-t border-white/[0.06]">
          <button className="btn-ghost btn-sm btn" onClick={onClose}>
            Cancel
          </button>

          <button
            className="btn-gold btn-sm btn"
            onClick={save}
            disabled={upsert.isPending}
          >
            {upsert.isPending
              ? 'Saving…'
              : item
              ? 'Save Changes'
              : 'Log Snag'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SnagsPage() {
  const { data: snags = [], isLoading } = useSnags()

  const { user } = useAuthStore()
  const role = getRole(user?.email)

  const [modal, setModal] = useState<Snag | null | 'new'>(null)
  const [search, setSearch] = useState('')
  const [roomFilter, setRoomFilter] = useState('')
  const [sevFilter, setSevFilter] = useState('')
  const [statFilter, setStatFilter] = useState('')
  const [view, setView] = useState<'list' | 'room'>('list')

  const canCreate = !!user

  const canEditSnag = (snag: Snag) => {
    return role === 'admin' || snag.created_by === user?.id
  }

  const filtered = snags.filter(snag => {
    if (
      search &&
      !snag.title.toLowerCase().includes(search.toLowerCase()) &&
      !String(snag.snag_number).includes(search)
    ) {
      return false
    }

    if (roomFilter && snag.room !== roomFilter) return false
    if (sevFilter && snag.severity !== sevFilter) return false
    if (statFilter && snag.status !== statFilter) return false

    return true
  })

  const open = snags.filter(snag => snag.status !== 'Closed').length

  const critical = snags.filter(
    snag =>
      snag.severity === 'Critical' &&
      snag.status !== 'Closed'
  ).length

  const major = snags.filter(
    snag =>
      snag.severity === 'Major' &&
      snag.status !== 'Closed'
  ).length

  const closed = snags.filter(snag => snag.status === 'Closed').length

  const sevBadge = (severity: Snag['severity']) =>
    severity === 'Critical'
      ? 'badge-red'
      : severity === 'Major'
      ? 'badge-amber'
      : 'badge-muted'

  const statBadge = (status: Snag['status']) =>
    status === 'Closed'
      ? 'badge-green'
      : status === 'In Progress'
      ? 'badge-amber'
      : status === 'Pending Verification'
      ? 'badge-blue'
      : 'badge-red'

  const roomGroups = ROOMS.map(room => ({
    room,
    snags: filtered.filter(
      snag => snag.room === room || (!snag.room && room === 'General')
    ),
  })).filter(group => group.snags.length > 0)

  const rooms = [...new Set(snags.map(snag => snag.room).filter(Boolean))]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Open Snags',
            value: open,
            color: open > 0 ? 'text-amber-400' : 'text-emerald-400',
          },
          {
            label: 'Critical',
            value: critical,
            color: critical > 0 ? 'text-red-400' : 'text-emerald-400',
          },
          {
            label: 'Major',
            value: major,
            color: major > 0 ? 'text-amber-400' : 'text-emerald-400',
          },
          {
            label: 'Closed',
            value: closed,
            color: 'text-emerald-400',
          },
        ].map(stat => (
          <div key={stat.label} className="card p-3">
            <div className={`font-display text-3xl font-bold ${stat.color}`}>
              {stat.value}
            </div>

            <div className="text-[9px] text-[#6e7d8c] uppercase tracking-widest mt-1">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex rounded-md overflow-hidden border border-white/[0.08]">
          {(['list', 'room'] as const).map(option => (
            <button
              key={option}
              onClick={() => setView(option)}
              className={`px-3 py-1.5 text-[11px] font-medium capitalize transition-colors ${
                view === option
                  ? 'bg-[#c49e48] text-[#0c1014]'
                  : 'bg-[#1c2a36] text-[#6e7d8c] hover:text-[#bfb9ae]'
              }`}
            >
              {option === 'list' ? 'List' : 'By Room'}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[140px] max-w-xs">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6e7d8c]"
          />

          <input
            className="form-control pl-7 text-[12px] py-1.5"
            placeholder="Search snags…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-control text-[12px] py-1.5 w-auto"
          value={roomFilter}
          onChange={e => setRoomFilter(e.target.value)}
        >
          <option value="">All Rooms</option>

          {rooms.map(room => (
            <option key={room}>{room}</option>
          ))}
        </select>

        <select
          className="form-control text-[12px] py-1.5 w-auto"
          value={sevFilter}
          onChange={e => setSevFilter(e.target.value)}
        >
          <option value="">All Severity</option>

          {SEVERITIES.map(severity => (
            <option key={severity}>{severity}</option>
          ))}
        </select>

        <select
          className="form-control text-[12px] py-1.5 w-auto"
          value={statFilter}
          onChange={e => setStatFilter(e.target.value)}
        >
          <option value="">All Status</option>

          {STATUSES.map(status => (
            <option key={status}>{status}</option>
          ))}
        </select>

        {canCreate && (
          <button
            className="btn-gold btn-sm btn ml-auto"
            onClick={() => setModal('new')}
          >
            <Plus size={13} />
            Log Snag
          </button>
        )}
      </div>

      {view === 'room' && (
        <div className="space-y-3">
          {roomGroups.length === 0 && (
            <div className="card p-8 empty-state">
              No snags recorded yet.
            </div>
          )}

          {roomGroups.map(group => (
            <div key={group.room} className="card">
              <div className="card-head">
                <div className="card-title text-[14px]">
                  {group.room}
                </div>

                <div className="flex gap-1.5">
                  {['Critical', 'Major', 'Minor'].map(severity => {
                    const count = group.snags.filter(
                      snag =>
                        snag.severity === severity &&
                        snag.status !== 'Closed'
                    ).length

                    if (!count) return null

                    return (
                      <span
                        key={severity}
                        className={`badge ${sevBadge(
                          severity as Snag['severity']
                        )}`}
                      >
                        {count} {severity}
                      </span>
                    )
                  })}

                  <span className="badge badge-green">
                    {
                      group.snags.filter(
                        snag => snag.status === 'Closed'
                      ).length
                    }{' '}
                    Closed
                  </span>
                </div>
              </div>

              <div className="divide-y divide-white/[0.04]">
                {group.snags.map(snag => (
                  <div
                    key={snag.id}
                    className={`flex items-start gap-3 px-4 py-2.5 ${
                      canEditSnag(snag)
                        ? 'cursor-pointer hover:bg-white/[0.02]'
                        : 'cursor-default'
                    }`}
                    onClick={() => {
                      if (canEditSnag(snag)) setModal(snag)
                    }}
                  >
                    <span
                      className={`badge ${sevBadge(
                        snag.severity
                      )} mt-0.5 flex-shrink-0`}
                    >
                      {snag.severity}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-[#bfb9ae]">
                        #{snag.snag_number} — {snag.title}
                      </div>

                      {snag.location && (
                        <div className="text-[10px] text-[#6e7d8c]">
                          {snag.location}
                        </div>
                      )}
                    </div>

                    <span
                      className={`badge ${statBadge(
                        snag.status
                      )} flex-shrink-0`}
                    >
                      {snag.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'list' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Room</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th className="hide-mobile">Raised</th>
                  <th className="hide-mobile">Target Close</th>
                  <th className="hide-mobile">Contractor</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="text-center py-6 text-[#6e7d8c]"
                    >
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="text-center py-8 text-[#6e7d8c]"
                    >
                      {snags.length === 0
                        ? 'No snags logged yet — great sign! ✅'
                        : 'No snags match filters.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map(snag => (
                    <tr key={snag.id}>
                      <td className="font-mono text-[10px] text-[#6e7d8c]">
                        #{snag.snag_number}
                      </td>

                      <td
                        className="font-medium text-[#ede8de] max-w-[200px] truncate"
                        title={snag.title}
                      >
                        {snag.title}
                      </td>

                      <td className="text-[11px] text-[#6e7d8c]">
                        {snag.room || '—'}
                      </td>

                      <td>
                        <span className={`badge ${sevBadge(snag.severity)}`}>
                          {snag.severity}
                        </span>
                      </td>

                      <td>
                        <span className={`badge ${statBadge(snag.status)}`}>
                          {snag.status}
                        </span>
                      </td>

                      <td className="hide-mobile">
                        {fdate(snag.raised_date)}
                      </td>

                      <td className="hide-mobile">
                        {fdate(snag.target_close_date)}
                      </td>

                      <td className="hide-mobile text-[11px] text-[#6e7d8c]">
                        {snag.assigned_contractor || '—'}
                      </td>

                      <td>
                        {canEditSnag(snag) ? (
                          <button
                            className="tbl-action"
                            onClick={() => setModal(snag)}
                          >
                            Edit
                          </button>
                        ) : (
                          <span className="text-[#6e7d8c] text-[11px]">
                            View
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal !== null && (
        <SnagModal
          item={modal === 'new' ? null : (modal as Snag)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

import { useState } from 'react'
import { Plus, X, Star, Trash2 } from 'lucide-react'
import {
  useMeetings,
  useUpsertMeeting,
  useContractorScores,
  useUpsertContractorScore,
  useProjectTeam,
  useUpsertProjectTeamMember,
  useDeleteProjectTeamMember,
} from '@/hooks/useData'
import { useAuthStore } from '@/store/auth'
import { fdate } from '@/lib/utils'
import type { Meeting, ContractorScore } from '@/types'

const TEAM_ROLES = [
  'Client / Developer',
  'Architect',
  'Structural Engineer',
  'M&E Engineer',
  'MEP',
  'Main Contractor',
  'Contractor',
  'Consultant',
  'Vendor',
  'Subcontractor',
  'Interior Designer',
  'Landscaping Contractor',
  'Specialist Contractor',
  'Other',
]

function isContractorRole(role?: string | null) {
  const clean = String(role || '').toLowerCase()

  return (
    clean.includes('contractor') ||
    clean.includes('vendor') ||
    clean.includes('subcontractor') ||
    clean.includes('specialist') ||
    clean.includes('consultant')
  )
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map(word => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function MeetingModal({
  item,
  onClose,
}: {
  item: Meeting | null
  onClose: () => void
}) {
  const upsert = useUpsertMeeting()
  const { user } = useAuthStore()

  const [form, setForm] = useState({
    title: item?.title || '',
    meeting_date: item?.meeting_date || new Date().toISOString().slice(0, 10),
    meeting_type: item?.meeting_type || 'Site',
    location: item?.location || '',
    attendees: item?.attendees || '',
    agenda: item?.agenda || '',
    minutes: item?.minutes || '',
    action_points: item?.action_points || '',
    next_meeting_date: item?.next_meeting_date || '',
  })

  const set = (key: string, value: any) =>
    setForm(current => ({ ...current, [key]: value }))

  const save = async () => {
    await upsert.mutateAsync({
      id: item?.id,
      ...form,
      created_by: user?.id,
    })

    onClose()
  }

  return (
    <div
      className="modal-overlay"
      onClick={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="modal max-w-2xl" onClick={event => event.stopPropagation()}>
        <div className="gold-bar" />

        <div className="modal-head">
          <div className="modal-title">
            {item ? 'Edit Meeting' : 'Record Meeting'}
          </div>

          <button
            onClick={onClose}
            className="text-[#6e7d8c] hover:text-[#ede8de]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="form-label">Meeting Title *</label>
            <input
              className="form-control"
              value={form.title}
              onChange={event => set('title', event.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-control"
                value={form.meeting_date}
                onChange={event => set('meeting_date', event.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Type</label>
              <select
                className="form-control"
                value={form.meeting_type}
                onChange={event => set('meeting_type', event.target.value)}
              >
                {['Site', 'Design', 'Client', 'Contractor', 'Progress', 'Other'].map(
                  type => (
                    <option key={type}>{type}</option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="form-label">Location</label>
              <input
                className="form-control"
                value={form.location}
                onChange={event => set('location', event.target.value)}
                placeholder="Site / Teams / Office…"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Attendees</label>
            <textarea
              className="form-control"
              rows={2}
              value={form.attendees}
              onChange={event => set('attendees', event.target.value)}
              placeholder="List attendees…"
            />
          </div>

          <div>
            <label className="form-label">Agenda</label>
            <textarea
              className="form-control"
              rows={3}
              value={form.agenda}
              onChange={event => set('agenda', event.target.value)}
              placeholder="Meeting agenda items…"
            />
          </div>

          <div>
            <label className="form-label">Minutes / Discussion</label>
            <textarea
              className="form-control"
              rows={5}
              value={form.minutes}
              onChange={event => set('minutes', event.target.value)}
              placeholder="Record of discussion…"
            />
          </div>

          <div>
            <label className="form-label">Action Points</label>
            <textarea
              className="form-control"
              rows={4}
              value={form.action_points}
              onChange={event => set('action_points', event.target.value)}
              placeholder="Action · Owner · Due Date"
            />
          </div>

          <div>
            <label className="form-label">Next Meeting</label>
            <input
              type="date"
              className="form-control"
              value={form.next_meeting_date}
              onChange={event => set('next_meeting_date', event.target.value)}
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
            {upsert.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TeamMemberModal({
  item,
  onClose,
}: {
  item?: any | null
  onClose: () => void
}) {
  const upsert = useUpsertProjectTeamMember()

  const [form, setForm] = useState({
    company_name: item?.company_name || '',
    role: item?.role || 'Contractor',
    contact_person: item?.contact_person || '',
    email: item?.email || '',
    phone: item?.phone || '',
  })

  const set = (key: string, value: any) =>
    setForm(current => ({ ...current, [key]: value }))

  const save = async () => {
    if (!form.company_name.trim()) return

    await upsert.mutateAsync({
      id: item?.id,
      company_name: form.company_name.trim(),
      role: form.role,
      contact_person: form.contact_person.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
    })

    onClose()
  }

  return (
    <div
      className="modal-overlay"
      onClick={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="modal" onClick={event => event.stopPropagation()}>
        <div className="gold-bar" />

        <div className="modal-head">
          <div className="modal-title">
            {item ? 'Edit Team Member' : 'Add Team Member'}
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
            <label className="form-label">Company Name *</label>
            <input
              className="form-control"
              value={form.company_name}
              onChange={event => set('company_name', event.target.value)}
              placeholder="e.g. Pinconsult Ltd"
            />
          </div>

          <div>
            <label className="form-label">Role</label>
            <select
              className="form-control"
              value={form.role}
              onChange={event => set('role', event.target.value)}
            >
              {TEAM_ROLES.map(role => (
                <option key={role}>{role}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Contact Person</label>
            <input
              className="form-control"
              value={form.contact_person}
              onChange={event => set('contact_person', event.target.value)}
              placeholder="Name of representative"
            />
          </div>

          <div>
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={form.email}
              onChange={event => set('email', event.target.value)}
              placeholder="name@company.com"
            />
          </div>

          <div>
            <label className="form-label">Phone</label>
            <input
              className="form-control"
              value={form.phone}
              onChange={event => set('phone', event.target.value)}
              placeholder="+234..."
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
            {upsert.isPending ? 'Saving…' : 'Save Team Member'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ScoreModal({
  team,
  onClose,
}: {
  team: any[]
  onClose: () => void
}) {
  const upsert = useUpsertContractorScore()
  const { user } = useAuthStore()

  const contractorOptions = team.filter(member => isContractorRole(member.role))

  const [form, setForm] = useState({
    contractor_name: contractorOptions[0]?.company_name || '',
    period_month: new Date().getMonth() + 1,
    period_year: new Date().getFullYear(),
    quality_score: 7,
    programme_score: 7,
    safety_score: 8,
    communication_score: 7,
    notes: '',
  })

  const set = (key: string, value: any) =>
    setForm(current => ({ ...current, [key]: value }))

  const avg = (
    (form.quality_score +
      form.programme_score +
      form.safety_score +
      form.communication_score) /
    4
  ).toFixed(1)

  const save = async () => {
    if (!form.contractor_name) return

    await upsert.mutateAsync({
      ...form,
      scored_by: user?.id,
    })

    onClose()
  }

  const ScoreSlider = ({ label, k }: { label: string; k: string }) => (
    <div>
      <div className="flex justify-between mb-1">
        <label className="form-label mb-0">{label}</label>
        <span className="text-[12px] font-bold font-mono text-[#c49e48]">
          {(form as any)[k]}/10
        </span>
      </div>

      <input
        type="range"
        min={1}
        max={10}
        value={(form as any)[k]}
        onChange={event => set(k, +event.target.value)}
        className="w-full accent-[#c49e48]"
      />

      <div className="flex justify-between text-[9px] text-[#6e7d8c]">
        <span>Poor</span>
        <span>Excellent</span>
      </div>
    </div>
  )

  return (
    <div
      className="modal-overlay"
      onClick={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="modal" onClick={event => event.stopPropagation()}>
        <div className="gold-bar" />

        <div className="modal-head">
          <div className="modal-title">Score Contractor Performance</div>

          <button
            onClick={onClose}
            className="text-[#6e7d8c] hover:text-[#ede8de]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {contractorOptions.length === 0 ? (
            <div className="empty-state py-8">
              <p>
                No contractor, consultant, vendor, or subcontractor has been
                added to this project team yet.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="form-label">Contractor / Consultant</label>
                <select
                  className="form-control"
                  value={form.contractor_name}
                  onChange={event => set('contractor_name', event.target.value)}
                >
                  {contractorOptions.map(member => (
                    <option key={member.id} value={member.company_name}>
                      {member.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Month</label>
                  <select
                    className="form-control"
                    value={form.period_month}
                    onChange={event => set('period_month', +event.target.value)}
                  >
                    {Array.from({ length: 12 }, (_, index) => (
                      <option key={index + 1} value={index + 1}>
                        {new Date(0, index).toLocaleString('en', {
                          month: 'long',
                        })}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Year</label>
                  <input
                    type="number"
                    className="form-control"
                    value={form.period_year}
                    onChange={event => set('period_year', +event.target.value)}
                  />
                </div>
              </div>

              <div className="bg-[#1c2a36] rounded-lg p-4 space-y-4">
                <ScoreSlider label="Quality of Work" k="quality_score" />
                <ScoreSlider label="Programme Adherence" k="programme_score" />
                <ScoreSlider label="Safety Compliance" k="safety_score" />
                <ScoreSlider label="Communication" k="communication_score" />

                <div className="flex justify-between items-center pt-2 border-t border-white/[0.06]">
                  <span className="text-[10px] font-mono text-[#6e7d8c] uppercase tracking-widest">
                    Overall Average
                  </span>

                  <span
                    className={`font-display text-3xl font-bold ${
                      +avg >= 8
                        ? 'text-emerald-400'
                        : +avg >= 6
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }`}
                  >
                    {avg}
                  </span>
                </div>
              </div>

              <div>
                <label className="form-label">Notes</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={form.notes}
                  onChange={event => set('notes', event.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 justify-end px-5 py-3 border-t border-white/[0.06]">
          <button className="btn-ghost btn-sm btn" onClick={onClose}>
            Cancel
          </button>

          <button
            className="btn-gold btn-sm btn"
            onClick={save}
            disabled={upsert.isPending || contractorOptions.length === 0}
          >
            {upsert.isPending ? 'Saving…' : 'Save Score'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TeamPage() {
  const { data: meetings = [], isLoading: meetingLoading } = useMeetings()
  const { data: scores = [] } = useContractorScores()
  const { data: team = [], isLoading: teamLoading } = useProjectTeam()

  const deleteMember = useDeleteProjectTeamMember()

  const [meetingModal, setMeetingModal] = useState<Meeting | null | 'new'>(null)
  const [scoreModal, setScoreModal] = useState(false)
  const [teamModal, setTeamModal] = useState<any | null | 'new'>(null)
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)

  const latestScores: Record<string, ContractorScore> = {}

  scores.forEach(score => {
    if (!latestScores[score.contractor_name]) {
      latestScores[score.contractor_name] = score
    }
  })

  const scoredTeam = team.filter(member =>
    Object.keys(latestScores).includes(member.company_name)
  )

  async function removeMember(member: any) {
    if (!window.confirm(`Remove ${member.company_name} from this project team?`)) {
      return
    }

    await deleteMember.mutateAsync(member.id)
  }

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Project Team</div>
            <div className="text-[11px] text-[#6e7d8c] mt-1">
              Project-specific companies and consultants assigned to this
              project.
            </div>
          </div>

          <button
            className="btn-gold btn-sm btn"
            onClick={() => setTeamModal('new')}
          >
            <Plus size={13} />
            Add Team Member
          </button>
        </div>

        {teamLoading ? (
          <div className="empty-state py-8">
            <p>Loading project team…</p>
          </div>
        ) : team.length === 0 ? (
          <div className="empty-state py-8">
            <p>No project team members added yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {team.map(member => (
              <div
                key={member.id}
                className="flex items-center gap-4 px-4 py-3"
              >
                <div className="w-9 h-9 rounded-full bg-[#c49e48]/10 border border-[#c49e48]/20 flex items-center justify-center text-[11px] font-bold text-[#c49e48] flex-shrink-0">
                  {getInitials(member.company_name)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#ede8de] truncate">
                    {member.company_name}
                  </div>

                  <div className="text-[11px] text-[#6e7d8c]">
                    {member.role || 'Team Member'}
                  </div>

                  {(member.contact_person || member.email || member.phone) && (
                    <div className="text-[10px] text-[#6e7d8c] mt-1 truncate">
                      {member.contact_person || 'No contact person'}
                      {member.email ? ` • ${member.email}` : ''}
                      {member.phone ? ` • ${member.phone}` : ''}
                    </div>
                  )}
                </div>

                <div className="flex gap-1">
                  <button
                    className="tbl-action"
                    onClick={() => setTeamModal(member)}
                  >
                    Edit
                  </button>

                  <button
                    className="tbl-action text-red-400"
                    onClick={() => removeMember(member)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Contractor Performance</div>
            <div className="text-[11px] text-[#6e7d8c] mt-1">
              Scores are based only on contractors, consultants, vendors, and
              subcontractors added to this project team.
            </div>
          </div>

          <button
            className="btn-gold btn-sm btn"
            onClick={() => setScoreModal(true)}
          >
            <Star size={12} />
            Score
          </button>
        </div>

        {Object.keys(latestScores).length === 0 || scoredTeam.length === 0 ? (
          <div className="empty-state py-8">
            <p>No contractor scores yet. Score your first team member above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Contractor</th>
                  <th>Quality</th>
                  <th>Programme</th>
                  <th>Safety</th>
                  <th>Comms</th>
                  <th>Overall</th>
                  <th>Period</th>
                </tr>
              </thead>

              <tbody>
                {scoredTeam.map(member => {
                  const score = latestScores[member.company_name]
                  const overall = score?.overall_score || 0

                  const color =
                    overall >= 8
                      ? 'text-emerald-400'
                      : overall >= 6
                      ? 'text-amber-400'
                      : 'text-red-400'

                  const bar = (value: number | undefined) => (
                    <div className="flex items-center gap-1.5">
                      <div className="h-1 w-12 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#c49e48] rounded-full"
                          style={{
                            width: `${((value || 0) / 10) * 100}%`,
                          }}
                        />
                      </div>

                      <span className="text-[11px] font-mono">
                        {value || '—'}
                      </span>
                    </div>
                  )

                  return (
                    <tr key={member.id}>
                      <td className="text-[#ede8de] font-medium">
                        {member.company_name}
                      </td>
                      <td>{bar(score?.quality_score)}</td>
                      <td>{bar(score?.programme_score)}</td>
                      <td>{bar(score?.safety_score)}</td>
                      <td>{bar(score?.communication_score)}</td>
                      <td>
                        <span
                          className={`font-display text-2xl font-bold ${color}`}
                        >
                          {overall.toFixed(1)}
                        </span>
                      </td>
                      <td className="text-[10px] text-[#6e7d8c] font-mono">
                        {score?.period_month}/{score?.period_year}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Meeting Minutes</div>

          <button
            className="btn-gold btn-sm btn"
            onClick={() => setMeetingModal('new')}
          >
            <Plus size={13} />
            Record Meeting
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Type</th>
                <th className="hide-mobile">Location</th>
                <th className="hide-mobile">Next Meeting</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {meetingLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-[#6e7d8c]">
                    Loading…
                  </td>
                </tr>
              ) : (
                meetings.map(meeting => (
                  <tr key={meeting.id}>
                    <td className="font-medium text-[#ede8de]">
                      {fdate(meeting.meeting_date)}
                    </td>

                    <td className="max-w-[200px] truncate">{meeting.title}</td>

                    <td>
                      <span className="badge badge-muted">
                        {meeting.meeting_type}
                      </span>
                    </td>

                    <td className="hide-mobile text-[11px] text-[#6e7d8c]">
                      {meeting.location || '—'}
                    </td>

                    <td className="hide-mobile">
                      {fdate(meeting.next_meeting_date)}
                    </td>

                    <td>
                      <div className="flex gap-1">
                        <button
                          className="tbl-action"
                          onClick={() => setSelectedMeeting(meeting)}
                        >
                          View
                        </button>

                        <button
                          className="tbl-action"
                          onClick={() => setMeetingModal(meeting)}
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}

              {!meetingLoading && meetings.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[#6e7d8c]">
                    No meetings recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedMeeting && (
        <div className="modal-overlay" onClick={() => setSelectedMeeting(null)}>
          <div
            className="modal max-w-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="gold-bar" />

            <div className="modal-head">
              <div className="modal-title">{selectedMeeting.title}</div>

              <button
                onClick={() => setSelectedMeeting(null)}
                className="text-[#6e7d8c] hover:text-[#ede8de]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
                <div className="bg-[#1c2a36] rounded p-2">
                  <div className="text-[8.5px] font-mono text-[#6e7d8c] uppercase mb-1">
                    Date
                  </div>
                  {fdate(selectedMeeting.meeting_date, 'dd MMMM yyyy')}
                </div>

                <div className="bg-[#1c2a36] rounded p-2">
                  <div className="text-[8.5px] font-mono text-[#6e7d8c] uppercase mb-1">
                    Type
                  </div>
                  {selectedMeeting.meeting_type}
                </div>

                <div className="bg-[#1c2a36] rounded p-2">
                  <div className="text-[8.5px] font-mono text-[#6e7d8c] uppercase mb-1">
                    Location
                  </div>
                  {selectedMeeting.location || '—'}
                </div>
              </div>

              {selectedMeeting.attendees && (
                <div>
                  <div className="form-label">Attendees</div>
                  <div className="text-[12px] text-[#bfb9ae] bg-[#1c2a36] rounded p-2.5 whitespace-pre-wrap">
                    {selectedMeeting.attendees}
                  </div>
                </div>
              )}

              {selectedMeeting.agenda && (
                <div>
                  <div className="form-label">Agenda</div>
                  <div className="text-[12px] text-[#bfb9ae] bg-[#1c2a36] rounded p-2.5 whitespace-pre-wrap">
                    {selectedMeeting.agenda}
                  </div>
                </div>
              )}

              {selectedMeeting.minutes && (
                <div>
                  <div className="form-label">Minutes</div>
                  <div className="text-[12px] text-[#bfb9ae] bg-[#1c2a36] rounded p-2.5 whitespace-pre-wrap">
                    {selectedMeeting.minutes}
                  </div>
                </div>
              )}

              {selectedMeeting.action_points && (
                <div>
                  <div className="form-label">Action Points</div>
                  <div className="text-[12px] text-[#bfb9ae] bg-[#1c2a36] rounded p-2.5 whitespace-pre-wrap font-mono">
                    {selectedMeeting.action_points}
                  </div>
                </div>
              )}

              {selectedMeeting.next_meeting_date && (
                <div className="text-[11px] text-[#6e7d8c]">
                  Next meeting: {fdate(selectedMeeting.next_meeting_date)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {meetingModal !== null && (
        <MeetingModal
          item={meetingModal === 'new' ? null : (meetingModal as Meeting)}
          onClose={() => setMeetingModal(null)}
        />
      )}

      {teamModal !== null && (
        <TeamMemberModal
          item={teamModal === 'new' ? null : teamModal}
          onClose={() => setTeamModal(null)}
        />
      )}

      {scoreModal && <ScoreModal team={team} onClose={() => setScoreModal(false)} />}
    </div>
  )
}

import { useState } from 'react'
import { Plus, X, Star } from 'lucide-react'
import { useMeetings, useUpsertMeeting, useContractorScores, useUpsertContractorScore } from '@/hooks/useData'
import { useAuthStore } from '@/store/auth'
import { fdate } from '@/lib/utils'
import type { Meeting, ContractorScore } from '@/types'

const CONTRACTORS = [
  'Main Contractor', 'Pinconsult Ltd (Structural)', 'OMIJLED Engineering (MEP)',
  'Hammam Specialist', 'Koi Pond Specialist', 'ELV Contractor',
  'Interior Designer', 'Landscaping Contractor', 'Driveway Contractor'
]

const PROJECT_TEAM = [
  { name: 'Mixta Africa', role: 'Client / Developer', contact: 'Lagos' },
  { name: 'Moss & Coin Ltd', role: 'Architect', contact: '' },
  { name: 'Pinconsult Ltd', role: 'Structural Engineer', contact: '' },
  { name: 'OMIJLED Engineering Services Ltd', role: 'M&E Engineer', contact: '' },
]

function MeetingModal({ item, onClose }: { item: Meeting | null; onClose: () => void }) {
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
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const save = async () => { await upsert.mutateAsync({ id: item?.id, ...form, created_by: user?.id }); onClose() }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="gold-bar" />
        <div className="modal-head">
          <div className="modal-title">{item ? 'Edit Meeting' : 'Record Meeting'}</div>
          <button onClick={onClose} className="text-[#6e7d8c] hover:text-[#ede8de]"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div><label className="form-label">Meeting Title *</label><input className="form-control" value={form.title} onChange={e => set('title', e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="form-label">Date</label><input type="date" className="form-control" value={form.meeting_date} onChange={e => set('meeting_date', e.target.value)} /></div>
            <div><label className="form-label">Type</label><select className="form-control" value={form.meeting_type} onChange={e => set('meeting_type', e.target.value)}>{['Site','Design','Client','Contractor','Progress','Other'].map(t => <option key={t}>{t}</option>)}</select></div>
            <div><label className="form-label">Location</label><input className="form-control" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Site / Teams / Office…" /></div>
          </div>
          <div><label className="form-label">Attendees</label><textarea className="form-control" rows={2} value={form.attendees} onChange={e => set('attendees', e.target.value)} placeholder="List attendees…" /></div>
          <div><label className="form-label">Agenda</label><textarea className="form-control" rows={3} value={form.agenda} onChange={e => set('agenda', e.target.value)} placeholder="Meeting agenda items…" /></div>
          <div><label className="form-label">Minutes / Discussion</label><textarea className="form-control" rows={5} value={form.minutes} onChange={e => set('minutes', e.target.value)} placeholder="Record of discussion…" /></div>
          <div><label className="form-label">Action Points</label><textarea className="form-control" rows={4} value={form.action_points} onChange={e => set('action_points', e.target.value)} placeholder="Action · Owner · Due Date" /></div>
          <div><label className="form-label">Next Meeting</label><input type="date" className="form-control" value={form.next_meeting_date} onChange={e => set('next_meeting_date', e.target.value)} /></div>
        </div>
        <div className="flex gap-2 justify-end px-5 py-3 border-t border-white/[0.06]">
          <button className="btn-ghost btn-sm btn" onClick={onClose}>Cancel</button>
          <button className="btn-gold btn-sm btn" onClick={save} disabled={upsert.isPending}>{upsert.isPending ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}

function ScoreModal({ onClose }: { onClose: () => void }) {
  const upsert = useUpsertContractorScore()
  const { user } = useAuthStore()
  const [form, setForm] = useState({
    contractor_name: CONTRACTORS[0],
    period_month: new Date().getMonth() + 1,
    period_year: new Date().getFullYear(),
    quality_score: 7,
    programme_score: 7,
    safety_score: 8,
    communication_score: 7,
    notes: '',
  })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const avg = ((form.quality_score + form.programme_score + form.safety_score + form.communication_score) / 4).toFixed(1)
  const save = async () => { await upsert.mutateAsync({ ...form, scored_by: user?.id }); onClose() }

  const ScoreSlider = ({ label, k }: { label: string; k: string }) => (
    <div>
      <div className="flex justify-between mb-1">
        <label className="form-label mb-0">{label}</label>
        <span className="text-[12px] font-bold font-mono text-[#c49e48]">{(form as any)[k]}/10</span>
      </div>
      <input type="range" min={1} max={10} value={(form as any)[k]} onChange={e => set(k, +e.target.value)} className="w-full accent-[#c49e48]" />
      <div className="flex justify-between text-[9px] text-[#6e7d8c]"><span>Poor</span><span>Excellent</span></div>
    </div>
  )

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="gold-bar" />
        <div className="modal-head">
          <div className="modal-title">Score Contractor Performance</div>
          <button onClick={onClose} className="text-[#6e7d8c] hover:text-[#ede8de]"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div><label className="form-label">Contractor</label><select className="form-control" value={form.contractor_name} onChange={e => set('contractor_name', e.target.value)}>{CONTRACTORS.map(c => <option key={c}>{c}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Month</label><select className="form-control" value={form.period_month} onChange={e => set('period_month', +e.target.value)}>{Array.from({length:12},(_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('en', {month:'long'})}</option>)}</select></div>
            <div><label className="form-label">Year</label><input type="number" className="form-control" value={form.period_year} onChange={e => set('period_year', +e.target.value)} /></div>
          </div>
          <div className="bg-[#1c2a36] rounded-lg p-4 space-y-4">
            <ScoreSlider label="Quality of Work" k="quality_score" />
            <ScoreSlider label="Programme Adherence" k="programme_score" />
            <ScoreSlider label="Safety Compliance" k="safety_score" />
            <ScoreSlider label="Communication" k="communication_score" />
            <div className="flex justify-between items-center pt-2 border-t border-white/[0.06]">
              <span className="text-[10px] font-mono text-[#6e7d8c] uppercase tracking-widest">Overall Average</span>
              <span className={`font-display text-3xl font-bold ${+avg >= 8 ? 'text-emerald-400' : +avg >= 6 ? 'text-amber-400' : 'text-red-400'}`}>{avg}</span>
            </div>
          </div>
          <div><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
        </div>
        <div className="flex gap-2 justify-end px-5 py-3 border-t border-white/[0.06]">
          <button className="btn-ghost btn-sm btn" onClick={onClose}>Cancel</button>
          <button className="btn-gold btn-sm btn" onClick={save} disabled={upsert.isPending}>{upsert.isPending ? 'Saving…' : 'Save Score'}</button>
        </div>
      </div>
    </div>
  )
}

export default function TeamPage() {
  const { data: meetings = [], isLoading: mLoad } = useMeetings()
  const { data: scores = [], isLoading: sLoad } = useContractorScores()
  const [meetingModal, setMeetingModal] = useState<Meeting | null | 'new'>(null)
  const [scoreModal, setScoreModal] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)

  // Latest scores per contractor
  const latestScores: Record<string, ContractorScore> = {}
  scores.forEach(s => {
    if (!latestScores[s.contractor_name]) latestScores[s.contractor_name] = s
  })

  return (
    <div className="space-y-5">
      {/* Project Team */}
      <div className="card">
        <div className="card-head"><div className="card-title">Project Team</div></div>
        <div className="divide-y divide-white/[0.04]">
          {PROJECT_TEAM.map(t => (
            <div key={t.name} className="flex items-center gap-4 px-4 py-3">
              <div className="w-9 h-9 rounded-full bg-[#c49e48]/10 border border-[#c49e48]/20 flex items-center justify-center text-[11px] font-bold text-[#c49e48] flex-shrink-0">
                {t.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-medium text-[#ede8de]">{t.name}</div>
                <div className="text-[11px] text-[#6e7d8c]">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contractor Scores */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Contractor Performance</div>
          <button className="btn-gold btn-sm btn" onClick={() => setScoreModal(true)}><Star size={12} /> Score</button>
        </div>
        {Object.keys(latestScores).length === 0 ? (
          <div className="empty-state py-8"><p>No contractor scores yet. Score your first contractor above.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Contractor</th><th>Quality</th><th>Programme</th><th>Safety</th><th>Comms</th><th>Overall</th><th>Period</th></tr></thead>
              <tbody>
                {Object.values(latestScores).map(s => {
                  const overall = s.overall_score || 0
                  const c = overall >= 8 ? 'text-emerald-400' : overall >= 6 ? 'text-amber-400' : 'text-red-400'
                  const bar = (v: number | undefined) => (
                    <div className="flex items-center gap-1.5">
                      <div className="h-1 w-12 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-[#c49e48] rounded-full" style={{ width: `${((v || 0) / 10) * 100}%` }} />
                      </div>
                      <span className="text-[11px] font-mono">{v || '—'}</span>
                    </div>
                  )
                  return (
                    <tr key={s.id}>
                      <td className="text-[#ede8de] font-medium">{s.contractor_name}</td>
                      <td>{bar(s.quality_score)}</td>
                      <td>{bar(s.programme_score)}</td>
                      <td>{bar(s.safety_score)}</td>
                      <td>{bar(s.communication_score)}</td>
                      <td><span className={`font-display text-2xl font-bold ${c}`}>{overall.toFixed(1)}</span></td>
                      <td className="text-[10px] text-[#6e7d8c] font-mono">{s.period_month}/{s.period_year}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Meeting Minutes */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Meeting Minutes</div>
          <button className="btn-gold btn-sm btn" onClick={() => setMeetingModal('new')}><Plus size={13} /> Record Meeting</button>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Date</th><th>Title</th><th>Type</th><th className="hide-mobile">Location</th><th className="hide-mobile">Next Meeting</th><th></th></tr></thead>
            <tbody>
              {mLoad ? <tr><td colSpan={6} className="text-center py-6 text-[#6e7d8c]">Loading…</td></tr>
                : meetings.map(m => (
                <tr key={m.id}>
                  <td className="font-medium text-[#ede8de]">{fdate(m.meeting_date)}</td>
                  <td className="max-w-[200px] truncate">{m.title}</td>
                  <td><span className="badge badge-muted">{m.meeting_type}</span></td>
                  <td className="hide-mobile text-[11px] text-[#6e7d8c]">{m.location || '—'}</td>
                  <td className="hide-mobile">{fdate(m.next_meeting_date)}</td>
                  <td>
                    <div className="flex gap-1">
                      <button className="tbl-action" onClick={() => setSelectedMeeting(m)}>View</button>
                      <button className="tbl-action" onClick={() => setMeetingModal(m)}>Edit</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!mLoad && meetings.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-[#6e7d8c]">No meetings recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Meeting detail viewer */}
      {selectedMeeting && (
        <div className="modal-overlay" onClick={() => setSelectedMeeting(null)}>
          <div className="modal max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="gold-bar" />
            <div className="modal-head">
              <div className="modal-title">{selectedMeeting.title}</div>
              <button onClick={() => setSelectedMeeting(null)} className="text-[#6e7d8c] hover:text-[#ede8de]"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="bg-[#1c2a36] rounded p-2"><div className="text-[8.5px] font-mono text-[#6e7d8c] uppercase mb-1">Date</div>{fdate(selectedMeeting.meeting_date, 'dd MMMM yyyy')}</div>
                <div className="bg-[#1c2a36] rounded p-2"><div className="text-[8.5px] font-mono text-[#6e7d8c] uppercase mb-1">Type</div>{selectedMeeting.meeting_type}</div>
                <div className="bg-[#1c2a36] rounded p-2"><div className="text-[8.5px] font-mono text-[#6e7d8c] uppercase mb-1">Location</div>{selectedMeeting.location || '—'}</div>
              </div>
              {selectedMeeting.attendees && <div><div className="form-label">Attendees</div><div className="text-[12px] text-[#bfb9ae] bg-[#1c2a36] rounded p-2.5 whitespace-pre-wrap">{selectedMeeting.attendees}</div></div>}
              {selectedMeeting.agenda && <div><div className="form-label">Agenda</div><div className="text-[12px] text-[#bfb9ae] bg-[#1c2a36] rounded p-2.5 whitespace-pre-wrap">{selectedMeeting.agenda}</div></div>}
              {selectedMeeting.minutes && <div><div className="form-label">Minutes</div><div className="text-[12px] text-[#bfb9ae] bg-[#1c2a36] rounded p-2.5 whitespace-pre-wrap">{selectedMeeting.minutes}</div></div>}
              {selectedMeeting.action_points && <div><div className="form-label">Action Points</div><div className="text-[12px] text-[#bfb9ae] bg-[#1c2a36] rounded p-2.5 whitespace-pre-wrap font-mono">{selectedMeeting.action_points}</div></div>}
              {selectedMeeting.next_meeting_date && <div className="text-[11px] text-[#6e7d8c]">Next meeting: {fdate(selectedMeeting.next_meeting_date)}</div>}
            </div>
          </div>
        </div>
      )}

      {meetingModal !== null && <MeetingModal item={meetingModal === 'new' ? null : meetingModal as Meeting} onClose={() => setMeetingModal(null)} />}
      {scoreModal && <ScoreModal onClose={() => setScoreModal(false)} />}
    </div>
  )
}

import { useMemo, useState } from 'react'
import { CalendarClock, Link2, History, Info, Loader2 } from 'lucide-react'
import { Drawer, DrawerTabs } from '@/components/ui/Drawer'
import EmptyState from '@/components/ui/EmptyState'
import { fdate } from '@/lib/utils'
import { useRecordContext } from '@/hooks/useRecordContext'
import type { RecordSummary } from './recordTypes'

interface RecordContextDrawerProps {
  record: RecordSummary | null
  onClose: () => void
  onEdit?: () => void
}

export function RecordContextDrawer({ record, onClose, onEdit }: RecordContextDrawerProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const { related, timeline, loading } = useRecordContext(record)

  const tabs = useMemo(() => [
    { id: 'overview', label: 'Overview' },
    { id: 'related', label: 'Related records', count: related.length },
    { id: 'timeline', label: 'Timeline', count: timeline.length },
    { id: 'history', label: 'History', count: timeline.filter(event => event.id.startsWith('audit-')).length },
  ], [related.length, timeline])

  return (
    <Drawer
      open={Boolean(record)}
      onClose={onClose}
      title={record?.title || 'Record details'}
      description={record?.subtitle}
      eyebrow={record?.kind ? `${record.kind} record` : undefined}
      width="xl"
      headerActions={onEdit ? <button type="button" className="btn btn-sm btn-secondary" onClick={onEdit}>Edit record</button> : undefined}
    >
      {record && (
        <div className="record-context">
          <DrawerTabs items={tabs} activeId={activeTab} onChange={setActiveTab} />

          {activeTab === 'overview' && (
            <div className="record-context__section">
              <div className="record-context__summary-grid">
                <div className="record-context__summary-card"><span>Status</span><strong>{record.status || 'Not specified'}</strong></div>
                <div className="record-context__summary-card"><span>Created</span><strong>{record.createdAt ? fdate(record.createdAt) : 'Not available'}</strong></div>
                <div className="record-context__summary-card"><span>Last updated</span><strong>{record.updatedAt ? fdate(record.updatedAt) : 'Not available'}</strong></div>
                <div className="record-context__summary-card"><span>Linked records</span><strong>{loading ? 'Checking…' : related.length}</strong></div>
              </div>

              {record.metadata?.length ? (
                <div className="record-context__panel">
                  <div className="record-context__panel-title"><Info size={16} /> Record information</div>
                  <dl className="record-context__metadata">
                    {record.metadata.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value ?? '—'}</dd></div>)}
                  </dl>
                </div>
              ) : null}

              {record.notes ? <div className="record-context__panel"><div className="record-context__panel-title">Latest note</div><p>{record.notes}</p></div> : null}
            </div>
          )}

          {activeTab === 'related' && (
            <div className="record-context__section">
              {loading ? <div className="record-context__loading"><Loader2 size={18} className="animate-spin" /> Finding connected records…</div> : related.length ? related.map(item => (
                <div className="record-context__related" key={`${item.kind}-${item.id}`}>
                  <div className="record-context__related-icon"><Link2 size={16} /></div>
                  <div><strong>{item.title}</strong><span>{item.relationship} · {item.kind}</span></div>
                  {item.status && <span className="badge badge-muted">{item.status}</span>}
                </div>
              )) : <EmptyState icon={<Link2 size={22} />} title="No connected records yet" message="Link this record to a schedule activity, approval, procurement item or other project control record to create end-to-end traceability." />}
            </div>
          )}

          {(activeTab === 'timeline' || activeTab === 'history') && (
            <div className="record-context__section">
              {loading ? <div className="record-context__loading"><Loader2 size={18} className="animate-spin" /> Loading record history…</div> : (() => {
                const events = activeTab === 'history' ? timeline.filter(event => event.id.startsWith('audit-')) : timeline
                return events.length ? <div className="record-context__timeline">{events.map(event => (
                  <div className="record-context__event" key={event.id}>
                    <div className={`record-context__event-dot is-${event.tone || 'neutral'}`} />
                    <div><div className="record-context__event-head"><strong>{event.title}</strong><time>{fdate(event.occurredAt)}</time></div>{event.description && <p>{event.description}</p>}{event.actor && <span>By {event.actor}</span>}</div>
                  </div>
                ))}</div> : <EmptyState icon={activeTab === 'history' ? <History size={22} /> : <CalendarClock size={22} />} title={activeTab === 'history' ? 'No audit events recorded' : 'No timeline events yet'} message="Changes made through audited workflows will appear here automatically." />
              })()}
            </div>
          )}
        </div>
      )}
    </Drawer>
  )
}

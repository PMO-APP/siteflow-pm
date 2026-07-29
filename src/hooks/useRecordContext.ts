import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { RecordSummary, RelatedRecord, RecordTimelineEvent } from '@/components/records/recordTypes'

interface RecordContextState {
  related: RelatedRecord[]
  timeline: RecordTimelineEvent[]
  loading: boolean
}

const TABLE_BY_KIND: Record<string, string> = {
  task: 'tasks',
  procurement: 'procurement_items',
  approval: 'approvals',
  risk: 'risks',
  rfi: 'rfis',
  snag: 'snags',
  quality: 'quality_gates',
}

function titleOf(row: any) {
  return row?.title || row?.name || row?.task_name || row?.description || 'Untitled record'
}

function statusOf(row: any) {
  return row?.status || row?.rag || row?.priority || null
}

export function useRecordContext(record: RecordSummary | null): RecordContextState {
  const [state, setState] = useState<RecordContextState>({ related: [], timeline: [], loading: false })

  useEffect(() => {
    let active = true
    if (!record) {
      setState({ related: [], timeline: [], loading: false })
      return
    }

    const currentRecord = record

    async function load() {
      setState(previous => ({ ...previous, loading: true }))
      const related: RelatedRecord[] = []
      const timeline: RecordTimelineEvent[] = []

      if (currentRecord.createdAt) {
        timeline.push({ id: 'created', occurredAt: currentRecord.createdAt, title: 'Record created', description: `${currentRecord.title} was added to PMOCorex.`, tone: 'neutral' })
      }
      if (currentRecord.updatedAt && currentRecord.updatedAt !== currentRecord.createdAt) {
        timeline.push({ id: 'updated', occurredAt: currentRecord.updatedAt, title: 'Record updated', description: 'The record information or status was updated.', tone: 'positive' })
      }

      try {
        const audit = await supabase
          .from('audit_logs')
          .select('id, action, description, user_email, created_at')
          .eq('item_id', currentRecord.id)
          .order('created_at', { ascending: false })
          .limit(30)

        for (const item of audit.data || []) {
          timeline.push({
            id: `audit-${item.id}`,
            occurredAt: item.created_at,
            title: item.action || 'Activity recorded',
            description: item.description,
            actor: item.user_email,
            tone: String(item.action || '').toLowerCase().includes('delete') ? 'critical' : 'neutral',
          })
        }
      } catch {
        // Audit history is optional and should never block the drawer.
      }

      async function fetchOne(kind: string, id: string | null | undefined, relationship: string) {
        if (!id || !TABLE_BY_KIND[kind]) return
        try {
          const response = await supabase.from(TABLE_BY_KIND[kind]).select('*').eq('id', id).maybeSingle()
          if (response.data) related.push({ id: response.data.id, kind: kind as any, title: titleOf(response.data), status: statusOf(response.data), relationship })
        } catch {
          // Relationship may point to a table that is unavailable in an older deployment.
        }
      }

      await Promise.all([
        fetchOne('task', currentRecord.taskId, 'Linked schedule activity'),
        fetchOne('procurement', currentRecord.procurementId, 'Linked procurement item'),
      ])

      if (currentRecord.kind === 'task') {
        const lookups = [
          { table: 'procurement_items', kind: 'procurement', relationship: 'Procurement requirement' },
          { table: 'approvals', kind: 'approval', relationship: 'Required approval' },
          { table: 'risks', kind: 'risk', relationship: 'Schedule risk' },
          { table: 'rfis', kind: 'rfi', relationship: 'Technical clarification' },
          { table: 'quality_gates', kind: 'quality', relationship: 'Quality gate' },
        ]
        await Promise.all(lookups.map(async lookup => {
          try {
            const response = await supabase.from(lookup.table).select('*').eq('task_id', currentRecord.id).limit(50)
            for (const row of response.data || []) related.push({ id: row.id, kind: lookup.kind as any, title: titleOf(row), status: statusOf(row), relationship: lookup.relationship })
          } catch {
            // Optional relation table.
          }
        }))
      }

      timeline.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      if (active) setState({ related, timeline, loading: false })
    }

    load()
    return () => { active = false }
  }, [record])

  return state
}

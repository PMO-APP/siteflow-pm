import { supabase } from '@/lib/supabase'

export type DesignDiscipline =
  | 'Architecture'
  | 'Structural'
  | 'MEP'
  | 'Infrastructure'
  | 'Landscaping'
  | 'General'

export type DesignDrawing = {
  id: string
  project_id: number
  document_id?: string | null
  drawing_number: string
  title: string
  discipline: DesignDiscipline
  revision: string
  revision_date?: string | null
  status: 'Draft' | 'For Review' | 'Current' | 'Superseded' | 'Void'
  level?: string | null
  zone?: string | null
  file_url?: string | null
  file_path?: string | null
  file_bucket?: string | null
  file_name?: string | null
  mime_type?: string | null
  file_size?: number | null
  file_sha256?: string | null
  analysis_status?: 'Not analysed' | 'Queued' | 'Analysing' | 'Analysed' | 'Failed'
  last_analysed_at?: string | null
  notes?: string | null
  supersedes_drawing_id?: string | null
  created_at: string
  updated_at: string
}

export type DesignRule = {
  id: string
  project_id?: number | null
  code: string
  title: string
  category: string
  rule_text: string
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  active: boolean
  system_rule: boolean
  created_at: string
}

export type DesignIssue = {
  id: string
  project_id: number
  title: string
  category: string
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  confidence: 'Confirmed' | 'High' | 'Medium' | 'Low'
  status: 'Open' | 'Under Review' | 'Accepted' | 'Resolved' | 'Closed' | 'Rejected'
  source_type: 'Manual' | 'Rule' | 'Revision' | 'Clash' | 'AI'
  disciplines: string[]
  location?: string | null
  description: string
  consequence?: string | null
  recommendation?: string | null
  responsible_team?: string | null
  drawing_ids: string[]
  rule_id?: string | null
  evidence_url?: string | null
  due_date?: string | null
  created_at: string
  updated_at: string
}

export type DesignAnalysisMode = 'single_drawing' | 'revision_compare' | 'cross_discipline'

export type DesignAnalysisJob = {
  id: string
  project_id: number
  mode: DesignAnalysisMode
  drawing_ids: string[]
  status: 'Queued' | 'Analysing' | 'Completed' | 'Failed'
  provider: string
  model?: string | null
  result_summary?: string | null
  finding_count: number
  error_message?: string | null
  created_at: string
  started_at?: string | null
  completed_at?: string | null
}

export async function loadDesignIntelligence(projectId: number) {
  const [drawings, issues, rules, jobs] = await Promise.all([
    supabase
      .from('design_drawings')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
    supabase
      .from('design_coordination_issues')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
    supabase
      .from('design_rules')
      .select('*')
      .or(`project_id.is.null,project_id.eq.${projectId}`)
      .eq('active', true)
      .order('system_rule', { ascending: false })
      .order('code'),
    supabase
      .from('design_analysis_jobs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  for (const result of [drawings, issues, rules, jobs]) {
    if (result.error) throw result.error
  }

  return {
    drawings: (drawings.data || []) as DesignDrawing[],
    issues: (issues.data || []) as DesignIssue[],
    rules: (rules.data || []) as DesignRule[],
    jobs: (jobs.data || []) as DesignAnalysisJob[],
  }
}

export async function saveDesignIssue(
  projectId: number,
  issue: Partial<DesignIssue> & Pick<DesignIssue, 'title' | 'category' | 'severity' | 'description'>
) {
  const payload = {
    disciplines: [],
    drawing_ids: [],
    confidence: 'Confirmed',
    status: 'Open',
    source_type: 'Manual',
    ...issue,
    project_id: projectId,
    updated_at: new Date().toISOString(),
  }

  const query = issue.id
    ? supabase.from('design_coordination_issues').update(payload).eq('id', issue.id).eq('project_id', projectId)
    : supabase.from('design_coordination_issues').insert(payload)

  const { data, error } = await query.select().single()
  if (error) throw error
  return data as DesignIssue
}

export async function updateDesignIssue(
  projectId: number,
  issueId: string,
  patch: Partial<DesignIssue>
) {
  const { data, error } = await supabase
    .from('design_coordination_issues')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', issueId)
    .eq('project_id', projectId)
    .select()
    .single()

  if (error) throw error
  return data as DesignIssue
}

export async function getDesignDrawingUrl(drawing: DesignDrawing, expiresIn = 900) {
  if (drawing.file_path) {
    const bucket = drawing.file_bucket || 'project-files'
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(drawing.file_path, expiresIn)
    if (error) throw error
    return data.signedUrl
  }
  return drawing.file_url || null
}

export async function queueDesignAnalysis(
  projectId: number,
  drawingIds: string[],
  mode: DesignAnalysisMode
) {
  if (!drawingIds.length) throw new Error('Select at least one drawing for analysis.')
  if (mode === 'revision_compare' && drawingIds.length !== 2) {
    throw new Error('Revision comparison requires exactly two drawing revisions.')
  }

  const { data: userData } = await supabase.auth.getUser()
  const { data: job, error } = await supabase
    .from('design_analysis_jobs')
    .insert({
      project_id: projectId,
      mode,
      drawing_ids: drawingIds,
      status: 'Queued',
      requested_by: userData.user?.id || null,
    })
    .select()
    .single()
  if (error) throw error

  await supabase.from('design_drawings').update({ analysis_status: 'Queued' }).in('id', drawingIds)

  const { data, error: invokeError } = await supabase.functions.invoke('analyze-design-drawing', {
    body: { jobId: job.id },
  })
  if (invokeError) throw invokeError
  if (data?.success === false) throw new Error(data.error || 'Automated design review failed.')
  return data
}

function normalise(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase()
}

function revisionRank(value: string) {
  const clean = value.trim().toUpperCase()
  const numeric = Number(clean.replace(/[^0-9.]/g, ''))
  if (Number.isFinite(numeric) && /\d/.test(clean)) return numeric
  return clean.split('').reduce((sum, char) => sum * 27 + Math.max(1, char.charCodeAt(0) - 64), 0)
}

/**
 * Phase-one coordination review. It deliberately performs only deterministic
 * register/revision checks. PDF/DWG/IFC geometry analysis will write findings
 * into the same issue table when the processing worker is enabled.
 */
export async function runRegisterCoordinationReview(projectId: number, drawings: DesignDrawing[]) {
  const findings: Array<Partial<DesignIssue> & Pick<DesignIssue, 'title' | 'category' | 'severity' | 'description'>> = []
  const current = drawings.filter(item => item.status === 'Current')

  const required: DesignDiscipline[] = ['Architecture', 'Structural', 'MEP']
  for (const discipline of required) {
    if (!current.some(item => item.discipline === discipline)) {
      findings.push({
        title: `${discipline} coordination set is missing`,
        category: 'Discipline Coverage',
        severity: 'High',
        confidence: 'Confirmed',
        source_type: 'Rule',
        disciplines: [discipline],
        description: `No current ${discipline} drawing has been registered for this project. Cross-discipline coordination cannot be considered complete.`,
        consequence: 'Design changes or clashes may pass into construction without a coordinated reference set.',
        recommendation: `Register the current approved ${discipline} drawings and rerun coordination review.`,
        responsible_team: discipline === 'Architecture' ? 'Design' : discipline,
      })
    }
  }

  const grouped = new Map<string, DesignDrawing[]>()
  drawings.forEach(drawing => {
    const key = `${normalise(drawing.discipline)}::${normalise(drawing.drawing_number)}`
    grouped.set(key, [...(grouped.get(key) || []), drawing])
  })

  grouped.forEach(group => {
    const currents = group.filter(item => item.status === 'Current')
    if (currents.length > 1) {
      findings.push({
        title: `Multiple current revisions: ${group[0].drawing_number}`,
        category: 'Revision Control',
        severity: 'High',
        confidence: 'Confirmed',
        source_type: 'Revision',
        disciplines: [group[0].discipline],
        drawing_ids: currents.map(item => item.id),
        description: `${currents.length} revisions of ${group[0].drawing_number} are marked Current.`,
        consequence: 'Site teams may construct from conflicting information.',
        recommendation: 'Confirm the approved revision and mark all earlier revisions Superseded.',
        responsible_team: 'Design',
      })
    }

    const ranked = [...group].sort((a, b) => revisionRank(b.revision) - revisionRank(a.revision))
    const latest = ranked[0]
    const currentDrawing = group.find(item => item.status === 'Current')
    if (latest && currentDrawing && latest.id !== currentDrawing.id) {
      findings.push({
        title: `Current revision may be outdated: ${group[0].drawing_number}`,
        category: 'Revision Control',
        severity: 'Medium',
        confidence: 'High',
        source_type: 'Revision',
        disciplines: [group[0].discipline],
        drawing_ids: [currentDrawing.id, latest.id],
        description: `Revision ${currentDrawing.revision} is marked Current, while revision ${latest.revision} is also registered and appears newer.`,
        consequence: 'The approved-for-construction set may not reflect the latest issued design.',
        recommendation: 'Verify approval status before construction continues from this drawing.',
        responsible_team: 'Design',
      })
    }
  })

  const existing = await supabase
    .from('design_coordination_issues')
    .select('title,status')
    .eq('project_id', projectId)
    .in('source_type', ['Rule', 'Revision'])

  if (existing.error) throw existing.error
  const openTitles = new Set(
    (existing.data || [])
      .filter((item: any) => !['Resolved', 'Closed', 'Rejected'].includes(item.status))
      .map((item: any) => item.title)
  )

  const newFindings = findings.filter(item => !openTitles.has(item.title))
  if (newFindings.length) {
    const { error } = await supabase.from('design_coordination_issues').insert(
      newFindings.map(item => ({
        confidence: 'High',
        status: 'Open',
        source_type: 'Rule',
        disciplines: [],
        drawing_ids: [],
        ...item,
        project_id: projectId,
      }))
    )
    if (error) throw error
  }

  return { totalFindings: findings.length, newFindings: newFindings.length }
}

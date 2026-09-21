import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function outputText(response: any): string {
  if (typeof response?.output_text === 'string') return response.output_text
  for (const item of response?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && typeof content?.text === 'string') {
        return content.text
      }
    }
  }
  return ''
}

function technicalOwnerForDisciplines(disciplines: unknown) {
  const values = Array.isArray(disciplines) ? disciplines.map(value => String(value || '').trim()) : []
  if (values.some(value => ['Mechanical','Electrical','Plumbing','MEP','Fire / Life Safety'].includes(value))) return 'MEP'
  if (values.some(value => ['Structural'].includes(value))) return 'Housebuild'
  if (values.some(value => ['Infrastructure','Civil'].includes(value))) return 'Infrastructure'
  if (values.some(value => ['Landscaping','Landscape'].includes(value))) return 'Landscaping'
  if (values.some(value => ['Architecture','Architectural'].includes(value))) return 'Design'
  return 'Cross-Discipline'
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  const model = Deno.env.get('OPENAI_DESIGN_MODEL') || 'gpt-5.6-terra'
  const authorization = request.headers.get('Authorization') || ''

  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  })
  const admin = createClient(supabaseUrl, serviceRoleKey)

  let jobId = ''

  try {
    if (!openaiKey) throw new Error('OPENAI_API_KEY is not configured for Design Intelligence.')

    const { data: { user }, error: userError } = await caller.auth.getUser()
    if (userError || !user) throw new Error('Authentication required.')

    const body = await request.json()
    jobId = String(body?.jobId || '')
    if (!jobId) throw new Error('jobId is required.')

    const { data: job, error: jobError } = await admin
      .from('design_analysis_jobs')
      .select('*')
      .eq('id', jobId)
      .single()
    if (jobError || !job) throw jobError || new Error('Analysis job not found.')

    await admin.from('design_analysis_jobs').update({
      status: 'Analysing',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      model,
      error_message: null,
    }).eq('id', jobId)

    await admin.from('design_drawings').update({ analysis_status: 'Analysing' })
      .in('id', job.drawing_ids || [])

    const { data: drawings, error: drawingError } = await admin
      .from('design_drawings')
      .select('*')
      .eq('project_id', job.project_id)
      .in('id', job.drawing_ids || [])
    if (drawingError) throw drawingError
    if (!drawings?.length) throw new Error('No drawings were attached to the analysis job.')

    const unsupported = drawings.filter((drawing: any) => {
      const mime = String(drawing.mime_type || '').toLowerCase()
      const name = String(drawing.file_name || drawing.file_path || '').toLowerCase()
      return !(mime === 'application/pdf' || name.endsWith('.pdf'))
    })
    if (unsupported.length) {
      throw new Error('Automated visual review currently requires PDF drawings. Convert DWG/IFC files to a coordinated PDF set for this worker; native BIM geometry support is a later engine.')
    }

    const inputFiles: any[] = []
    for (const drawing of drawings) {
      let fileUrl = drawing.file_url || null
      if (drawing.file_path) {
        const { data: signed, error: signedError } = await admin.storage
          .from(drawing.file_bucket || 'project-files')
          .createSignedUrl(drawing.file_path, 900)
        if (signedError) throw signedError
        fileUrl = signed?.signedUrl
      }
      if (!fileUrl) throw new Error(`No file is available for ${drawing.drawing_number}.`)
      inputFiles.push({ type: 'input_file', file_url: fileUrl, detail: 'high' })
    }

    const { data: rules } = await admin
      .from('design_rules')
      .select('code,title,category,rule_text,severity')
      .or(`project_id.is.null,project_id.eq.${job.project_id}`)
      .eq('active', true)
      .order('code')

    const metadata = drawings.map((d: any) => ({
      drawing_number: d.drawing_number,
      title: d.title,
      discipline: d.discipline,
      revision: d.revision,
      revision_date: d.revision_date,
      level: d.level,
      zone: d.zone,
    }))

    const prompt = `You are PMOCorex Design Intelligence, a conservative construction design-coordination reviewer.
Review the supplied PDF drawing${drawings.length === 1 ? '' : 's'} for the project.
Analysis mode: ${job.mode}.
Drawing metadata: ${JSON.stringify(metadata)}.
Active design rules: ${JSON.stringify(rules || [])}.

Look for only visually supportable concerns, including revision inconsistencies, missing or apparently uncoordinated members/openings, architecture-structure-MEP conflicts, drainage/level/water-ingress risks, missing access/clearance, wet-area/terrace/roof coordination, and other constructability risks.

Important:
- This is an assistant review, not engineering certification.
- Never call an AI-only observation Confirmed. Use High, Medium, or Low confidence.
- Distinguish a visible mismatch from something that merely needs verification.
- For revision_compare, explicitly identify elements that appear moved, added, removed, or changed.
- For cross_discipline, focus on the same location/level across disciplines and note when drawings cannot be reliably registered/aligned.
- If evidence is insufficient, omit the finding rather than inventing one.
- Return a concise summary and at most 20 material findings.`

    const schema = {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        findings: {
          type: 'array',
          maxItems: 20,
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              category: { type: 'string' },
              severity: { type: 'string', enum: ['Low','Medium','High','Critical'] },
              confidence: { type: 'string', enum: ['High','Medium','Low'] },
              disciplines: { type: 'array', items: { type: 'string' } },
              location: { type: 'string' },
              description: { type: 'string' },
              consequence: { type: 'string' },
              recommendation: { type: 'string' },
              responsible_team: { type: 'string' },
              evidence_notes: { type: 'string' },
            },
            required: ['title','category','severity','confidence','disciplines','location','description','consequence','recommendation','responsible_team','evidence_notes'],
            additionalProperties: false,
          },
        },
      },
      required: ['summary','findings'],
      additionalProperties: false,
    }

    const aiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: prompt },
            ...inputFiles,
          ],
        }],
        text: {
          format: {
            type: 'json_schema',
            name: 'pmocorex_design_review',
            strict: true,
            schema,
          },
        },
      }),
    })

    const aiJson = await aiResponse.json()
    if (!aiResponse.ok) {
      throw new Error(aiJson?.error?.message || 'Design analysis provider request failed.')
    }

    const rawText = outputText(aiJson)
    if (!rawText) throw new Error('Design analysis returned no structured output.')
    const result = JSON.parse(rawText)

    const existing = await admin
      .from('design_coordination_issues')
      .select('title,status')
      .eq('project_id', job.project_id)
      .eq('source_type', 'AI')
    if (existing.error) throw existing.error

    const existingOpenTitles = new Set(
      (existing.data || [])
        .filter((issue: any) => !['Resolved','Closed','Rejected'].includes(issue.status))
        .map((issue: any) => String(issue.title || '').trim().toLowerCase())
    )

    const findings = (result.findings || []).filter((finding: any) =>
      finding?.title && !existingOpenTitles.has(String(finding.title).trim().toLowerCase())
    )

    if (findings.length) {
      const { error: insertError } = await admin.from('design_coordination_issues').insert(
        findings.map((finding: any) => ({
          project_id: job.project_id,
          title: finding.title,
          category: finding.category || 'Constructability',
          severity: finding.severity || 'Medium',
          confidence: finding.confidence || 'Medium',
          status: 'Open',
          source_type: 'AI',
          disciplines: Array.isArray(finding.disciplines) ? finding.disciplines : [],
          location: finding.location || null,
          description: finding.evidence_notes ? `${finding.description} Evidence note: ${finding.evidence_notes}` : finding.description,
          consequence: finding.consequence || null,
          recommendation: finding.recommendation || null,
          // Design is the document custodian and first action owner for consultant drawings.
          // Technical ownership is separate and follows the discipline workflow.
          responsible_team: 'Design',
          document_custodian: 'Design',
          technical_owner: technicalOwnerForDisciplines(finding.disciplines),
          action_owner: 'Design',
          drawing_ids: job.drawing_ids || [],
          evidence_url: null,
        }))
      )
      if (insertError) throw insertError
    }

    const now = new Date().toISOString()
    await admin.from('design_drawings').update({
      analysis_status: 'Analysed',
      last_analysed_at: now,
      updated_at: now,
    }).in('id', job.drawing_ids || [])

    await admin.from('design_analysis_jobs').update({
      status: 'Completed',
      result_summary: result.summary || 'Automated design review completed.',
      finding_count: findings.length,
      raw_result: result,
      completed_at: now,
      updated_at: now,
    }).eq('id', jobId)

    return json({ success: true, summary: result.summary, findings: findings.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Design analysis failed.'
    if (jobId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const admin = createClient(supabaseUrl, serviceRoleKey)
        const { data: failedJob } = await admin.from('design_analysis_jobs').select('drawing_ids').eq('id', jobId).single()
        await admin.from('design_analysis_jobs').update({
          status: 'Failed', error_message: message, completed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }).eq('id', jobId)
        if (failedJob?.drawing_ids?.length) {
          await admin.from('design_drawings').update({ analysis_status: 'Failed' }).in('id', failedJob.drawing_ids)
        }
      } catch (_) { /* preserve original error */ }
    }
    return json({ success: false, error: message }, 400)
  }
})

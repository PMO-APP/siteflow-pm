import type { CSSProperties } from 'react'
import { fdate, formatCurrency } from '@/lib/utils'

function getActivityStatus(thisWeek: number, planned: number) {
  if (thisWeek >= planned) return 'On Track'
  if (planned - thisWeek <= 10) return 'Behind'
  return 'Stuck'
}

function progressBar(value: number) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)))
  return `${safe}%`
}

function healthClass(status?: string) {
  const value = String(status || '').toLowerCase()
  if (value.includes('critical') || value.includes('behind')) return 'health-red'
  if (value.includes('risk')) return 'health-amber'
  if (value.includes('complete')) return 'health-blue'
  if (value.includes('ahead')) return 'health-green'
  return 'health-green'
}

function healthIcon(status?: string) {
  const value = String(status || '').toLowerCase()
  if (value.includes('critical') || value.includes('behind')) return '🔴'
  if (value.includes('risk')) return '🟡'
  if (value.includes('complete')) return '🔵'
  return '🟢'
}

export default function ReportDocument({
  report,
  projectName,
  selectedPackage,
  activities = [],
  photos = [],
  contractSum = 0,
  openSnags = 0,
  criticalSnags = 0,
  openRisks = 0,
  pendingProcurement = 0,
  projectHealth,
  projectImageUrl = null,
  branding = null,
  organizationName = 'Organization',
}: any) {
  if (!report) return null

  const progress = Number(projectHealth?.overallProgress || 0)
  const plannedProgress = Number(projectHealth?.plannedProgress || 0)
  const status = projectHealth?.status || report.status || 'On Track'
  const varianceLabel = projectHealth?.varianceLabel || 'On Schedule'
  const reportPrimary = branding?.primaryColor || '#173f5f'
  const reportAccent = branding?.secondaryColor || '#ef8354'
  const organizationLabel = branding?.productName || organizationName || 'Organization'
  const platformLabel = branding?.hidePlatformBrand ? '' : 'PMOCorex'

  return (
    <div className="report-document" style={{'--report-primary': reportPrimary, '--report-accent': reportAccent} as CSSProperties}>
      <style>{`
        @page { size: A4 portrait; margin: 0; }

        .report-document {
          background: #fff;
          color: #111827;
          width: 210mm;
          min-height: 297mm;
          padding: 12mm;
          box-sizing: border-box;
          font-family: Arial, sans-serif;
          font-size: 11px;
          line-height: 1.4;
          margin: 0 auto;
        }

        .executive-cover {
          border: 2px solid var(--report-primary);
          padding: 12px 14px;
          margin-bottom: 16px;
        }

        .brand-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }

        .mixta-logo {
          font-size: 15px;
          font-weight: 900;
          letter-spacing: .08em;
          color: #111827;
        }


        .report-project-identity { display:flex; align-items:center; gap:10px; }
        .report-project-image { width:54px; height:54px; border-radius:10px; object-fit:cover; border:1px solid #d7dee5; }
        .report-org-logo { max-height:34px; max-width:150px; object-fit:contain; }
        .pmo-logo {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .18em;
          color: var(--report-primary);
        }

        .cover-title {
          text-align: center;
          border-top: 1px solid var(--report-accent);
          border-bottom: 1px solid var(--report-accent);
          padding: 12px 0;
          margin-bottom: 14px;
        }

        .project-name {
          font-size: 24px;
          font-weight: 900;
          margin: 0;
          text-transform: uppercase;
        }

        .cover-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px 18px;
          margin-bottom: 14px;
        }

        .cover-item {
          display: grid;
          grid-template-columns: 112px 1fr;
          gap: 8px;
        }

        .cover-label {
          font-weight: 800;
          color: #555;
        }

        .cover-value {
          font-weight: 700;
        }

        .progress-wrap {
          margin-top: 10px;
        }

        .progress-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 800;
          margin-bottom: 6px;
        }

        .progress-track {
          height: 12px;
          background: #e5e7eb;
          border-radius: 999px;
          overflow: hidden;
          border: 1px solid #d1d5db;
        }

        .progress-fill {
          height: 100%;
          background: var(--report-primary);
          width: ${progressBar(progress)};
        }

        .health-status {
          margin-top: 10px;
          font-size: 13px;
          font-weight: 900;
        }

        .health-red { color: #b91c1c; }
        .health-amber { color: #b45309; }
        .health-green { color: #047857; }
        .health-blue { color: #1d4ed8; }

        .report-section {
          margin-top: 14px;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .report-section-title {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--report-primary);
          border-bottom: 1px solid var(--report-accent);
          padding-bottom: 5px;
          margin-bottom: 8px;
        }

        .report-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 7px;
          width: 100%;
        }

        .health-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 7px;
          width: 100%;
        }

        .report-info-box {
          border: 1px solid #ddd;
          padding: 7px;
          border-radius: 5px;
          min-height: 38px;
        }

        .report-label {
          font-size: 8.5px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .report-value {
          font-weight: 700;
          margin-top: 3px;
          word-break: break-word;
        }

        .delay-red { color: #b91c1c; }
        .delay-green { color: #047857; }

        .report-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .report-table th,
        .report-table td {
          border: 1px solid #333;
          padding: 5px;
          vertical-align: top;
          font-size: 10.5px;
          word-break: break-word;
        }

        .report-table th {
          background: #f3f4f6;
          font-weight: 800;
        }

        .report-text-box {
          border: 1px solid #ddd;
          border-radius: 5px;
          padding: 8px;
          min-height: 34px;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .lookahead-grid {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 8px;
          margin-bottom: 8px;
        }

        .photo-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .photo-card {
          border: 1px solid #ddd;
          border-radius: 5px;
          overflow: hidden;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .photo-card img {
          width: 100%;
          height: 58mm;
          object-fit: cover;
          background: #f9fafb;
          display: block;
        }

        .photo-caption {
          padding: 7px;
          font-size: 10.5px;
          color: #555;
        }

        .signature-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-top: 24px;
        }

        .signature-box {
          border-top: 1px solid #111;
          padding-top: 6px;
          min-height: 45px;
        }

        .footer {
          border-top: 1px solid #ddd;
          margin-top: 20px;
          padding-top: 8px;
          font-size: 9.5px;
          color: #666;
        }


        /* On-screen report preview must fit the available project workspace.
           A4 dimensions are restored only when printing. */
        @media screen {
          .report-document {
            width: 100%;
            max-width: 100%;
            min-width: 0;
            min-height: auto;
            padding: clamp(16px, 2.2vw, 32px);
            overflow-wrap: anywhere;
          }

          .report-document table {
            width: 100%;
            table-layout: fixed;
          }

          .report-document img {
            max-width: 100%;
            height: auto;
          }

          .report-document .cover-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .report-document .cover-item {
            grid-template-columns: minmax(88px, 32%) minmax(0, 1fr);
          }
        }

        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            width: 210mm !important;
          }

          .report-document {
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 12mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            max-width: none !important;
          }
        }
      `}</style>

      <div className="executive-cover">
        <div className="brand-row">
          <div className="mixta-logo">{branding?.logoUrl ? <img src={branding.logoUrl} alt={`${organizationLabel} logo`} className="report-org-logo" /> : organizationLabel}</div>
          <div className="pmo-logo">PMOCOREX</div>
        </div>

        <div className="cover-title">
          <h1 className="project-name">{projectName || 'Project'}</h1>
        </div>

        <div className="cover-grid">
          <CoverItem label="Reporting Week:" value={fdate(report.report_date)} />
          <CoverItem label="Prepared By:" value={report.reporting_officer || '—'} />
          <CoverItem label="Discipline:" value={report.department || report.discipline || '—'} />
          <CoverItem
            label="Package:"
            value={
              report.package_name ||
              selectedPackage?.package_name ||
              selectedPackage?.block_name ||
              'Project Wide'
            }
          />
          <CoverItem label="Contractor:" value={report.contractor_name || selectedPackage?.contractor_name || '—'} />
          <CoverItem label="Project Start:" value={projectHealth?.startDate ? fdate(projectHealth.startDate) : '—'} />
          <CoverItem label="Planned Finish:" value={projectHealth?.finishDate ? fdate(projectHealth.finishDate) : '—'} />
          <CoverItem label="Variance:" value={varianceLabel} />
        </div>

        <div className="progress-wrap">
          <div className="progress-label-row">
            <span>Overall Project Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" />
          </div>
        </div>

        <div className={`health-status ${healthClass(status)}`}>
          Project Health: {healthIcon(status)} {status}
        </div>
      </div>

      

      <Section title="Status Summary">
        <TextBox value={report.status_summary || projectHealth?.statusSummary} />
      </Section>

      <Section title="Project / Package Information">
        <div className="report-grid">
          <Info label="Project" value={projectName || '—'} />
          <Info
            label="Package"
            value={
              report.package_name ||
              selectedPackage?.package_name ||
              selectedPackage?.block_name ||
              'Project Wide'
            }
          />
          <Info label="Discipline" value={report.department || report.discipline || '—'} />
          <Info label="Contractor" value={report.contractor_name || selectedPackage?.contractor_name || '—'} />
          <Info label="Reporting Officer" value={report.reporting_officer || '—'} />
          <Info label="Officer Email" value={report.reporting_officer_email || '—'} />
          <Info label="Report Status" value={status} />
          <Info label="Contract Sum" value={contractSum ? formatCurrency(contractSum) : 'TBC'} />
          <Info label="Generated Date" value={new Date().toLocaleDateString('en-GB')} />
        </div>
      </Section>

      <Section title="Performance Snapshot">
        <div className="report-grid">
          <Info label="Open Snags" value={openSnags} />
          <Info label="Critical Snags" value={criticalSnags} />
          <Info label="Open Risks" value={openRisks} />
          <Info label="Pending Procurement" value={pendingProcurement} />
          <Info label="Next Site Meeting" value={report.next_meeting ? fdate(report.next_meeting) : 'Not set'} />
          <Info label="Workflow Status" value={report.workflow_status || 'Draft'} />
        </div>
      </Section>

      <Section title="Weekly Progress Activities">
        <table className="report-table">
          <thead>
            <tr>
              <th>Activity</th>
              <th>Last Week %</th>
              <th>This Week %</th>
              <th>Planned %</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {activities.length === 0 ? (
              <tr>
                <td colSpan={5}>No activity recorded for this week.</td>
              </tr>
            ) : (
              activities.map((activity: any) => {
                const rowStatus =
                  activity.activity_status ||
                  getActivityStatus(Number(activity.this_week || 0), Number(activity.planned || 0))

                return (
                  <tr key={activity.id}>
                    <td>{activity.activity}</td>
                    <td>{activity.last_week || 0}%</td>
                    <td>{activity.this_week || 0}%</td>
                    <td>{activity.planned || 0}%</td>
                    <td>{activity.remarks || '—'}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </Section>

      <Section title="Pending Issues"><TextBox value={report.pending_issues} /></Section>
      <Section title="Matters Arising"><TextBox value={report.matters_arising} /></Section>

      <Section title="Look Ahead">
        <div className="lookahead-grid">
          <Info label="Target %" value={`${report.look_ahead_percentage || 0}%`} />
          <Info label="Timeline" value={report.look_ahead_timeline || '—'} />
        </div>
        <TextBox value={report.look_ahead} />
      </Section>

      <Section title="Quality Tracking"><TextBox value={report.quality_tracking} /></Section>
      <Section title="Procurement Tracking"><TextBox value={report.procurement_tracking} /></Section>
      <Section title="Safety Tracking"><TextBox value={report.safety_tracking} /></Section>
      <Section title="Infrastructure / Landscaping Tracking"><TextBox value={report.infrastructure_landscaping_tracking} /></Section>
      <Section title="Site Presentation / Cleanliness"><TextBox value={report.site_presentation_cleanliness} /></Section>
      <Section title="Payment Issues"><TextBox value={report.payment_issues} /></Section>

      <Section title="Progress Photos">
        {photos.length === 0 ? (
          <TextBox value="No photos attached." />
        ) : (
          <div className="photo-grid">
            {photos.map((photo: any, index: number) => (
              <div className="photo-card" key={photo.id || `${photo.photo_url}-${index}`}>
                <img src={photo.photo_url} alt={photo.photo_name || `Progress photo ${index + 1}`} />
                <div className="photo-caption">
                  {photo.caption || photo.photo_name || `Progress Photo ${index + 1}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Sign-off">
        <div className="signature-grid">
          <div className="signature-box">
            <strong>Prepared By</strong>
            <br />
            {report.reporting_officer || '—'}
          </div>

          <div className="signature-box">
            <strong>Reviewed By</strong>
            <br />
            {report.reviewed_by ? 'PMO' : '—'}
          </div>

          <div className="signature-box">
            <strong>Approved By</strong>
            <br />
            {report.approved_by ? 'PMO/Admin' : '—'}
          </div>
        </div>
      </Section>

      <div className="footer">
        Mixta Africa · Generated by PMOCorex · Confidential · {new Date().toLocaleDateString('en-GB')}
      </div>
    </div>
  )
}

function CoverItem({ label, value }: { label: string; value: any }) {
  return (
    <div className="cover-item">
      <div className="cover-label">{label}</div>
      <div className="cover-value">{value || '—'}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="report-section">
      <div className="report-section-title">{title}</div>
      {children}
    </section>
  )
}

function Info({
  label,
  value,
  valueClass = '',
}: {
  label: string
  value: any
  valueClass?: string
}) {
  return (
    <div className="report-info-box">
      <div className="report-label">{label}</div>
      <div className={`report-value ${valueClass}`}>{value || '—'}</div>
    </div>
  )
}

function TextBox({ value }: { value?: string | null }) {
  return <div className="report-text-box">{value || '—'}</div>
}

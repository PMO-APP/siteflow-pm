import { fdate, formatCurrency } from '@/lib/utils'

function getActivityStatus(thisWeek: number, planned: number) {
  if (thisWeek >= planned) return 'On Track'
  if (planned - thisWeek <= 10) return 'Behind'
  return 'Stuck'
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
}: any) {
  if (!report) return null

  const workflowStatus = report.workflow_status || 'Draft'

  return (
    <div className="report-document">
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }

        .report-document {
          background: #ffffff;
          color: #111827;
          width: 210mm;
          min-height: 297mm;
          padding: 12mm;
          box-sizing: border-box;
          font-family: Arial, sans-serif;
          font-size: 11px;
          line-height: 1.4;
          margin: 0 auto;
          overflow: visible;
        }

        .report-header {
          border-bottom: 3px solid #c49e48;
          padding-bottom: 10px;
          margin-bottom: 14px;
        }

        .report-title {
          font-size: 20px;
          font-weight: 800;
          margin: 0;
        }

        .report-subtitle {
          color: #555;
          margin-top: 4px;
        }

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
          color: #7a5a12;
          border-bottom: 1px solid #d6c38a;
          padding-bottom: 5px;
          margin-bottom: 8px;
        }

        .report-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
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

        @media print {
          html,
          body {
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
          <Info label="Report Status" value={report.status || 'On Track'} />
          <Info label="Workflow Status" value={workflowStatus} />
          <Info label="Contract Sum" value={contractSum ? formatCurrency(contractSum) : 'TBC'} />
        </div>
      </Section>

      <Section title="Performance Snapshot">
        <div className="report-grid">
          <Info label="Open Snags" value={openSnags} />
          <Info label="Critical Snags" value={criticalSnags} />
          <Info label="Open Risks" value={openRisks} />
          <Info label="Pending Procurement" value={pendingProcurement} />
          <Info label="Next Site Meeting" value={report.next_meeting ? fdate(report.next_meeting) : 'Not set'} />
          <Info label="Generated Date" value={new Date().toLocaleDateString('en-GB')} />
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
              <th>Status</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {activities.length === 0 ? (
              <tr>
                <td colSpan={6}>No activities added yet.</td>
              </tr>
            ) : (
              activities.map((activity: any) => {
                const status =
                  activity.activity_status ||
                  getActivityStatus(Number(activity.this_week || 0), Number(activity.planned || 0))

                return (
                  <tr key={activity.id}>
                    <td>{activity.activity}</td>
                    <td>{activity.last_week || 0}%</td>
                    <td>{activity.this_week || 0}%</td>
                    <td>{activity.planned || 0}%</td>
                    <td>{status}</td>
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
      <Section title="Look Ahead"><TextBox value={report.look_ahead} /></Section>
      <Section title="Quality Tracking"><TextBox value={report.quality_tracking} /></Section>
      <Section title="Procurement Tracking"><TextBox value={report.procurement_tracking} /></Section>
      <Section title="Safety Tracking"><TextBox value={report.safety_tracking} /></Section>

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
        Generated by PMOCorex · Confidential · {new Date().toLocaleDateString('en-GB')}
      </div>
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

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="report-info-box">
      <div className="report-label">{label}</div>
      <div className="report-value">{value || '—'}</div>
    </div>
  )
}

function TextBox({ value }: { value?: string | null }) {
  return <div className="report-text-box">{value || '—'}</div>
}

import { useRef, useState } from 'react'
import { Download, FileText, Printer } from 'lucide-react'
import type { runProjectIntelligence } from '@/intelligence/PIF'

type Intelligence = ReturnType<typeof runProjectIntelligence>

interface Props {
  intelligence: Intelligence
}

const tone: Record<string, string> = {
  good: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  watch: 'border-amber-200 bg-amber-50 text-amber-800',
  critical: 'border-red-200 bg-red-50 text-red-800',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700',
}

export function ExecutiveBoardPackPanel({ intelligence }: Props) {
  const pack = intelligence.boardPack
  const reportRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  const exportPdf = async () => {
    if (!reportRef.current || exporting) return
    setExporting(true)
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imageWidth = pageWidth - 16
      const imageHeight = (canvas.height * imageWidth) / canvas.width
      const image = canvas.toDataURL('image/png')
      let remaining = imageHeight
      let y = 8
      pdf.addImage(image, 'PNG', 8, y, imageWidth, imageHeight)
      remaining -= pageHeight - 16
      while (remaining > 0) {
        y = remaining - imageHeight + 8
        pdf.addPage()
        pdf.addImage(image, 'PNG', 8, y, imageWidth, imageHeight)
        remaining -= pageHeight - 16
      }
      pdf.save(`${pack.projectName.replace(/[^a-z0-9]+/gi, '-')}-board-pack.pdf`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
        <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Executive reporting</div><h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-slate-950">Board pack</h2><p className="mt-1 text-sm text-slate-500">Board-ready project intelligence generated from live controls.</p></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Printer className="h-4 w-4"/>Print</button>
          <button type="button" onClick={exportPdf} disabled={exporting} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"><Download className="h-4 w-4"/>{exporting ? 'Preparing…' : 'Export PDF'}</button>
        </div>
      </div>

      <div ref={reportRef} className="board-pack-print bg-white p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-200 pb-6">
          <div><div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700"><FileText className="h-4 w-4"/>PMOCorex board pack</div><h3 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-slate-950">{pack.projectName}</h3><p className="mt-2 text-sm text-slate-500">Reporting date: {pack.reportingDate}</p></div>
          <span className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800">{pack.status}</span>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-950 p-6 text-white"><div className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-200">Executive summary</div><p className="mt-3 text-base leading-7 text-slate-100">{pack.executiveSummary}</p><p className="mt-4 border-t border-white/10 pt-4 text-sm leading-6 text-blue-100">{pack.outlook}</p></div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{pack.metrics.map(metric => <div key={metric.label} className={`rounded-xl border p-4 ${tone[metric.status]}`}><div className="text-xs font-semibold uppercase tracking-[0.12em] opacity-75">{metric.label}</div><div className="mt-2 text-2xl font-semibold">{metric.value}</div><div className="mt-1 text-sm">{metric.commentary}</div></div>)}</div>

        <div className="mt-7 grid gap-5 xl:grid-cols-2">{pack.sections.map(section => <article key={section.id} className="rounded-xl border border-slate-200 p-5"><h4 className="text-lg font-semibold text-slate-950">{section.title}</h4><p className="mt-2 text-sm leading-6 text-slate-600">{section.summary}</p><ul className="mt-4 space-y-2">{section.items.length ? section.items.map((item, index) => <li key={`${section.id}-${index}`} className="flex gap-3 text-sm leading-6 text-slate-700"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600"/>{item}</li>) : <li className="text-sm text-slate-500">No exception recorded.</li>}</ul></article>)}</div>

        <div className="mt-7 rounded-xl border border-slate-200 p-5"><h4 className="text-lg font-semibold text-slate-950">Decisions required</h4>{pack.decisionsRequired.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-[0.1em] text-slate-500"><th className="pb-3 pr-4">Decision</th><th className="pb-3 pr-4">Owner</th><th className="pb-3 pr-4">Deadline</th><th className="pb-3">Impact</th></tr></thead><tbody>{pack.decisionsRequired.map((item, index) => <tr key={`${item.title}-${index}`} className="border-b border-slate-100 last:border-0"><td className="py-3 pr-4 font-medium text-slate-900">{item.title}</td><td className="py-3 pr-4 text-slate-600">{item.owner}</td><td className="py-3 pr-4 text-slate-600">{item.deadline}</td><td className="py-3 text-slate-600">{item.impact}</td></tr>)}</tbody></table></div> : <p className="mt-3 text-sm text-slate-500">No board-level decision is currently open.</p>}</div>

        <p className="mt-6 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">{pack.assuranceStatement}</p>
      </div>
    </section>
  )
}

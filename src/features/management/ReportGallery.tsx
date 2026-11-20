import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, Camera, FileText, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { isWordReport, readWordReport } from './reportDocuments'
import { isoDay, type DocumentRow, type Photo, type ProjectPosition, type ReportDocument } from './model'

function usePhotoUrl(photo: Photo | undefined) {
  const [signed, setSigned] = useState<{ path: string; url: string | null }>()
  const path = photo?.path
  useEffect(() => {
    if (!path) return
    let active = true
    supabase.storage.from('design-collaboration').createSignedUrl(path, 300).then(({ data }) => {
      if (active) setSigned({ path, url: data?.signedUrl ?? null })
    })
    return () => { active = false }
  }, [path])
  return photo?.src ?? (signed && signed.path === path ? signed.url : null)
}

function PhotoImage({ photo, full = false }: { photo: Photo; full?: boolean }) {
  const url = usePhotoUrl(photo)
  const [failedUrl, setFailedUrl] = useState<string>()
  const className = full ? 'max-h-[65vh] w-full object-contain' : 'aspect-[4/3] w-full object-cover'
  return url && failedUrl !== url
    ? <img className={className} src={url} alt={photo.title} loading={full ? 'eager' : 'lazy'} referrerPolicy="no-referrer" onError={() => setFailedUrl(url)} />
    : <div className={`grid place-items-center bg-slate-100 text-sm text-slate-500 ${className}`}><span className="flex items-center gap-2"><Camera size={18} aria-hidden />Photo unavailable</span></div>
}

function dateLabel(day?: string | null) {
  return day ? new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' }) : 'Date unrecorded'
}

function useWordPhotos(documents: DocumentRow[]) {
  const [reports, setReports] = useState<Map<string, ReportDocument>>(new Map())
  const signature = JSON.stringify(documents.map(d => [d.id, d.storage_path, d.updated_at, d.revision_date, d.title]))
  const currentDocuments = useRef(documents)
  currentDocuments.current = documents
  useEffect(() => {
    const controller = new AbortController()
    const photoUrls = new Set<string>()
    setReports(new Map())
    for (const document of currentDocuments.current) {
      void readWordReport(document, controller.signal).then(report => {
        for (const photo of report.photos) {
          if (!photo.src) continue
          if (controller.signal.aborted) URL.revokeObjectURL(photo.src)
          else photoUrls.add(photo.src)
        }
        if (!controller.signal.aborted) setReports(current => new Map(current).set(String(document.id), report))
      }).catch(() => {})
    }
    return () => {
      controller.abort()
      photoUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [signature])
  return reports
}

export default function ReportGallery({ rows, photos, onDocuments }: {
  rows: ProjectPosition[]
  photos: Photo[]
  onDocuments: (row: ProjectPosition) => void
}) {
  const [photoLimit, setPhotoLimit] = useState(12)
  const [documentLimit, setDocumentLimit] = useState(8)
  const [selected, setSelected] = useState<string | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const projects = useMemo(() => new Map(rows.map(row => [String(row.project.id), row])), [rows])
  const documents = rows.flatMap(row => row.documents).sort((a, b) =>
    (b.revision_date || b.created_at || '').localeCompare(a.revision_date || a.created_at || ''))
  const extracted = useWordPhotos(documents.filter(isWordReport).slice(0, documentLimit))
  const shownPhotos = [...photos.filter(photo => projects.has(String(photo.projectId))), ...Array.from(extracted.values()).flatMap(report => report.photos)]
    .sort((a, b) => b.date.localeCompare(a.date))
  const photo = shownPhotos.find(item => item.id === selected)
  const report = documents.find(item => `report:${item.id}` === selected)
  const detail = report && extracted.get(String(report.id))
  const dialogTitle = photo?.title || report?.title
  const dialogProject = projects.get(String(photo?.projectId ?? report?.project_id))
  useEffect(() => {
    if (dialogTitle && !dialog.current?.open) dialog.current?.showModal()
    if (!dialogTitle && dialog.current?.open) dialog.current.close()
  }, [dialogTitle])

  return (
    <section id="visual-updates" aria-labelledby="visual-heading" className="mi-panel scroll-mt-6">
      <div className="mi-section-heading">
        <div><h2 id="visual-heading">Site photos and reports</h2><p>See the latest site evidence and read uploaded reports.</p></div>
        <Camera aria-hidden />
      </div>
      {shownPhotos.length ? <div className="mi-gallery">
        {shownPhotos.slice(0, photoLimit).map(item => <button key={item.id} type="button" className="mi-photo" onClick={() => setSelected(item.id)}>
          <PhotoImage photo={item} />
          <span className="mi-photo-caption">
            <strong>{projects.get(String(item.projectId))?.project.project_name}</strong>
            <span>{item.title}</span>
            <small>{dateLabel(item.date)}</small>
          </span>
        </button>)}
      </div> : <p className="mi-empty">No site photos to display for these projects.</p>}
      {shownPhotos.length > photoLimit && <button className="mi-text-button mt-4" onClick={() => setPhotoLimit(n => n + 12)}>Show more photos</button>}
      {documents.length > 0 && <div className="mi-document-list">
        <h3>Uploaded reports</h3>
        {documents.slice(0, documentLimit).map(doc => {
          const row = projects.get(String(doc.project_id))
          if (!row) return null
          return <button type="button" key={doc.id} className="mi-document" onClick={() => setSelected(`report:${doc.id}`)}>
            <FileText size={18} aria-hidden />
            <span><strong>{doc.title}</strong><small>{row.project.project_name} · {dateLabel(isoDay(doc.revision_date || doc.created_at))}</small></span>
            <ArrowUpRight size={17} aria-hidden />
          </button>
        })}
        {documents.length > documentLimit && <button className="mi-text-button" onClick={() => setDocumentLimit(n => n + 8)}>Show more reports</button>}
      </div>}
      <dialog ref={dialog} className="mi-dialog" aria-labelledby="mi-preview-title" onClose={() => setSelected(null)} onClick={event => { if (event.target === dialog.current) dialog.current?.close() }}>
        {dialogTitle && <div className="mi-dialog-content">
          <header><h3 id="mi-preview-title">{dialogTitle}</h3><button autoFocus type="button" aria-label="Close preview" onClick={() => dialog.current?.close()}><X size={21} /></button></header>
          {photo && <><PhotoImage photo={photo} full /><p>{dialogProject?.project.project_name} · {dateLabel(photo.date)}</p></>}
          {report && <><p>{dialogProject?.project.project_name} · {dateLabel(isoDay(report.revision_date || report.created_at))}</p>
            {(detail?.excerpt || report.description) && <div className="mi-excerpt whitespace-pre-line">{detail?.excerpt || report.description}</div>}
            {dialogProject && <button className="mi-text-button" onClick={() => onDocuments(dialogProject)}>Open project documents <ArrowUpRight size={16} /></button>}
          </>}
        </div>}
      </dialog>
    </section>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Camera, History, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useHistoricalReportPhotos, type SitePhotoReport } from './data'
import { isWordReport, readWordReport } from './reportDocuments'
import { isoDay, photoReportingWeek, type DocumentRow, type Photo, type ProjectPosition } from './model'

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
  const [result, setResult] = useState<{ signature: string; photos: Photo[] }>()
  const signature = JSON.stringify(documents.map(d => [d.id, d.storage_path, d.updated_at, d.revision_date, d.created_at, d.title]))
  const currentDocuments = useRef(documents)
  currentDocuments.current = documents
  useEffect(() => {
    const controller = new AbortController()
    const photoUrls = new Set<string>()
    const reports = currentDocuments.current
    setResult({ signature, photos: [] })

    async function loadReports() {
      // Bound concurrent downloads when a portfolio has several report files.
      for (let i = 0; i < reports.length && !controller.signal.aborted; i += 4) {
        await Promise.all(reports.slice(i, i + 4).map(async document => {
          try {
            const { photos } = await readWordReport(document, controller.signal)
            for (const photo of photos) {
              if (!photo.src) continue
              if (controller.signal.aborted) URL.revokeObjectURL(photo.src)
              else photoUrls.add(photo.src)
            }
            if (photos.length && !controller.signal.aborted) {
              setResult(current => current?.signature === signature ? { signature, photos: [...current.photos, ...photos] } : current)
            }
          } catch {
            // Continue rendering photos from the other reports.
          }
        }))
      }
    }

    void loadReports()
    return () => {
      controller.abort()
      photoUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [signature])
  return result?.signature === signature ? result.photos : []
}

function PhotoGrid({ photos, documents, projects, emptyMessage }: {
  photos: Photo[]
  documents: DocumentRow[]
  projects: Map<string, ProjectPosition>
  emptyMessage: string
}) {
  const [photoLimit, setPhotoLimit] = useState(12)
  const [selected, setSelected] = useState<string | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const embeddedPhotos = useWordPhotos(documents)
  const shownPhotos = [...photos, ...embeddedPhotos].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
  const photo = shownPhotos.find(item => item.id === selected)
  const projectName = (photo: Photo) => projects.get(String(photo.projectId))?.project.project_name

  useEffect(() => {
    if (photo && !dialog.current?.open) dialog.current?.showModal()
    if (!photo && dialog.current?.open) dialog.current.close()
  }, [photo])

  return <>
    {shownPhotos.length ? <div className="mi-gallery">
      {shownPhotos.slice(0, photoLimit).map(item => <button key={item.id} type="button" className="mi-photo" onClick={() => setSelected(item.id)}>
        <PhotoImage photo={item} />
        <span className="mi-photo-caption">
          <strong>{projectName(item)}</strong>
          <span>{item.title}</span>
          <small>{dateLabel(item.date)}</small>
        </span>
      </button>)}
    </div> : <p className="mi-empty">{emptyMessage}</p>}
    {shownPhotos.length > photoLimit && <button type="button" className="mi-text-button mt-4" onClick={() => setPhotoLimit(n => n + 12)}>Show more photos</button>}
    <dialog ref={dialog} className="mi-dialog" aria-labelledby="mi-photo-preview-title" onClose={() => setSelected(null)}
      onClick={event => { if (event.target === dialog.current) dialog.current?.close() }}>
      {photo && <div className="mi-dialog-content">
        <header><h3 id="mi-photo-preview-title">{photo.title}</h3><button autoFocus type="button" aria-label="Close preview" onClick={() => dialog.current?.close()}><X size={21} /></button></header>
        <PhotoImage photo={photo} full />
        <p>{projectName(photo)} · {dateLabel(photo.date)}</p>
      </div>}
    </dialog>
  </>
}

const documentWeek = (document: DocumentRow) =>
  photoReportingWeek(isoDay(document.revision_date) ?? isoDay(document.created_at))

export default function ReportGallery({ rows, photos, historyReports, historyDesignPhotos }: {
  rows: ProjectPosition[]
  photos: Photo[]
  historyReports: SitePhotoReport[]
  historyDesignPhotos: Photo[]
}) {
  const [showHistory, setShowHistory] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState('')
  const projects = useMemo(() => new Map(rows.map(row => [String(row.project.id), row])), [rows])
  const latestPhotos = photos.filter(photo => projects.has(String(photo.projectId)))
  const latestDocuments = rows.flatMap(row => row.sitePhotos.documents).filter(isWordReport)
  const archiveDesignPhotos = historyDesignPhotos.filter(photo => projects.has(String(photo.projectId)))
  const archiveReports = historyReports.filter(report => projects.has(String(report.project_id)))
  const archiveDocuments = rows.flatMap(row => row.sitePhotos.historyDocuments).filter(isWordReport)
  const weeks = [...new Set([
    ...archiveDesignPhotos.map(photo => photoReportingWeek(photo.date)),
    ...archiveReports.map(report => photoReportingWeek(report.report_date)),
    ...archiveDocuments.map(documentWeek),
  ].filter((week): week is string => week !== null))].sort().reverse()
  const week = weeks.includes(selectedWeek) ? selectedWeek : (weeks[0] ?? '')
  const weekReports = archiveReports.filter(report => photoReportingWeek(report.report_date) === week)
  const archiveQuery = useHistoricalReportPhotos(weekReports, showHistory)
  const galleryKey = [...projects.keys()].sort().join(',')

  return (
    <section id="visual-updates" aria-labelledby="visual-heading" className="mi-panel scroll-mt-6">
      <div className="mi-section-heading flex-wrap">
        <div><h2 id="visual-heading">Site Photos</h2><p>Photos from each project’s latest reporting week.</p></div>
        <button type="button" className="mi-back" aria-controls="mi-gallery-history" aria-expanded={showHistory} onClick={() => setShowHistory(!showHistory)}>
          {showHistory ? <><ArrowLeft size={16} /> Back to latest photos</> : <><History size={16} /> Gallery History</>}
        </button>
      </div>
      <div id="mi-gallery-history" hidden={!showHistory}>
        {showHistory && <>
          <div className="mi-filter-bar mb-4">
            <h3>Gallery History</h3>
            {weeks.length > 0 && <label>Week ending
              <select value={week} onChange={event => setSelectedWeek(event.target.value)}>
                {weeks.map(day => <option key={day} value={day}>{dateLabel(day)}</option>)}
              </select>
            </label>}
          </div>
          <PhotoGrid key={`${galleryKey}:${week}`} projects={projects}
            photos={[...archiveDesignPhotos.filter(photo => photoReportingWeek(photo.date) === week), ...(archiveQuery.data ?? [])]}
            documents={archiveDocuments.filter(report => documentWeek(report) === week)}
            emptyMessage={archiveQuery.isFetching ? 'Loading photos for this reporting week…' : 'No photos available for this reporting week.'} />
          {archiveQuery.isError && <p className="mi-empty" role="alert">Some photos could not be loaded. <button type="button" className="mi-text-button" onClick={() => void archiveQuery.refetch()}>Try again</button></p>}
        </>}
      </div>
      {!showHistory && <PhotoGrid key={galleryKey} projects={projects} photos={latestPhotos} documents={latestDocuments}
        emptyMessage="No photos in the latest reports for these projects." />}
    </section>
  )
}

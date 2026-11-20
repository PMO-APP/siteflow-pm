import { supabase } from '@/lib/supabase'
import type { DocumentRow, ReportDocument } from './model'
import { isoDay } from './model'

const MAX_FILE = 24 * 1024 * 1024
const MAX_IMAGE = 4 * 1024 * 1024
const MAX_XML = 2 * 1024 * 1024
const MAX_PHOTOS = 8
const parser = new DOMParser()
const decoder = new TextDecoder()
const imageTypes: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
}

export function isWordReport(document: DocumentRow) {
  return !!document.storage_path &&
    (/\.docx$/i.test(document.storage_path) || ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(document.file_type || ''))
}

type ZipEntry = { offset: number; compressedSize: number; size: number; method: number }

/** Read only the requested Word parts, with a limit on expanded bytes per part. */
function indexZip(bytes: ArrayBuffer) {
  const view = new DataView(bytes)
  let end = view.byteLength - 22
  while (end >= Math.max(0, view.byteLength - 65557)) {
    if (view.getUint32(end, true) === 0x06054b50 && end + 22 + view.getUint16(end + 20, true) === view.byteLength) break
    end--
  }
  if (end < Math.max(0, view.byteLength - 65557) || view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) throw new Error('Unreadable Word report')
  const entries = new Map<string, ZipEntry>()
  const count = view.getUint16(end + 10, true)
  let cursor = view.getUint32(end + 16, true)
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50) throw new Error('Unreadable Word report')
    const nameLength = view.getUint16(cursor + 28, true)
    const extraLength = view.getUint16(cursor + 30, true)
    const commentLength = view.getUint16(cursor + 32, true)
    const next = cursor + 46 + nameLength + extraLength + commentLength
    if (next > end) throw new Error('Unreadable Word report')
    const name = decoder.decode(new Uint8Array(bytes, cursor + 46, nameLength))
    entries.set(name, {
      method: view.getUint16(cursor + 10, true), size: view.getUint32(cursor + 24, true),
      compressedSize: view.getUint32(cursor + 20, true), offset: view.getUint32(cursor + 42, true),
    })
    cursor = next
  }
  return async (name: string, limit: number) => {
    const entry = entries.get(name)
    if (!entry || entry.size > limit || entry.offset + 30 > end || view.getUint32(entry.offset, true) !== 0x04034b50) return null
    const start = entry.offset + 30 + view.getUint16(entry.offset + 26, true) + view.getUint16(entry.offset + 28, true)
    if (start + entry.compressedSize > end) return null
    const data = bytes.slice(start, start + entry.compressedSize)
    if (entry.method === 0 && entry.compressedSize === entry.size) return data
    if (entry.method !== 8) return null
    const reader = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader()
    const output = new Uint8Array(entry.size)
    let offset = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) return offset === entry.size ? output.buffer : null
        if (offset + value.length > output.length) return null
        output.set(value, offset)
        offset += value.length
      }
    } finally {
      await reader.cancel().catch(() => {})
    }
  }
}

const elements = (node: Document | Element, name: string) => Array.from(node.getElementsByTagNameNS('*', name))
const xml = (buffer: ArrayBuffer) => parser.parseFromString(decoder.decode(buffer), 'application/xml')

async function extractWordReport(buffer: ArrayBuffer, document: DocumentRow): Promise<ReportDocument> {
  const read = indexZip(buffer)
  const contents = await read('word/document.xml', MAX_XML)
  if (!contents) return { excerpt: null, photos: [] }
  const body = xml(contents)
  const excerpt = elements(body, 'p').map(p => elements(p, 't').map(t => t.textContent).join('').trim())
    .filter(Boolean).join('\n').slice(0, 4200) || null
  const relations = await read('word/_rels/document.xml.rels', MAX_XML)
  if (!relations) return { excerpt, photos: [] }
  const targets = new Map(elements(xml(relations), 'Relationship')
    .filter(r => r.getAttribute('Type')?.endsWith('/image') && r.getAttribute('TargetMode') !== 'External')
    .map(r => [r.getAttribute('Id'), r.getAttribute('Target')]))
  const used = new Set<string>()
  const photos: ReportDocument['photos'] = []
  for (const drawing of [...elements(body, 'drawing'), ...elements(body, 'pict')]) {
    const image = elements(drawing, 'blip')[0] || elements(drawing, 'imagedata')[0]
    const reference = Array.from(image?.attributes ?? []).find(a => ['embed', 'id'].includes(a.localName))?.value
    const target = reference && targets.get(reference)
    const path = target?.replace(/^\/?word\//, '')
    if (!path || !/^media\/[\w.-]+$/.test(path) || used.has(path)) continue
    used.add(path)
    const mime = imageTypes[path.split('.').pop()?.toLowerCase() || '']
    if (!mime) continue
    const photo = await read(`word/${path}`, MAX_IMAGE)
    if (!photo) continue
    const docProps = elements(drawing, 'docPr')[0]
    photos.push({
      id: `word:${document.id}:${path}`,
      projectId: document.project_id,
      title: docProps?.getAttribute('descr') || docProps?.getAttribute('title') || document.title,
      date: isoDay(document.revision_date || document.created_at) || '',
      src: URL.createObjectURL(new Blob([photo], { type: mime })),
    })
    if (photos.length >= MAX_PHOTOS) break
  }
  return { excerpt, photos }
}

export async function readWordReport(document: DocumentRow, signal: AbortSignal) {
  if (!isWordReport(document) || Number(document.file_size_kb) * 1024 > MAX_FILE) throw new Error('Word report preview unavailable')
  const { data, error } = await supabase.storage.from('project-files').createSignedUrl(document.storage_path!, 120)
  if (error || !data?.signedUrl) throw new Error('Word report preview unavailable')
  const response = await fetch(data.signedUrl, { signal })
  if (!response.ok || !response.body || Number(response.headers.get('Content-Length')) > MAX_FILE) throw new Error('Word report preview unavailable')
  const reader = response.body.getReader()
  const chunks: Uint8Array<ArrayBuffer>[] = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.length
      if (length > MAX_FILE) throw new Error('Word report preview unavailable')
      chunks.push(new Uint8Array(value))
    }
  } finally {
    await reader.cancel().catch(() => {})
  }
  if (signal.aborted) throw new Error('Word report preview unavailable')
  return extractWordReport(await new Blob(chunks).arrayBuffer(), document)
}

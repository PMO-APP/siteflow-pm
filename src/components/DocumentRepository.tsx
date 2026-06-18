import { useEffect, useState } from 'react'
import { Folder, FileText, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'

type StorageItem = {
  name: string
  id: string | null
  updated_at: string | null
  created_at: string | null
  last_accessed_at: string | null
  metadata: any
}

type DocumentRepositoryProps = {
  rootFolder?: string
  title?: string
}

export default function DocumentRepository({
  rootFolder = 'documents',
  title = 'Document Repository',
}: DocumentRepositoryProps) {
  const { projectId } = useProjectStore()
  const [path, setPath] = useState('')
  const [items, setItems] = useState<StorageItem[]>([])
  const [loading, setLoading] = useState(false)

  const basePath = projectId
    ? `projects/${projectId}/${rootFolder}`
    : ''

  const currentPath = path ? `${basePath}/${path}` : basePath

  useEffect(() => {
    setPath('')
  }, [projectId, rootFolder])

  useEffect(() => {
    if (!projectId) return
    loadFiles()
  }, [projectId, path, rootFolder])

  async function loadFiles() {
    if (!currentPath) return

    setLoading(true)

    const { data, error } = await supabase.storage
      .from('project-files')
      .list(currentPath, {
        limit: 100,
        sortBy: {
          column: 'name',
          order: 'asc',
        },
      })

    if (error) {
      console.error(error)
      alert(error.message)
    } else {
      setItems(data || [])
    }

    setLoading(false)
  }

  function openFolder(folderName: string) {
    setPath(path ? `${path}/${folderName}` : folderName)
  }

  function goBack() {
    const parts = path.split('/')
    parts.pop()
    setPath(parts.join('/'))
  }

  function getFileUrl(fileName: string) {
    const filePath = `${currentPath}/${fileName}`

    const { data } = supabase.storage
      .from('project-files')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  const displayPath = path
    ? `/${rootFolder}/${path}`
    : `/${rootFolder}`

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-[#ede8de]">
            {title}
          </div>

          <div className="text-[11px] text-[#6e7d8c] font-mono">
            {displayPath}
          </div>
        </div>

        {path && (
          <button className="btn btn-sm btn-ghost" onClick={goBack}>
            Back
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-[#6e7d8c] text-sm py-6">Loading files…</div>
      ) : items.length === 0 ? (
        <div className="text-[#6e7d8c] text-sm py-6">
          No files found in this folder.
        </div>
      ) : (
        <div className="grid gap-2">
          {items.map(item => {
            const isFolder = !item.metadata

            return (
              <div
                key={item.name}
                className="flex items-center justify-between p-3 rounded-xl bg-[#101820] border border-white/[0.06]"
              >
                <button
                  className="flex items-center gap-3 text-left"
                  onClick={() => isFolder && openFolder(item.name)}
                >
                  {isFolder ? (
                    <Folder size={18} className="text-[#c49e48]" />
                  ) : (
                    <FileText size={18} className="text-[#6e7d8c]" />
                  )}

                  <div>
                    <div className="text-sm text-[#ede8de]">
                      {item.name}
                    </div>

                    {!isFolder && (
                      <div className="text-[10px] text-[#6e7d8c]">
                        {Math.round((item.metadata?.size || 0) / 1024)} KB
                      </div>
                    )}
                  </div>
                </button>

                {!isFolder && (
                  <a
                    href={getFileUrl(item.name)}
                    target="_blank"
                    rel="noreferrer"
                    className="tbl-action"
                  >
                    <Download size={12} />
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

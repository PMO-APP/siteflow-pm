import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Copy .env.example to .env and fill in your values.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})

// Helper: get public URL for storage objects
export const getPublicUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

// Helper: upload file and return path
export const uploadFile = async (
  bucket: string,
  file: File,
  folder?: string
): Promise<{ path: string; publicUrl: string } | null> => {
  const ext = file.name.split('.').pop()
  const safeName = file.name
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9.-]/g, '')

  const fileName = `${folder ? folder + '/' : ''}${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}-${safeName}`

  console.log('Uploading to bucket:', bucket)
  console.log('Upload path:', fileName)
  console.log('File:', file)

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  console.log('Supabase upload data:', data)
  console.log('Supabase upload error:', error)

  if (error) {
    alert(error.message)
    throw error
  }

  if (!data) {
    alert('Upload failed: no data returned from Supabase.')
    return null
  }

  const publicUrl = getPublicUrl(bucket, data.path)

  return {
    path: data.path,
    publicUrl,
  }
}
export async function backupFileToGoogleDrive(params: {
  bucket: string
  filePath: string
  fileName: string
  projectId?: number | string | null
  projectName?: string | null
  documentType?: string | null
  discipline?: string | null
  title?: string | null
}) {
  const {
    bucket,
    filePath,
    fileName,
    projectId,
    projectName,
    documentType,
    discipline,
    title,
  } = params

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const response = await fetch(
    `${supabaseUrl}/functions/v1/backup-to-google-drive`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token || supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucket,
        filePath,
        fileName,
        projectId,
        projectName,
        documentType,
        discipline,
        title,
      }),
    }
  )

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(
      result.error || 'Google Drive backup failed.'
    )
  }

  return result as {
    success: true
    googleDriveFileId: string
    googleDriveUrl: string
    googleDriveFolderId?: string
  }
}

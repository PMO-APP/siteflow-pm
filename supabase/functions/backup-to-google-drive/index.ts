import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_DRIVE_API = 'https://www.googleapis.com/drive/v3'
const GOOGLE_DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function sanitizeName(value?: string | null) {
  return String(value || 'General')
    .trim()
    .replace(/[\\/:*?"<>|#%{}[\]~&]/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 120)
}

function escapeDriveQuery(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function base64UrlEncode(input: string | ArrayBuffer) {
  const bytes =
    typeof input === 'string'
      ? new TextEncoder().encode(input)
      : new Uint8Array(input)

  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

async function importPrivateKey(privateKeyPem: string) {
  const pem = privateKeyPem
    .replace(/\\n/g, '\n')
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')

  const binary = atob(pem)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }

  return crypto.subtle.importKey(
    'pkcs8',
    bytes.buffer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  )
}

async function getGoogleAccessToken() {
  const clientEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')
  const privateKey = Deno.env.get('GOOGLE_PRIVATE_KEY')

  if (!clientEmail || !privateKey) {
    throw new Error('Missing Google service account environment variables.')
  }

  const now = Math.floor(Date.now() / 1000)

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  }

  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: GOOGLE_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  }

  const unsignedJwt = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(payload)
  )}`

  const key = await importPrivateKey(privateKey)

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsignedJwt)
  )

  const jwt = `${unsignedJwt}.${base64UrlEncode(signature)}`

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result?.error_description || 'Unable to get Google token.')
  }

  return result.access_token as string
}

async function findOrCreateFolder(
  accessToken: string,
  folderName: string,
  parentId: string
) {
  const safeName = sanitizeName(folderName)
  const query = [
    `name='${escapeDriveQuery(safeName)}'`,
    `mimeType='application/vnd.google-apps.folder'`,
    `'${parentId}' in parents`,
    'trashed=false',
  ].join(' and ')

  const searchUrl = new URL(`${GOOGLE_DRIVE_API}/files`)
  searchUrl.searchParams.set('q', query)
  searchUrl.searchParams.set('fields', 'files(id,name)')
  searchUrl.searchParams.set('supportsAllDrives', 'true')
  searchUrl.searchParams.set('includeItemsFromAllDrives', 'true')

  const searchResponse = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const searchResult = await searchResponse.json()

  if (!searchResponse.ok) {
    throw new Error(searchResult?.error?.message || 'Google Drive folder search failed.')
  }

  if (searchResult.files?.[0]?.id) {
    return searchResult.files[0].id as string
  }

  const createResponse = await fetch(`${GOOGLE_DRIVE_API}/files?supportsAllDrives=true`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: safeName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  })

  const createResult = await createResponse.json()

  if (!createResponse.ok) {
    throw new Error(createResult?.error?.message || 'Google Drive folder creation failed.')
  }

  return createResult.id as string
}

async function uploadToGoogleDrive(params: {
  accessToken: string
  fileBlob: Blob
  fileName: string
  mimeType: string
  parentFolderId: string
}) {
  const metadata = {
    name: sanitizeName(params.fileName),
    parents: [params.parentFolderId],
  }

  const formData = new FormData()
  formData.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], {
      type: 'application/json',
    })
  )
  formData.append('file', params.fileBlob, sanitizeName(params.fileName))

  const response = await fetch(
    `${GOOGLE_DRIVE_UPLOAD}?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink,webContentLink`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
      },
      body: formData,
    }
  )

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result?.error?.message || 'Google Drive upload failed.')
  }

  return result as {
    id: string
    name: string
    webViewLink?: string
    webContentLink?: string
  }
}

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed.' }, 405)
  }

  try {
    const {
      bucket,
      filePath,
      fileName,
      projectId,
      projectName,
      documentType,
      type,
      discipline,
      title,
    } = await req.json()

    if (!bucket || !filePath || !fileName) {
      return jsonResponse(
        {
          success: false,
          error: 'bucket, filePath, and fileName are required.',
        },
        400
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const rootFolderId = Deno.env.get('GOOGLE_DRIVE_ROOT_FOLDER_ID')

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase service environment variables.')
    }

    if (!rootFolderId) {
      throw new Error('Missing GOOGLE_DRIVE_ROOT_FOLDER_ID.')
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
      },
    })

    const { data: storageFile, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(filePath)

    if (downloadError || !storageFile) {
      throw new Error(downloadError?.message || 'Unable to download file from Supabase Storage.')
    }

    const accessToken = await getGoogleAccessToken()

    const projectFolder = await findOrCreateFolder(
      accessToken,
      projectName || `Project-${projectId || 'Unknown'}`,
      rootFolderId
    )

    const typeFolder = await findOrCreateFolder(
      accessToken,
      documentType || type || 'Documents',
      projectFolder
    )

    const disciplineFolder = await findOrCreateFolder(
      accessToken,
      discipline || 'General',
      typeFolder
    )

    const finalFileName = title
      ? `${sanitizeName(title)} - ${sanitizeName(fileName)}`
      : sanitizeName(fileName)

    const uploaded = await uploadToGoogleDrive({
      accessToken,
      fileBlob: storageFile,
      fileName: finalFileName,
      mimeType: storageFile.type || 'application/octet-stream',
      parentFolderId: disciplineFolder,
    })

    return jsonResponse({
      success: true,
      googleDriveFileId: uploaded.id,
      googleDriveUrl: uploaded.webViewLink || uploaded.webContentLink || '',
      googleDriveFolderId: disciplineFolder,
      fileName: uploaded.name,
    })
  } catch (error) {
    console.error('backup-to-google-drive error:', error)

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Google Drive backup failed.',
      },
      500
    )
  }
})
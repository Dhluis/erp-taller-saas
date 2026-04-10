// src/lib/supabase/signature-storage.ts
// Handles upload/delete of the organization's Signature image.
// The file is stored in Supabase Storage under company-assets/{orgId}/signature-{timestamp}.{ext}
// The public URL is then saved in company_settings.signature_url.

import { createClient } from '@/lib/supabase/client'

const BUCKET = 'company-assets'

/**
 * Upload (or replace) the Signature for an organization.
 * Returns the public URL of the uploaded image.
 */
export async function uploadCompanySignature(
  organizationId: string,
  file: File
): Promise<string> {
  const supabase = createClient()

  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen')
  }

  const MAX_SIZE = 2 * 1024 * 1024 // 2 MB (signatures should be small)
  if (file.size > MAX_SIZE) {
    throw new Error('La imagen es demasiado grande. Máximo 2MB')
  }

  const extension = file.name.split('.').pop()
  // Use a timestamp to prevent browser caching issues and ensure uniqueness
  const filePath = `${organizationId}/signature-${Date.now()}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: true,
    })

  if (uploadError) {
    throw new Error(`Error al subir firma: ${uploadError.message}`)
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filePath)

  return urlData.publicUrl
}

/**
 * Delete a signature file from storage.
 */
export async function deleteCompanySignature(path: string): Promise<void> {
  const supabase = createClient()
  
  // Extract filePath from URL or full path
  // Placeholder for future cleanup logic
}

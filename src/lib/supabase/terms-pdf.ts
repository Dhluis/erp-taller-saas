// src/lib/supabase/terms-pdf.ts
// Handles upload/delete of the organization's Terms & Conditions PDF.
// The file is stored in Supabase Storage under company-assets/{orgId}/terms.pdf
// The public URL is then saved in company_settings.terms_pdf_url.

import { createClient } from '@/lib/supabase/client'

const BUCKET = 'company-assets'

/**
 * Upload (or replace) the T&C PDF for an organization.
 * Returns the public URL of the uploaded file.
 */
export async function uploadTermsPdf(
  organizationId: string,
  file: File
): Promise<string> {
  const supabase = createClient()

  if (file.type !== 'application/pdf') {
    throw new Error('Solo se permiten archivos PDF')
  }

  const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
  if (file.size > MAX_SIZE) {
    throw new Error('El archivo es demasiado grande. Máximo 10MB')
  }

  // Always use the same path so it overwrites the previous version
  const filePath = `${organizationId}/terms.pdf`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      contentType: 'application/pdf',
      cacheControl: '3600',
      upsert: true, // Overwrite if exists
    })

  if (uploadError) {
    throw new Error(`Error al subir PDF: ${uploadError.message}`)
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filePath)

  // Add cache-busting timestamp so browsers reload after update
  return `${urlData.publicUrl}?v=${Date.now()}`
}

/**
 * Delete the T&C PDF for an organization from storage.
 */
export async function deleteTermsPdf(organizationId: string): Promise<void> {
  const supabase = createClient()
  const filePath = `${organizationId}/terms.pdf`

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([filePath])

  if (error) {
    // Non-fatal: file may already be deleted
    console.warn('[deleteTermsPdf] Warning:', error.message)
  }
}

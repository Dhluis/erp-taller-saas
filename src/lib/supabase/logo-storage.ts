// src/lib/supabase/logo-storage.ts
// Handles upload/delete of the organization's Logo image.
// The file is stored in Supabase Storage under company-assets/{orgId}/logo-{timestamp}.{ext}
// The public URL is then saved in company_settings.logo_url.

import { createClient } from '@/lib/supabase/client'

const BUCKET = 'company-assets'

/**
 * Upload (or replace) the Logo for an organization.
 * Returns the public URL of the uploaded image.
 */
export async function uploadCompanyLogo(
  organizationId: string,
  file: File
): Promise<string> {
  const supabase = createClient()

  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen')
  }

  const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
  if (file.size > MAX_SIZE) {
    throw new Error('La imagen es demasiado grande. Máximo 5MB')
  }

  const extension = file.name.split('.').pop()
  // Use a timestamp to prevent browser caching issues and ensure uniqueness
  const filePath = `${organizationId}/logo-${Date.now()}.${extension}`

  // 1. Optional: Cleanup old logos in that folder? 
  // For now, we'll just upload and return the new URL. 
  // Usually, it's better to just overwrite 'logo.png', but cache-busing is easier with timestamps.

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: true,
    })

  if (uploadError) {
    throw new Error(`Error al subir logo: ${uploadError.message}`)
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filePath)

  return urlData.publicUrl
}

/**
 * Delete a logo file from storage.
 */
export async function deleteCompanyLogo(path: string): Promise<void> {
  const supabase = createClient()
  
  // Extract filePath from URL if needed, but usually we just want to delete the folder content or specific path
  // For now, this is a placeholder as logos with timestamps accumulate. 
  // A better way is always using 'logo.png' and cache-busting on the URL.
}

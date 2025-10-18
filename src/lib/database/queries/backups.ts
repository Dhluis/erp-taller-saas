import { createClient } from '@/lib/supabase/server'
import { executeWithErrorHandling } from '@/lib/core/errors'

/**
 * =====================================================
 * QUERIES PARA GESTIÓN DE BACKUPS
 * =====================================================
 * Sistema completo de consultas para backups
 * del ERP
 */

export interface Backup {
  id: string
  filename: string
  size: number
  organization_id: string
  tables: string[]
  record_count: number
  status: 'completed' | 'failed' | 'in_progress'
  error?: string
  created_at: string
  updated_at: string
}

export interface BackupSchedule {
  id: string
  organization_id: string
  schedule: {
    frequency: string
    time: string
    timezone: string
    enabled: boolean
  }
  last_run?: string
  next_run?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Obtener todos los backups de una organización
 */
export async function getAllBackups(
  organizationId: string,
  filters?: {
    status?: string
    date_from?: string
    date_to?: string
    page?: number
    limit?: number
  }
) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    
    let query = supabase
      .from('backups')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    // Aplicar filtros
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from)
    }

    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to)
    }

    // Paginación
    const page = filters?.page || 1
    const limit = filters?.limit || 20
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    return {
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    }
  }, { operation: 'getAllBackups', table: 'backups' })
}

/**
 * Obtener backup por ID
 */
export async function getBackupById(id: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('backups')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }, { operation: 'getBackupById', table: 'backups' })
}

/**
 * Crear registro de backup
 */
export async function createBackupRecord(data: {
  id: string
  filename: string
  size: number
  organization_id: string
  tables: string[]
  record_count: number
  status: string
  error?: string
}) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    const { data: backup, error } = await supabase
      .from('backups')
      .insert({
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return backup
  }, { operation: 'createBackupRecord', table: 'backups' })
}

/**
 * Actualizar estado de backup
 */
export async function updateBackupStatus(
  id: string,
  status: string,
  error?: string
) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    const { data, error: updateError } = await supabase
      .from('backups')
      .update({
        status,
        error,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError
    return data
  }, { operation: 'updateBackupStatus', table: 'backups' })
}

/**
 * Eliminar backup
 */
export async function deleteBackup(id: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Obtener información del backup
    const { data: backup } = await supabase
      .from('backups')
      .select('filename')
      .eq('id', id)
      .single()

    // Eliminar archivo del storage
    if (backup?.filename) {
      await supabase.storage
        .from('backups')
        .remove([backup.filename])
    }

    // Eliminar registro de la base de datos
    const { data, error } = await supabase
      .from('backups')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }, { operation: 'deleteBackup', table: 'backups' })
}

/**
 * Obtener estadísticas de backups
 */
export async function getBackupStats(organizationId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Total backups
    const { count: totalBackups } = await supabase
      .from('backups')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    // Backups exitosos
    const { count: successfulBackups } = await supabase
      .from('backups')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'completed')

    // Tamaño total
    const { data: sizeData } = await supabase
      .from('backups')
      .select('size')
      .eq('organization_id', organizationId)
      .eq('status', 'completed')

    const totalSize = sizeData?.reduce((sum, backup) => sum + (backup.size || 0), 0) || 0

    // Último backup
    const { data: lastBackup } = await supabase
      .from('backups')
      .select('created_at, status')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Backups por estado
    const { data: statusData } = await supabase
      .from('backups')
      .select('status')
      .eq('organization_id', organizationId)

    const statusCounts = statusData?.reduce((acc, backup) => {
      acc[backup.status] = (acc[backup.status] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Tasa de éxito
    const successRate = totalBackups > 0 ? (successfulBackups / totalBackups) * 100 : 0

    return {
      total_backups: totalBackups || 0,
      successful_backups: successfulBackups || 0,
      failed_backups: (totalBackups || 0) - (successfulBackups || 0),
      total_size: totalSize,
      success_rate: Math.round(successRate * 100) / 100,
      last_backup: lastBackup?.created_at || null,
      last_backup_status: lastBackup?.status || null,
      status_breakdown: statusCounts
    }
  }, { operation: 'getBackupStats', table: 'backups' })
}

/**
 * Obtener programación de backups
 */
export async function getBackupSchedule(organizationId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('backup_schedules')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()

    if (error) throw error
    return data
  }, { operation: 'getBackupSchedule', table: 'backup_schedules' })
}

/**
 * Crear o actualizar programación de backups
 */
export async function setBackupSchedule(
  organizationId: string,
  schedule: {
    frequency: string
    time: string
    timezone: string
    enabled: boolean
  }
) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('backup_schedules')
      .upsert({
        organization_id: organizationId,
        schedule,
        is_active: schedule.enabled,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  }, { operation: 'setBackupSchedule', table: 'backup_schedules' })
}

/**
 * Obtener backups recientes
 */
export async function getRecentBackups(organizationId: string, limit: number = 5) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('backups')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }, { operation: 'getRecentBackups', table: 'backups' })
}

/**
 * Buscar backups
 */
export async function searchBackups(
  organizationId: string,
  query: string,
  limit: number = 20
) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('backups')
      .select('*')
      .eq('organization_id', organizationId)
      .or(
        `id.ilike.%${query}%,` +
        `filename.ilike.%${query}%`
      )
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }, { operation: 'searchBackups', table: 'backups' })
}

/**
 * Limpiar backups antiguos
 */
export async function cleanupOldBackups(
  organizationId: string,
  keepCount: number = 30
) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Obtener backups ordenados por fecha
    const { data: backups } = await supabase
      .from('backups')
      .select('id, filename, created_at')
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })

    if (!backups || backups.length <= keepCount) {
      return { message: 'No backups to clean up', deleted_count: 0 }
    }

    // Eliminar backups excedentes
    const toDelete = backups.slice(keepCount)
    let deletedCount = 0

    for (const backup of toDelete) {
      try {
        // Eliminar archivo del storage
        await supabase.storage
          .from('backups')
          .remove([backup.filename])

        // Eliminar registro de la base de datos
        await supabase
          .from('backups')
          .delete()
          .eq('id', backup.id)

        deletedCount++
      } catch (error) {
        console.warn(`Error cleaning up backup ${backup.id}:`, error)
      }
    }

    return {
      message: `Cleaned up ${deletedCount} old backups`,
      deleted_count: deletedCount
    }
  }, { operation: 'cleanupOldBackups', table: 'backups' })
}

/**
 * Verificar integridad de todos los backups
 */
export async function verifyAllBackups(organizationId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Obtener todos los backups
    const { data: backups } = await supabase
      .from('backups')
      .select('id, filename, status')
      .eq('organization_id', organizationId)
      .eq('status', 'completed')

    if (!backups || backups.length === 0) {
      return { message: 'No backups to verify', verified_count: 0 }
    }

    let verifiedCount = 0
    const issues: string[] = []

    for (const backup of backups) {
      try {
        // Verificar si el archivo existe en storage
        const { data: fileData, error: fileError } = await supabase.storage
          .from('backups')
          .download(backup.filename)

        if (fileError) {
          issues.push(`Backup ${backup.id}: File not found in storage`)
        } else {
          verifiedCount++
        }
      } catch (error) {
        issues.push(`Backup ${backup.id}: Verification error`)
      }
    }

    return {
      message: `Verified ${verifiedCount} of ${backups.length} backups`,
      verified_count: verifiedCount,
      total_backups: backups.length,
      issues
    }
  }, { operation: 'verifyAllBackups', table: 'backups' })
}


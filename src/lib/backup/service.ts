import { createClient } from '@/lib/supabase/server'
import { executeWithErrorHandling } from '@/lib/core/errors'

/**
 * =====================================================
 * SERVICIO DE BACKUP AUTOMÁTICO
 * =====================================================
 * Sistema completo de backup para Supabase
 * con almacenamiento en Supabase Storage
 */

export interface BackupInfo {
  id: string
  filename: string
  size: number
  created_at: string
  tables: string[]
  record_count: number
  status: 'completed' | 'failed' | 'in_progress'
  error?: string
}

export interface BackupData {
  timestamp: string
  organization_id: string
  tables: Record<string, any[]>
  metadata: {
    total_records: number
    table_counts: Record<string, number>
    backup_version: string
  }
}

/**
 * Crear backup completo de la base de datos
 */
export async function createBackup(organizationId: string): Promise<BackupInfo> {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupId = `backup-${timestamp}`
    const filename = `${backupId}.json`

    try {
      // 1. Exportar todas las tablas importantes
      const tables = [
        'customers',
        'vehicles', 
        'quotations',
        'work_orders',
        'invoices',
        'products',
        'inventory_movements',
        'suppliers',
        'purchase_orders',
        'purchase_order_items',
        'system_users',
        'notifications',
        'organizations'
      ]

      const backupData: BackupData = {
        timestamp: new Date().toISOString(),
        organization_id: organizationId,
        tables: {},
        metadata: {
          total_records: 0,
          table_counts: {},
          backup_version: '1.0.0'
        }
      }

      let totalRecords = 0

      // Exportar cada tabla
      for (const tableName of tables) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .eq('organization_id', organizationId)

          if (error) {
            console.warn(`Error exporting table ${tableName}:`, error.message)
            backupData.tables[tableName] = []
            backupData.metadata.table_counts[tableName] = 0
          } else {
            backupData.tables[tableName] = data || []
            backupData.metadata.table_counts[tableName] = (data || []).length
            totalRecords += (data || []).length
          }
        } catch (tableError) {
          console.warn(`Error accessing table ${tableName}:`, tableError)
          backupData.tables[tableName] = []
          backupData.metadata.table_counts[tableName] = 0
        }
      }

      backupData.metadata.total_records = totalRecords

      // 2. Crear archivo JSON con timestamp
      const jsonData = JSON.stringify(backupData, null, 2)
      const blob = new Blob([jsonData], { type: 'application/json' })

      // 3. Subir a storage de Supabase
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('backups')
        .upload(filename, blob, {
          contentType: 'application/json',
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Error uploading backup: ${uploadError.message}`)
      }

      // 4. Crear registro del backup en la base de datos
      const { data: backupRecord, error: recordError } = await supabase
        .from('backups')
        .insert({
          id: backupId,
          filename,
          size: blob.size,
          organization_id: organizationId,
          tables: tables,
          record_count: totalRecords,
          status: 'completed',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (recordError) {
        console.warn('Error creating backup record:', recordError.message)
      }

      // 5. Mantener últimos 30 backups
      await cleanupOldBackups(organizationId, 30)

      return {
        id: backupId,
        filename,
        size: blob.size,
        created_at: new Date().toISOString(),
        tables,
        record_count: totalRecords,
        status: 'completed'
      }

    } catch (error: any) {
      // Registrar backup fallido
      await supabase
        .from('backups')
        .insert({
          id: backupId,
          filename,
          size: 0,
          organization_id: organizationId,
          tables: [],
          record_count: 0,
          status: 'failed',
          error: error.message,
          created_at: new Date().toISOString()
        })

      throw error
    }
  }, { operation: 'createBackup', table: 'backups' })
}

/**
 * Restaurar backup desde archivo
 */
export async function restoreBackup(backupId: string, organizationId: string): Promise<{ message: string; restored_tables: string[] }> {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    try {
      // 1. Descargar backup
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from('backups')
        .download(`${backupId}.json`)

      if (downloadError) {
        throw new Error(`Error downloading backup: ${downloadError.message}`)
      }

      // 2. Leer y parsear datos
      const text = await downloadData.text()
      const backupData: BackupData = JSON.parse(text)

      // 3. Validar integridad
      if (!backupData.timestamp || !backupData.tables) {
        throw new Error('Invalid backup file format')
      }

      if (backupData.organization_id !== organizationId) {
        throw new Error('Backup organization mismatch')
      }

      // 4. Restaurar datos
      const restoredTables: string[] = []

      for (const [tableName, records] of Object.entries(backupData.tables)) {
        if (records.length === 0) continue

        try {
          // Limpiar tabla existente para esta organización
          await supabase
            .from(tableName)
            .delete()
            .eq('organization_id', organizationId)

          // Insertar datos del backup
          const { error: insertError } = await supabase
            .from(tableName)
            .insert(records)

          if (insertError) {
            console.warn(`Error restoring table ${tableName}:`, insertError.message)
          } else {
            restoredTables.push(tableName)
          }
        } catch (tableError) {
          console.warn(`Error processing table ${tableName}:`, tableError)
        }
      }

      return {
        message: `Backup restored successfully. ${restoredTables.length} tables restored.`,
        restored_tables: restoredTables
      }

    } catch (error: any) {
      throw new Error(`Restore failed: ${error.message}`)
    }
  }, { operation: 'restoreBackup', table: 'backups' })
}

/**
 * Programar backups automáticos
 */
export async function scheduleBackups(organizationId: string): Promise<{ message: string; schedule: string }> {
  return executeWithErrorHandling(async () => {
    // En un entorno real, esto se integraría con un sistema de cron jobs
    // o un servicio como Vercel Cron, AWS Lambda, etc.
    
    const schedule = {
      frequency: 'daily',
      time: '02:00',
      timezone: 'America/Mexico_City',
      enabled: true
    }

    // Crear registro de programación
    const supabase = await createClient()
    await supabase
      .from('backup_schedules')
      .upsert({
        organization_id: organizationId,
        schedule: schedule,
        last_run: null,
        next_run: calculateNextRun(schedule),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    return {
      message: 'Backup schedule configured successfully',
      schedule: `Daily at ${schedule.time} ${schedule.timezone}`
    }
  }, { operation: 'scheduleBackups', table: 'backup_schedules' })
}

/**
 * Ejecutar backup programado
 */
export async function executeScheduledBackup(organizationId: string): Promise<BackupInfo> {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Verificar si ya se ejecutó hoy
    const today = new Date().toISOString().split('T')[0]
    const { data: existingBackup } = await supabase
      .from('backups')
      .select('id')
      .eq('organization_id', organizationId)
      .gte('created_at', today)
      .eq('status', 'completed')
      .single()

    if (existingBackup) {
      return {
        id: existingBackup.id,
        filename: '',
        size: 0,
        created_at: existingBackup.created_at || new Date().toISOString(),
        tables: [],
        record_count: 0,
        status: 'completed'
      }
    }

    // Ejecutar backup
    return await createBackup(organizationId)
  }, { operation: 'executeScheduledBackup', table: 'backups' })
}

/**
 * Limpiar backups antiguos
 */
async function cleanupOldBackups(organizationId: string, keepCount: number = 30): Promise<void> {
  const supabase = await createClient()

  // Obtener backups ordenados por fecha (más recientes primero)
  const { data: backups } = await supabase
    .from('backups')
    .select('id, filename, created_at')
    .eq('organization_id', organizationId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })

  if (!backups || backups.length <= keepCount) return

  // Eliminar backups excedentes
  const toDelete = backups.slice(keepCount)
  
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
    } catch (error) {
      console.warn(`Error cleaning up backup ${backup.id}:`, error)
    }
  }
}

/**
 * Obtener lista de backups
 */
export async function getBackups(organizationId: string, limit: number = 20): Promise<BackupInfo[]> {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('backups')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return (data || []).map(backup => ({
      id: backup.id,
      filename: backup.filename,
      size: backup.size,
      created_at: backup.created_at,
      tables: backup.tables || [],
      record_count: backup.record_count || 0,
      status: backup.status,
      error: backup.error
    }))
  }, { operation: 'getBackups', table: 'backups' })
}

/**
 * Obtener estadísticas de backup
 */
export async function getBackupStats(organizationId: string): Promise<{
  total_backups: number
  total_size: number
  last_backup: string | null
  success_rate: number
}> {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Estadísticas generales
    const { count: totalBackups } = await supabase
      .from('backups')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    const { data: backups } = await supabase
      .from('backups')
      .select('size, status, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    const totalSize = backups?.reduce((sum, backup) => sum + (backup.size || 0), 0) || 0
    const successfulBackups = backups?.filter(b => b.status === 'completed').length || 0
    const successRate = totalBackups > 0 ? (successfulBackups / totalBackups) * 100 : 0
    const lastBackup = backups?.[0]?.created_at || null

    return {
      total_backups: totalBackups || 0,
      total_size: totalSize,
      last_backup: lastBackup,
      success_rate: Math.round(successRate * 100) / 100
    }
  }, { operation: 'getBackupStats', table: 'backups' })
}

/**
 * Calcular próxima ejecución
 */
function calculateNextRun(schedule: any): string {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(2, 0, 0, 0) // 2 AM
  return tomorrow.toISOString()
}

/**
 * Verificar integridad de backup
 */
export async function verifyBackupIntegrity(backupId: string): Promise<{
  is_valid: boolean
  issues: string[]
  file_size: number
  record_count: number
}> {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    const issues: string[] = []

    try {
      // Descargar y verificar archivo
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from('backups')
        .download(`${backupId}.json`)

      if (downloadError) {
        issues.push(`Error downloading backup: ${downloadError.message}`)
        return { is_valid: false, issues, file_size: 0, record_count: 0 }
      }

      const text = await downloadData.text()
      const backupData: BackupData = JSON.parse(text)

      // Verificaciones de integridad
      if (!backupData.timestamp) issues.push('Missing timestamp')
      if (!backupData.organization_id) issues.push('Missing organization_id')
      if (!backupData.tables) issues.push('Missing tables data')
      if (!backupData.metadata) issues.push('Missing metadata')

      const recordCount = backupData.metadata?.total_records || 0
      const fileSize = text.length

      return {
        is_valid: issues.length === 0,
        issues,
        file_size: fileSize,
        record_count: recordCount
      }

    } catch (error: any) {
      issues.push(`Parse error: ${error.message}`)
      return { is_valid: false, issues, file_size: 0, record_count: 0 }
    }
  }, { operation: 'verifyBackupIntegrity', table: 'backups' })
}


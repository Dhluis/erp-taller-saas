/**
 * 🔍 VALIDADOR DE ESQUEMA DE BASE DE DATOS
 * 
 * Este script valida que el esquema documentado coincida con la base de datos real.
 * Ejecutar periódicamente para mantener la documentación actualizada.
 */

import { getSupabaseClient } from '../supabase';

interface ColumnInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length?: number;
  numeric_precision?: number;
  numeric_scale?: number;
}

interface IndexInfo {
  table_name: string;
  indexname: string;
  indexdef: string;
  index_size: string;
}

interface ForeignKeyInfo {
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
  constraint_name: string;
}

export class SchemaValidator {
  private supabase = getSupabaseClient();

  /**
   * 🔍 Obtener información de todas las columnas
   */
  async getColumns(): Promise<ColumnInfo[]> {
    const { data, error } = await this.supabase.rpc('get_columns_info');
    
    if (error) {
      console.error('❌ Error obteniendo columnas:', error);
      return [];
    }
    
    return data || [];
  }

  /**
   * 🔍 Obtener información de índices
   */
  async getIndexes(): Promise<IndexInfo[]> {
    const { data, error } = await this.supabase.rpc('get_indexes_info');
    
    if (error) {
      console.error('❌ Error obteniendo índices:', error);
      return [];
    }
    
    return data || [];
  }

  /**
   * 🔍 Obtener información de foreign keys
   */
  async getForeignKeys(): Promise<ForeignKeyInfo[]> {
    const { data, error } = await this.supabase.rpc('get_foreign_keys_info');
    
    if (error) {
      console.error('❌ Error obteniendo foreign keys:', error);
      return [];
    }
    
    return data || [];
  }

  /**
   * 📊 Validar esquema completo
   */
  async validateSchema(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    summary: {
      totalTables: number;
      totalColumns: number;
      totalIndexes: number;
      totalForeignKeys: number;
    };
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Obtener información de la base de datos
      const columns = await this.getColumns();
      const indexes = await this.getIndexes();
      const foreignKeys = await this.getForeignKeys();

      // Agrupar columnas por tabla
      const tables = new Map<string, ColumnInfo[]>();
      columns.forEach(col => {
        if (!tables.has(col.table_name)) {
          tables.set(col.table_name, []);
        }
        tables.get(col.table_name)!.push(col);
      });

      // Validaciones básicas
      if (columns.length === 0) {
        errors.push('❌ No se encontraron columnas en la base de datos');
      }

      if (tables.size === 0) {
        errors.push('❌ No se encontraron tablas en la base de datos');
      }

      // Validar tablas esperadas
      const expectedTables = [
        'work_orders',
        'customers', 
        'vehicles',
        'organizations',
        'user_profiles',
        'inventory_items',
        'invoices',
        'payments',
        'quotations',
        'notifications',
        'suppliers',
        'purchase_orders'
      ];

      expectedTables.forEach(tableName => {
        if (!tables.has(tableName)) {
          warnings.push(`⚠️ Tabla esperada no encontrada: ${tableName}`);
        }
      });

      // Validar columnas esenciales
      const essentialColumns = {
        'work_orders': ['id', 'customer_id', 'vehicle_id', 'organization_id'],
        'customers': ['id', 'organization_id'],
        'vehicles': ['id', 'customer_id', 'organization_id'],
        'organizations': ['id'],
        'user_profiles': ['id', 'user_id', 'organization_id']
      };

      Object.entries(essentialColumns).forEach(([tableName, requiredCols]) => {
        const tableColumns = tables.get(tableName);
        if (tableColumns) {
          requiredCols.forEach(colName => {
            if (!tableColumns.find(col => col.column_name === colName)) {
              errors.push(`❌ Columna esencial faltante: ${tableName}.${colName}`);
            }
          });
        }
      });

      // Validar tipos de datos
      columns.forEach(col => {
        if (col.column_name === 'id' && col.data_type !== 'uuid') {
          warnings.push(`⚠️ Columna ${col.table_name}.id debería ser UUID, es ${col.data_type}`);
        }
        
        if (col.column_name === 'organization_id' && col.data_type !== 'uuid') {
          errors.push(`❌ ${col.table_name}.organization_id debe ser UUID para multi-tenancy`);
        }
      });

      // Generar resumen
      const summary = {
        totalTables: tables.size,
        totalColumns: columns.length,
        totalIndexes: indexes.length,
        totalForeignKeys: foreignKeys.length
      };

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        summary
      };

    } catch (error) {
      console.error('❌ Error validando esquema:', error);
      return {
        isValid: false,
        errors: [`Error de validación: ${error}`],
        warnings: [],
        summary: {
          totalTables: 0,
          totalColumns: 0,
          totalIndexes: 0,
          totalForeignKeys: 0
        }
      };
    }
  }

  /**
   * 📄 Generar reporte de validación
   */
  async generateReport(): Promise<string> {
    const validation = await this.validateSchema();
    
    let report = '# 🔍 REPORTE DE VALIDACIÓN DE ESQUEMA\n\n';
    report += `**Fecha:** ${new Date().toLocaleString()}\n\n`;
    
    // Resumen
    report += '## 📊 Resumen\n';
    report += `- **Estado:** ${validation.isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO'}\n`;
    report += `- **Tablas:** ${validation.summary.totalTables}\n`;
    report += `- **Columnas:** ${validation.summary.totalColumns}\n`;
    report += `- **Índices:** ${validation.summary.totalIndexes}\n`;
    report += `- **Foreign Keys:** ${validation.summary.totalForeignKeys}\n\n`;
    
    // Errores
    if (validation.errors.length > 0) {
      report += '## ❌ Errores Críticos\n';
      validation.errors.forEach(error => {
        report += `- ${error}\n`;
      });
      report += '\n';
    }
    
    // Advertencias
    if (validation.warnings.length > 0) {
      report += '## ⚠️ Advertencias\n';
      validation.warnings.forEach(warning => {
        report += `- ${warning}\n`;
      });
      report += '\n';
    }
    
    // Recomendaciones
    report += '## 💡 Recomendaciones\n';
    report += '- Ejecutar validación periódicamente\n';
    report += '- Actualizar documentación cuando se modifique el esquema\n';
    report += '- Verificar foreign keys y relaciones\n';
    report += '- Revisar índices para optimización\n\n';
    
    return report;
  }
}

// 🔧 Funciones RPC necesarias en Supabase
export const schemaValidationRPC = {
  // Crear función RPC para obtener columnas
  get_columns_info: `
    CREATE OR REPLACE FUNCTION get_columns_info()
    RETURNS TABLE (
      table_name text,
      column_name text,
      data_type text,
      is_nullable text,
      column_default text,
      character_maximum_length integer,
      numeric_precision integer,
      numeric_scale integer
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        c.table_name::text,
        c.column_name::text,
        c.data_type::text,
        c.is_nullable::text,
        c.column_default::text,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
      ORDER BY c.table_name, c.ordinal_position;
    END;
    $$ LANGUAGE plpgsql;
  `,
  
  // Crear función RPC para obtener índices
  get_indexes_info: `
    CREATE OR REPLACE FUNCTION get_indexes_info()
    RETURNS TABLE (
      table_name text,
      indexname text,
      indexdef text,
      index_size text
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        t.table_name::text,
        i.indexname::text,
        i.indexdef::text,
        pg_size_pretty(pg_relation_size(i.indexrelid))::text
      FROM information_schema.tables t
      LEFT JOIN pg_indexes i ON t.table_name = i.tablename
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name, i.indexname;
    END;
    $$ LANGUAGE plpgsql;
  `,
  
  // Crear función RPC para obtener foreign keys
  get_foreign_keys_info: `
    CREATE OR REPLACE FUNCTION get_foreign_keys_info()
    RETURNS TABLE (
      table_name text,
      column_name text,
      foreign_table_name text,
      foreign_column_name text,
      constraint_name text
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT
        tc.table_name::text,
        kcu.column_name::text,
        ccu.table_name::text,
        ccu.column_name::text,
        tc.constraint_name::text
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name;
    END;
    $$ LANGUAGE plpgsql;
  `
};

// 📝 Instrucciones de uso:
// 1. Ejecutar las funciones RPC en Supabase SQL Editor
// 2. Usar SchemaValidator para validar el esquema
// 3. Generar reportes periódicamente
// 4. Actualizar documentación según los resultados

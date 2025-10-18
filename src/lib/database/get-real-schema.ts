/**
 * 🔍 OBTENER ESQUEMA REAL DE SUPABASE
 * 
 * Este script ejecuta consultas SQL en Supabase para obtener
 * el esquema real de la base de datos y actualizar la documentación.
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

export class SchemaExtractor {
  private supabase = getSupabaseClient();

  /**
   * 🔍 Obtener información de todas las columnas
   */
  async getColumns(): Promise<ColumnInfo[]> {
    console.log('🔍 Obteniendo información de columnas...');
    
    const { data, error } = await this.supabase
      .from('information_schema.columns')
      .select(`
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      `)
      .eq('table_schema', 'public')
      .order('table_name')
      .order('ordinal_position');

    if (error) {
      console.error('❌ Error obteniendo columnas:', error);
      // Fallback: usar consulta directa
      return await this.getColumnsDirect();
    }

    console.log(`✅ Obtenidas ${data?.length || 0} columnas`);
    return data || [];
  }

  /**
   * 🔍 Obtener columnas usando consulta directa (fallback)
   */
  private async getColumnsDirect(): Promise<ColumnInfo[]> {
    console.log('🔄 Intentando obtener columnas con consulta directa...');
    
    try {
      const { data, error } = await this.supabase.rpc('get_columns_info');
      
      if (error) {
        console.error('❌ Error en consulta directa:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Error en fallback:', error);
      return [];
    }
  }

  /**
   * 🔍 Obtener información de índices
   */
  async getIndexes(): Promise<IndexInfo[]> {
    console.log('🔍 Obteniendo información de índices...');
    
    try {
      const { data, error } = await this.supabase.rpc('get_indexes_info');
      
      if (error) {
        console.error('❌ Error obteniendo índices:', error);
        return [];
      }
      
      console.log(`✅ Obtenidos ${data?.length || 0} índices`);
      return data || [];
    } catch (error) {
      console.error('❌ Error en consulta de índices:', error);
      return [];
    }
  }

  /**
   * 🔍 Obtener información de foreign keys
   */
  async getForeignKeys(): Promise<ForeignKeyInfo[]> {
    console.log('🔍 Obteniendo información de foreign keys...');
    
    try {
      const { data, error } = await this.supabase.rpc('get_foreign_keys_info');
      
      if (error) {
        console.error('❌ Error obteniendo foreign keys:', error);
        return [];
      }
      
      console.log(`✅ Obtenidas ${data?.length || 0} foreign keys`);
      return data || [];
    } catch (error) {
      console.error('❌ Error en consulta de foreign keys:', error);
      return [];
    }
  }

  /**
   * 📊 Obtener información de tablas y tamaños
   */
  async getTablesInfo(): Promise<any[]> {
    console.log('🔍 Obteniendo información de tablas...');
    
    try {
      const { data, error } = await this.supabase.rpc('get_tables_info');
      
      if (error) {
        console.error('❌ Error obteniendo información de tablas:', error);
        return [];
      }
      
      console.log(`✅ Obtenida información de ${data?.length || 0} tablas`);
      return data || [];
    } catch (error) {
      console.error('❌ Error en consulta de tablas:', error);
      return [];
    }
  }

  /**
   * 📄 Generar documentación completa del esquema
   */
  async generateSchemaDocumentation(): Promise<string> {
    console.log('📄 Generando documentación del esquema...');
    
    const columns = await this.getColumns();
    const indexes = await this.getIndexes();
    const foreignKeys = await this.getForeignKeys();
    const tablesInfo = await this.getTablesInfo();

    // Agrupar columnas por tabla
    const tables = new Map<string, ColumnInfo[]>();
    columns.forEach(col => {
      if (!tables.has(col.table_name)) {
        tables.set(col.table_name, []);
      }
      tables.get(col.table_name)!.push(col);
    });

    let documentation = `# 📊 ESQUEMA DE BASE DE DATOS - SUPABASE

> **⚠️ IMPORTANTE:** Este documento se genera automáticamente desde la base de datos real.
> 
> **📅 Última actualización:** ${new Date().toLocaleString()}
> 
> **🔧 Para actualizar:** Ejecutar \`SchemaExtractor.generateSchemaDocumentation()\`

## 📋 RESUMEN DEL ESQUEMA

- **Total de tablas:** ${tables.size}
- **Total de columnas:** ${columns.length}
- **Total de índices:** ${indexes.length}
- **Total de foreign keys:** ${foreignKeys.length}

## 📊 TABLAS DE LA BASE DE DATOS

`;

    // Generar documentación para cada tabla
    Array.from(tables.entries()).forEach(([tableName, tableColumns]) => {
      const tableForeignKeys = foreignKeys.filter(fk => fk.table_name === tableName);
      const tableIndexes = indexes.filter(idx => idx.table_name === tableName);
      
      documentation += `### 🔧 Tabla: ${tableName}
| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
`;

      tableColumns.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'SÍ' : 'NO';
        const defaultValue = col.column_default || 'NULL';
        const description = this.getColumnDescription(col);
        
        documentation += `| ${col.column_name} | ${col.data_type} | ${nullable} | ${defaultValue} | ${description} |\n`;
      });

      if (tableForeignKeys.length > 0) {
        documentation += `\n**Relaciones:**\n`;
        tableForeignKeys.forEach(fk => {
          documentation += `- ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}\n`;
        });
      }

      if (tableIndexes.length > 0) {
        documentation += `\n**Índices:**\n`;
        tableIndexes.forEach(idx => {
          if (idx.indexname) {
            documentation += `- ${idx.indexname}: ${idx.indexdef}\n`;
          }
        });
      }

      documentation += `\n---\n\n`;
    });

    // Agregar información adicional
    documentation += `## 🔍 INFORMACIÓN ADICIONAL

### 📊 Tamaños de Tablas
`;

    tablesInfo.forEach(table => {
      documentation += `- **${table.tablename}:** ${table.size}\n`;
    });

    documentation += `
### 🔗 Foreign Keys por Tabla
`;

    const fkByTable = new Map<string, ForeignKeyInfo[]>();
    foreignKeys.forEach(fk => {
      if (!fkByTable.has(fk.table_name)) {
        fkByTable.set(fk.table_name, []);
      }
      fkByTable.get(fk.table_name)!.push(fk);
    });

    Array.from(fkByTable.entries()).forEach(([tableName, fks]) => {
      documentation += `\n**${tableName}:**\n`;
      fks.forEach(fk => {
        documentation += `- ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}\n`;
      });
    });

    documentation += `
### 🔍 Consideraciones Importantes

- **Multi-tenancy:** Todas las tablas deben tener \`organization_id\` para aislamiento de datos
- **Seguridad:** Usar RLS (Row Level Security) en Supabase
- **Performance:** Crear índices en campos de búsqueda frecuente
- **Consistencia:** Mantener foreign keys válidas

---

**Última actualización:** ${new Date().toLocaleString()}
`;

    return documentation;
  }

  /**
   * 📝 Generar descripción de columna basada en su tipo y nombre
   */
  private getColumnDescription(col: ColumnInfo): string {
    const name = col.column_name;
    const type = col.data_type;

    // Descripciones basadas en nombres comunes
    if (name === 'id') return 'Primary key';
    if (name === 'organization_id') return 'FK a organizations (multi-tenancy)';
    if (name === 'user_id') return 'FK a auth.users';
    if (name === 'customer_id') return 'FK a customers';
    if (name === 'vehicle_id') return 'FK a vehicles';
    if (name === 'work_order_id') return 'FK a work_orders';
    if (name === 'invoice_id') return 'FK a invoices';
    if (name === 'supplier_id') return 'FK a suppliers';
    if (name === 'created_at') return 'Fecha de creación';
    if (name === 'updated_at') return 'Última actualización';
    if (name === 'email') return 'Email del usuario/cliente';
    if (name === 'phone') return 'Teléfono';
    if (name === 'address') return 'Dirección';
    if (name === 'status') return 'Estado del registro';
    if (name === 'name') return 'Nombre';
    if (name === 'description') return 'Descripción';
    if (name === 'amount') return 'Monto';
    if (name === 'price') return 'Precio';
    if (name === 'quantity') return 'Cantidad';
    if (name === 'total_amount') return 'Total del monto';
    if (name === 'subtotal') return 'Subtotal';
    if (name === 'tax_amount') return 'Monto de impuestos';

    // Descripciones basadas en tipo
    if (type === 'uuid') return 'Identificador único';
    if (type === 'text') return 'Texto';
    if (type === 'integer') return 'Número entero';
    if (type === 'numeric') return 'Número decimal';
    if (type === 'boolean') return 'Valor booleano';
    if (type === 'timestamptz') return 'Fecha y hora con zona horaria';
    if (type === 'date') return 'Fecha';

    return 'Campo de datos';
  }

  /**
   * 💾 Guardar documentación en archivo
   */
  async saveSchemaDocumentation(): Promise<void> {
    console.log('💾 Guardando documentación del esquema...');
    
    try {
      const documentation = await this.generateSchemaDocumentation();
      
      // Aquí normalmente escribirías al archivo, pero como no podemos escribir archivos
      // desde el cliente, retornamos la documentación para que se copie manualmente
      console.log('📄 Documentación generada:');
      console.log('=====================================');
      console.log(documentation);
      console.log('=====================================');
      
      console.log('✅ Documentación generada exitosamente');
      console.log('📝 Copia el contenido anterior y pégalo en src/lib/database/SCHEMA.md');
      
    } catch (error) {
      console.error('❌ Error generando documentación:', error);
    }
  }
}

// 🔧 Funciones RPC necesarias en Supabase (ejecutar en SQL Editor)
export const requiredRPCFunctions = `
-- Función para obtener columnas
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

-- Función para obtener índices
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

-- Función para obtener foreign keys
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

-- Función para obtener información de tablas
CREATE OR REPLACE FUNCTION get_tables_info()
RETURNS TABLE (
  tablename text,
  size text,
  table_size text,
  index_size text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname||'.'||tablename::text,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))::text,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename))::text,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename))::text
  FROM pg_tables 
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;
`;

// 📝 Instrucciones de uso:
// 1. Ejecutar las funciones RPC en Supabase SQL Editor
// 2. Usar SchemaExtractor para obtener el esquema real
// 3. Copiar la documentación generada a SCHEMA.md
// 4. Verificar que todo esté correcto

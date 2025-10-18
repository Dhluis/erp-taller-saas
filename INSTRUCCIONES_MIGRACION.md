# 🚀 INSTRUCCIONES PARA EJECUTAR MIGRACIÓN DE SUPABASE

## ⚠️ PROBLEMA IDENTIFICADO
El error que estás viendo se debe a que las tablas necesarias no existen en tu base de datos de Supabase. Necesitamos crear las tablas faltantes.

## 📋 PASOS A SEGUIR:

### 1. **Acceder a Supabase Dashboard**
- Ve a tu proyecto en [supabase.com](https://supabase.com)
- Inicia sesión en tu cuenta
- Selecciona tu proyecto EAGLES ERP

### 2. **Abrir SQL Editor**
- En el menú lateral izquierdo, haz clic en **"SQL Editor"**
- Haz clic en **"New query"**

### 3. **Ejecutar la Migración**
- Copia TODO el contenido del archivo `supabase/migrations/005_add_missing_tables.sql`
- Pégalo en el editor SQL
- Haz clic en **"Run"** para ejecutar la migración

### 4. **Verificar la Ejecución**
- Deberías ver mensajes de éxito para cada tabla creada
- Si hay errores, probablemente sea porque algunas tablas ya existen (esto es normal)

## 🎯 **TABLAS QUE SE VAN A CREAR:**

1. ✅ `inventory_categories` - Categorías de inventario
2. ✅ `inventory` - Productos de inventario
3. ✅ `quotations` - Cotizaciones
4. ✅ `collections` - Cobros
5. ✅ `purchase_orders` - Órdenes de compra
6. ✅ `payments` - Pagos a proveedores
7. ✅ `system_users` - Usuarios del sistema
8. ✅ `company_settings` - Configuración de empresa
9. ✅ `invoices` - Facturas
10. ✅ `invoice_items` - Items de factura

## 🔧 **DATOS DE EJEMPLO INCLUIDOS:**

La migración también inserta datos de ejemplo:
- 4 categorías de inventario (Aceites, Filtros, Frenos, Motor)
- 2 productos de ejemplo (Aceite Motor, Filtro de Aire)

## ✅ **DESPUÉS DE LA MIGRACIÓN:**

1. **Recarga tu aplicación** en el navegador
2. **Verifica que no haya más errores** en la consola
3. **Las páginas deberían funcionar** con datos reales de Supabase

## 🆘 **SI HAY PROBLEMAS:**

- Verifica que tu archivo `.env.local` tenga las credenciales correctas
- Asegúrate de que las variables de entorno estén configuradas
- Revisa la consola del navegador para errores específicos

---

**¡Una vez ejecutada la migración, tu sistema ERP estará completamente funcional con Supabase!** 🎉

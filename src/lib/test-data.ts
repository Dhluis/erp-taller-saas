/**
 * Datos de prueba para desarrollo
 * Datos de ejemplo para testing y desarrollo
 */

export const testData = {
  organizations: [
    {
      id: '00000000-0000-0000-0000-000000000000',
      name: 'Default Organization',
      slug: 'default',
      description: 'Default organization for development',
      is_active: true
    }
  ],
  users: [
    {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@example.com',
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
      is_active: true
    }
  ],
  customers: [
    {
      id: '00000000-0000-0000-0000-000000000002',
      organization_id: '00000000-0000-0000-0000-000000000000',
      name: 'Cliente de Prueba',
      email: 'cliente@example.com',
      phone: '+1234567890',
      is_active: true
    }
  ],
  suppliers: [
    {
      id: '00000000-0000-0000-0000-000000000003',
      organization_id: '00000000-0000-0000-0000-000000000000',
      name: 'Proveedor de Prueba',
      email: 'proveedor@example.com',
      phone: '+1234567890',
      is_active: true
    }
  ]
}

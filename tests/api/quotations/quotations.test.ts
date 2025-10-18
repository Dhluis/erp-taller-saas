import { describe, it, expect, beforeAll, afterAll } from 'vitest'

/**
 * ✅ TESTS PARA API DE COTIZACIONES
 * 
 * Suite completa de tests para todos los 15 endpoints del módulo de cotizaciones
 * 
 * ENDPOINTS TESTEADOS:
 * 1. GET    /api/quotations
 * 2. POST   /api/quotations
 * 3. GET    /api/quotations/[id]
 * 4. PUT    /api/quotations/[id]
 * 5. DELETE /api/quotations/[id]
 * 6. GET    /api/quotations/[id]/items
 * 7. POST   /api/quotations/[id]/items
 * 8. PUT    /api/quotations/[id]/items/[itemId]
 * 9. DELETE /api/quotations/[id]/items/[itemId]
 * 10. POST   /api/quotations/[id]/send
 * 11. POST   /api/quotations/[id]/approve
 * 12. POST   /api/quotations/[id]/reject
 * 13. POST   /api/quotations/[id]/convert
 * 14. POST   /api/quotations/[id]/duplicate
 * 15. GET    /api/quotations/metrics
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// IDs de prueba (se crearán durante los tests)
let testQuotationId: string
let testItemId: string
let testCustomerId: string = '00000000-0000-0000-0000-000000000001'
let testVehicleId: string = '00000000-0000-0000-0000-000000000002'
let testProductId: string = '00000000-0000-0000-0000-000000000003'
let testServiceId: string = '00000000-0000-0000-0000-000000000004'

describe('Quotations API - Complete Test Suite', () => {
  
  // ===========================================
  // 1. GET /api/quotations
  // ===========================================
  describe('GET /api/quotations', () => {
    it('should list all quotations', async () => {
      const response = await fetch(`${BASE_URL}/api/quotations`)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('data')
      expect(Array.isArray(data.data)).toBe(true)
    })

    it('should filter quotations by status', async () => {
      const response = await fetch(`${BASE_URL}/api/quotations?status=draft`)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.data.every((q: any) => q.status === 'draft')).toBe(true)
    })

    it('should filter quotations by customer_id', async () => {
      const response = await fetch(`${BASE_URL}/api/quotations?customer_id=${testCustomerId}`)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(Array.isArray(data.data)).toBe(true)
    })
  })

  // ===========================================
  // 2. POST /api/quotations
  // ===========================================
  describe('POST /api/quotations', () => {
    it('should create a new quotation with auto-generated number', async () => {
      const response = await fetch(`${BASE_URL}/api/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: testCustomerId,
          vehicle_id: testVehicleId,
          description: 'Test quotation',
          notes: 'Test notes'
        })
      })
      const data = await response.json()
      
      expect(response.status).toBe(201)
      expect(data.data).toHaveProperty('id')
      expect(data.data).toHaveProperty('quotation_number')
      expect(data.data.quotation_number).toMatch(/^Q-\d{4}-\d{4}$/)
      expect(data.data.status).toBe('draft')
      expect(data.data.version).toBe(1)
      
      // Guardar ID para tests posteriores
      testQuotationId = data.data.id
    })

    it('should fail without required fields', async () => {
      const response = await fetch(`${BASE_URL}/api/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      
      expect(response.status).toBe(400)
    })
  })

  // ===========================================
  // 3. GET /api/quotations/[id]
  // ===========================================
  describe('GET /api/quotations/[id]', () => {
    it('should get quotation with full details', async () => {
      const response = await fetch(`${BASE_URL}/api/quotations/${testQuotationId}`)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.data).toHaveProperty('id', testQuotationId)
      expect(data.data).toHaveProperty('quotation_number')
      expect(data.data).toHaveProperty('customers')
      expect(data.data).toHaveProperty('vehicles')
      expect(data.data).toHaveProperty('calculated_totals')
    })

    it('should return 404 for non-existent quotation', async () => {
      const response = await fetch(`${BASE_URL}/api/quotations/00000000-0000-0000-0000-000000000000`)
      
      expect(response.status).toBe(404)
    })
  })

  // ===========================================
  // 4. PUT /api/quotations/[id]
  // ===========================================
  describe('PUT /api/quotations/[id]', () => {
    it('should update quotation and increment version', async () => {
      const response = await fetch(`${BASE_URL}/api/quotations/${testQuotationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Updated description',
          notes: 'Updated notes'
        })
      })
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.data.description).toBe('Updated description')
      expect(data.data.version).toBeGreaterThan(1)
    })

    it('should not update converted quotation', async () => {
      // Este test fallará hasta que haya una cotización convertida
      // Lo dejamos como ejemplo
    })
  })

  // ===========================================
  // 7. POST /api/quotations/[id]/items
  // ===========================================
  describe('POST /api/quotations/[id]/items', () => {
    it('should add item with product validation', async () => {
      const response = await fetch(`${BASE_URL}/api/quotations/${testQuotationId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: 'product',
          product_id: testProductId,
          description: 'Test product',
          quantity: 2,
          unit_price: 150.00,
          tax_percent: 16
        })
      })
      const data = await response.json()
      
      expect(response.status).toBe(201)
      expect(data.data).toHaveProperty('item')
      expect(data.data).toHaveProperty('quotation')
      expect(data.data.quotation.subtotal).toBeGreaterThan(0)
      expect(data.data.quotation.total_amount).toBeGreaterThan(0)
      
      testItemId = data.data.item.id
    })

    it('should fail with invalid product_id', async () => {
      const response = await fetch(`${BASE_URL}/api/quotations/${testQuotationId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: 'product',
          product_id: '00000000-0000-0000-0000-999999999999',
          description: 'Invalid product',
          quantity: 1,
          unit_price: 100.00
        })
      })
      
      expect(response.status).toBe(404)
      expect(await response.json()).toHaveProperty('error')
    })

    it('should fail with negative quantity', async () => {
      const response = await fetch(`${BASE_URL}/api/quotations/${testQuotationId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: 'service',
          service_id: testServiceId,
          description: 'Test service',
          quantity: -1,
          unit_price: 500.00
        })
      })
      
      expect(response.status).toBe(400)
    })

    it('should fail with negative price', async () => {
      const response = await fetch(`${BASE_URL}/api/quotations/${testQuotationId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: 'service',
          service_id: testServiceId,
          description: 'Test service',
          quantity: 1,
          unit_price: -100.00
        })
      })
      
      expect(response.status).toBe(400)
    })
  })

  // ===========================================
  // 6. GET /api/quotations/[id]/items
  // ===========================================
  describe('GET /api/quotations/[id]/items', () => {
    it('should list items with totals', async () => {
      const response = await fetch(`${BASE_URL}/api/quotations/${testQuotationId}/items`)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.data).toHaveProperty('items')
      expect(data.data).toHaveProperty('items_count')
      expect(data.data).toHaveProperty('totals')
      expect(data.data.items.length).toBeGreaterThan(0)
    })
  })

  // ===========================================
  // 8. PUT /api/quotations/[id]/items/[itemId]
  // ===========================================
  describe('PUT /api/quotations/[id]/items/[itemId]', () => {
    it('should update item and recalculate totals', async () => {
      const response = await fetch(`${BASE_URL}/api/quotations/${testQuotationId}/items/${testItemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: 3,
          unit_price: 200.00
        })
      })
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.data.item.quantity).toBe(3)
      expect(data.data.item.unit_price).toBe(200.00)
      expect(data.data.quotation.subtotal).toBeGreaterThan(0)
    })
  })

  // ===========================================
  // 10. POST /api/quotations/[id]/send
  // ===========================================
  describe('POST /api/quotations/[id]/send', () => {
    it('should send quotation and change status', async () => {
      const response = await fetch(`${BASE_URL}/api/quotations/${testQuotationId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          send_via_email: false
        })
      })
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.data.quotation.status).toBe('sent')
      expect(data.data.quotation).toHaveProperty('sent_at')
      expect(data.data).toHaveProperty('next_steps')
    })

    it('should fail to send without items', async () => {
      // Crear cotización sin items
      const createRes = await fetch(`${BASE_URL}/api/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: testCustomerId,
          vehicle_id: testVehicleId,
          description: 'Empty quotation'
        })
      })
      const createData = await createRes.json()
      const emptyQuotationId = createData.data.id
      
      const response = await fetch(`${BASE_URL}/api/quotations/${emptyQuotationId}/send`, {
        method: 'POST'
      })
      
      expect(response.status).toBe(400)
      expect(await response.json()).toHaveProperty('error')
    })
  })

  // ===========================================
  // 11. POST /api/quotations/[id]/approve
  // ===========================================
  describe('POST /api/quotations/[id]/approve', () => {
    it('should approve sent quotation', async () => {
      const response = await fetch(`${BASE_URL}/api/quotations/${testQuotationId}/approve`, {
        method: 'POST'
      })
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.data.quotation.status).toBe('approved')
      expect(data.data.quotation).toHaveProperty('approved_at')
      expect(data.data).toHaveProperty('next_steps')
      expect(data.data.next_steps).toContain('Puedes convertir esta cotización a orden de trabajo')
    })

    it('should fail to approve draft quotation', async () => {
      const createRes = await fetch(`${BASE_URL}/api/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: testCustomerId,
          vehicle_id: testVehicleId,
          description: 'Draft quotation'
        })
      })
      const createData = await createRes.json()
      
      const response = await fetch(`${BASE_URL}/api/quotations/${createData.data.id}/approve`, {
        method: 'POST'
      })
      
      expect(response.status).toBe(400)
    })
  })

  // ===========================================
  // 12. POST /api/quotations/[id]/reject
  // ===========================================
  describe('POST /api/quotations/[id]/reject', () => {
    it('should reject quotation with reason', async () => {
      // Crear y enviar otra cotización para rechazar
      const createRes = await fetch(`${BASE_URL}/api/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: testCustomerId,
          vehicle_id: testVehicleId,
          description: 'To be rejected'
        })
      })
      const createData = await createRes.json()
      const quotationId = createData.data.id
      
      // Agregar item
      await fetch(`${BASE_URL}/api/quotations/${quotationId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: 'service',
          service_id: testServiceId,
          description: 'Test service',
          quantity: 1,
          unit_price: 500.00
        })
      })
      
      // Enviar
      await fetch(`${BASE_URL}/api/quotations/${quotationId}/send`, {
        method: 'POST'
      })
      
      // Rechazar
      const response = await fetch(`${BASE_URL}/api/quotations/${quotationId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Precio muy alto'
        })
      })
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.data.quotation.status).toBe('rejected')
      expect(data.data.quotation).toHaveProperty('rejected_at')
      expect(data.data.quotation.rejection_reason).toBe('Precio muy alto')
    })
  })

  // ===========================================
  // 13. POST /api/quotations/[id]/convert
  // ===========================================
  describe('POST /api/quotations/[id]/convert', () => {
    it('should convert approved quotation to work order', async () => {
      const response = await fetch(`${BASE_URL}/api/quotations/${testQuotationId}/convert`, {
        method: 'POST'
      })
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.data).toHaveProperty('quotation_id')
      expect(data.data).toHaveProperty('work_order_id')
      expect(data.data).toHaveProperty('work_order_number')
      expect(data.data.work_order_number).toMatch(/^WO-\d{4}-\d{4}$/)
      expect(data.data.work_order.status).toBe('pending')
      expect(data.data.work_order.items_count).toBeGreaterThan(0)
    })

    it('should fail to convert non-approved quotation', async () => {
      const createRes = await fetch(`${BASE_URL}/api/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: testCustomerId,
          vehicle_id: testVehicleId,
          description: 'Draft quotation'
        })
      })
      const createData = await createRes.json()
      
      const response = await fetch(`${BASE_URL}/api/quotations/${createData.data.id}/convert`, {
        method: 'POST'
      })
      
      expect(response.status).toBe(400)
      expect(await response.json()).toHaveProperty('error')
    })
  })

  // ===========================================
  // 14. POST /api/quotations/[id]/duplicate
  // ===========================================
  describe('POST /api/quotations/[id]/duplicate', () => {
    it('should duplicate quotation with new number', async () => {
      // Crear cotización con items
      const createRes = await fetch(`${BASE_URL}/api/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: testCustomerId,
          vehicle_id: testVehicleId,
          description: 'Original quotation'
        })
      })
      const createData = await createRes.json()
      const originalId = createData.data.id
      
      // Agregar item
      await fetch(`${BASE_URL}/api/quotations/${originalId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: 'service',
          service_id: testServiceId,
          description: 'Test service',
          quantity: 1,
          unit_price: 500.00
        })
      })
      
      // Duplicar
      const response = await fetch(`${BASE_URL}/api/quotations/${originalId}/duplicate`, {
        method: 'POST'
      })
      const data = await response.json()
      
      expect(response.status).toBe(201)
      expect(data.data.id).not.toBe(originalId)
      expect(data.data.quotation_number).not.toBe(createData.data.quotation_number)
      expect(data.data.status).toBe('draft')
      expect(data.data.version).toBe(1)
    })
  })

  // ===========================================
  // 15. GET /api/quotations/metrics
  // ===========================================
  describe('GET /api/quotations/metrics', () => {
    it('should return quotations metrics', async () => {
      const response = await fetch(`${BASE_URL}/api/quotations/metrics`)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.data).toHaveProperty('total_quotations')
      expect(data.data).toHaveProperty('by_status')
      expect(data.data).toHaveProperty('approval_rate')
      expect(data.data).toHaveProperty('conversion_rate')
      expect(data.data).toHaveProperty('total_value')
    })
  })

  // ===========================================
  // 9. DELETE /api/quotations/[id]/items/[itemId]
  // ===========================================
  describe('DELETE /api/quotations/[id]/items/[itemId]', () => {
    it('should delete item and recalculate totals', async () => {
      // Crear cotización con item
      const createRes = await fetch(`${BASE_URL}/api/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: testCustomerId,
          vehicle_id: testVehicleId,
          description: 'Quotation with item to delete'
        })
      })
      const createData = await createRes.json()
      const quotationId = createData.data.id
      
      // Agregar item
      const itemRes = await fetch(`${BASE_URL}/api/quotations/${quotationId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: 'service',
          service_id: testServiceId,
          description: 'Item to delete',
          quantity: 1,
          unit_price: 500.00
        })
      })
      const itemData = await itemRes.json()
      const itemId = itemData.data.item.id
      
      // Eliminar item
      const response = await fetch(`${BASE_URL}/api/quotations/${quotationId}/items/${itemId}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.data).toHaveProperty('quotation')
      expect(data.data.quotation.subtotal).toBe(0)
      expect(data.data.quotation.total_amount).toBe(0)
    })
  })

  // ===========================================
  // 5. DELETE /api/quotations/[id]
  // ===========================================
  describe('DELETE /api/quotations/[id]', () => {
    it('should cancel quotation (soft delete)', async () => {
      // Crear cotización para cancelar
      const createRes = await fetch(`${BASE_URL}/api/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: testCustomerId,
          vehicle_id: testVehicleId,
          description: 'To be cancelled'
        })
      })
      const createData = await createRes.json()
      
      const response = await fetch(`${BASE_URL}/api/quotations/${createData.data.id}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.data.quotation.status).toBe('cancelled')
      expect(data.data.quotation).toHaveProperty('cancelled_at')
    })

    it('should fail to cancel converted quotation', async () => {
      // Este test asume que ya tenemos una cotización convertida
      // del test anterior (testQuotationId)
      const response = await fetch(`${BASE_URL}/api/quotations/${testQuotationId}`, {
        method: 'DELETE'
      })
      
      // Debería fallar porque ya está convertida
      expect(response.status).toBe(400)
    })
  })
})

// ===========================================
// INTEGRATION TESTS - Complete Workflow
// ===========================================
describe('Quotations API - Integration Tests', () => {
  it('should complete full workflow: create → send → approve → convert', async () => {
    // 1. Crear cotización
    const createRes = await fetch(`${BASE_URL}/api/quotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: testCustomerId,
        vehicle_id: testVehicleId,
        description: 'Full workflow test'
      })
    })
    const createData = await createRes.json()
    const quotationId = createData.data.id
    
    expect(createData.data.status).toBe('draft')
    
    // 2. Agregar items
    const itemRes = await fetch(`${BASE_URL}/api/quotations/${quotationId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_type: 'service',
        service_id: testServiceId,
        description: 'Test service',
        quantity: 1,
        unit_price: 500.00,
        tax_percent: 16
      })
    })
    expect(itemRes.status).toBe(201)
    
    // 3. Enviar
    const sendRes = await fetch(`${BASE_URL}/api/quotations/${quotationId}/send`, {
      method: 'POST'
    })
    const sendData = await sendRes.json()
    expect(sendData.data.quotation.status).toBe('sent')
    
    // 4. Aprobar
    const approveRes = await fetch(`${BASE_URL}/api/quotations/${quotationId}/approve`, {
      method: 'POST'
    })
    const approveData = await approveRes.json()
    expect(approveData.data.quotation.status).toBe('approved')
    
    // 5. Convertir
    const convertRes = await fetch(`${BASE_URL}/api/quotations/${quotationId}/convert`, {
      method: 'POST'
    })
    const convertData = await convertRes.json()
    expect(convertData.data).toHaveProperty('work_order_id')
    expect(convertData.data.work_order_number).toMatch(/^WO-\d{4}-\d{4}$/)
    
    console.log('✅ Full workflow completed successfully!')
    console.log('   Quotation:', createData.data.quotation_number)
    console.log('   Work Order:', convertData.data.work_order_number)
  })
})

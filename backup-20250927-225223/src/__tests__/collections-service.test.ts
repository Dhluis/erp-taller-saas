/**
 * Tests de Integración para CollectionsService
 */

import { CollectionsService } from '@/lib/services/collections-service'
import { mockSupabaseClient, mockCollections, setupTest, teardownTest } from '@/lib/testing/test-utils'

// Mock de Supabase
jest.mock('@/lib/core/supabase', () => ({
  getBrowserClient: () => mockSupabaseClient,
  getServerClient: () => mockSupabaseClient
}))

describe('CollectionsService', () => {
  let service: CollectionsService

  beforeEach(() => {
    setupTest()
    service = new CollectionsService()
  })

  afterEach(() => {
    teardownTest()
  })

  describe('getAll', () => {
    it('debería obtener todas las collections', async () => {
      // Mock de respuesta exitosa
      mockSupabaseClient.from().select().order().range.mockReturnValue({
        data: mockCollections,
        error: null
      })

      const result = await service.getAll()

      expect(result).toEqual(mockCollections)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('collections')
    })

    it('debería manejar errores correctamente', async () => {
      // Mock de error
      mockSupabaseClient.from().select().order().range.mockReturnValue({
        data: null,
        error: { message: 'Database error', code: 'PGRST001' }
      })

      await expect(service.getAll()).rejects.toThrow()
    })
  })

  describe('getById', () => {
    it('debería obtener collection por ID', async () => {
      const collection = mockCollections[0]
      
      mockSupabaseClient.from().select().eq().single.mockReturnValue({
        data: collection,
        error: null
      })

      const result = await service.getById('1')

      expect(result).toEqual(collection)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('collections')
    })

    it('debería retornar null si no encuentra la collection', async () => {
      mockSupabaseClient.from().select().eq().single.mockReturnValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      const result = await service.getById('999')

      expect(result).toBeNull()
    })

    it('debería validar que el ID es requerido', async () => {
      await expect(service.getById('')).rejects.toThrow('ID es requerido')
    })
  })

  describe('create', () => {
    it('debería crear una nueva collection', async () => {
      const newCollection = {
        organization_id: '00000000-0000-0000-0000-000000000000',
        client_id: 'C003',
        invoice_id: 'F003',
        amount: 3200.00,
        collection_date: '2024-01-17',
        payment_method: 'card' as const,
        status: 'pending' as const
      }

      const createdCollection = {
        id: '3',
        ...newCollection,
        created_at: '2024-01-17T10:00:00Z',
        updated_at: '2024-01-17T10:00:00Z'
      }

      mockSupabaseClient.from().insert().select().single.mockReturnValue({
        data: createdCollection,
        error: null
      })

      const result = await service.create(newCollection)

      expect(result).toEqual(createdCollection)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('collections')
    })

    it('debería validar datos requeridos', async () => {
      const invalidData = {
        organization_id: '00000000-0000-0000-0000-000000000000',
        client_id: '', // Inválido
        invoice_id: 'F003',
        amount: 3200.00,
        collection_date: '2024-01-17',
        payment_method: 'card' as const
      }

      await expect(service.create(invalidData)).rejects.toThrow()
    })
  })

  describe('update', () => {
    it('debería actualizar una collection existente', async () => {
      const updateData = {
        status: 'completed' as const,
        payment_method: 'transfer' as const
      }

      const updatedCollection = {
        ...mockCollections[0],
        ...updateData,
        updated_at: '2024-01-17T10:00:00Z'
      }

      mockSupabaseClient.from().update().eq().select().single.mockReturnValue({
        data: updatedCollection,
        error: null
      })

      const result = await service.update('1', updateData)

      expect(result).toEqual(updatedCollection)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('collections')
    })

    it('debería validar que el ID es requerido', async () => {
      await expect(service.update('', { status: 'completed' })).rejects.toThrow('ID es requerido')
    })
  })

  describe('delete', () => {
    it('debería eliminar una collection', async () => {
      mockSupabaseClient.from().delete().eq.mockReturnValue({
        data: null,
        error: null
      })

      const result = await service.delete('1')

      expect(result).toBe(true)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('collections')
    })

    it('debería validar que el ID es requerido', async () => {
      await expect(service.delete('')).rejects.toThrow('ID es requerido')
    })
  })

  describe('getStats', () => {
    it('debería obtener estadísticas de collections', async () => {
      mockSupabaseClient.from().select.mockReturnValue({
        data: mockCollections,
        error: null
      })

      const result = await service.getStats()

      expect(result).toHaveProperty('total_collections')
      expect(result).toHaveProperty('completed_collections')
      expect(result).toHaveProperty('pending_collections')
      expect(result).toHaveProperty('overdue_collections')
      expect(result).toHaveProperty('total_amount_collected')
      expect(result).toHaveProperty('collection_rate')
    })

    it('debería manejar caso sin datos', async () => {
      mockSupabaseClient.from().select.mockReturnValue({
        data: [],
        error: null
      })

      const result = await service.getStats()

      expect(result.total_collections).toBe(0)
      expect(result.completed_collections).toBe(0)
      expect(result.collection_rate).toBe(0)
    })
  })

  describe('getByClient', () => {
    it('debería obtener collections por cliente', async () => {
      const clientCollections = mockCollections.filter(c => c.client_id === 'C001')

      mockSupabaseClient.from().select().order().range.mockReturnValue({
        data: clientCollections,
        error: null
      })

      const result = await service.getByClient('C001')

      expect(result).toEqual(clientCollections)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('collections')
    })
  })

  describe('getByStatus', () => {
    it('debería obtener collections por estado', async () => {
      const pendingCollections = mockCollections.filter(c => c.status === 'pending')

      mockSupabaseClient.from().select().order().range.mockReturnValue({
        data: pendingCollections,
        error: null
      })

      const result = await service.getByStatus('pending')

      expect(result).toEqual(pendingCollections)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('collections')
    })
  })

  describe('markAsCompleted', () => {
    it('debería marcar collection como completada', async () => {
      const updatedCollection = {
        ...mockCollections[0],
        status: 'completed',
        payment_method: 'transfer',
        reference: 'REF-001'
      }

      mockSupabaseClient.from().update().eq().select().single.mockReturnValue({
        data: updatedCollection,
        error: null
      })

      const result = await service.markAsCompleted('1', 'transfer', 'REF-001')

      expect(result.status).toBe('completed')
      expect(result.payment_method).toBe('transfer')
      expect(result.reference).toBe('REF-001')
    })
  })

  describe('markAsOverdue', () => {
    it('debería marcar collection como vencida', async () => {
      const updatedCollection = {
        ...mockCollections[0],
        status: 'overdue'
      }

      mockSupabaseClient.from().update().eq().select().single.mockReturnValue({
        data: updatedCollection,
        error: null
      })

      const result = await service.markAsOverdue('1')

      expect(result.status).toBe('overdue')
    })
  })

  describe('getByDateRange', () => {
    it('debería obtener collections por rango de fechas', async () => {
      mockSupabaseClient.from().select().gte().lte().order.mockReturnValue({
        data: mockCollections,
        error: null
      })

      const result = await service.getByDateRange('2024-01-01', '2024-01-31')

      expect(result).toEqual(mockCollections)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('collections')
    })
  })

  describe('getByPaymentMethod', () => {
    it('debería obtener collections por método de pago', async () => {
      const transferCollections = mockCollections.filter(c => c.payment_method === 'transfer')

      mockSupabaseClient.from().select().order().range.mockReturnValue({
        data: transferCollections,
        error: null
      })

      const result = await service.getByPaymentMethod('transfer')

      expect(result).toEqual(transferCollections)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('collections')
    })
  })
})

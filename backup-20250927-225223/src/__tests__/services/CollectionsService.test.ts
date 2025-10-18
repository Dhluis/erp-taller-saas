/**
 * Tests de Servicio CollectionsService
 */

import { CollectionsService } from '@/lib/services/CollectionsService'
import { mockData, testUtils } from '@/lib/testing/test-utils'

// Mock de Supabase
jest.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({ data: null, error: null })),
          order: jest.fn(() => ({ data: [], error: null }))
        })),
        order: jest.fn(() => ({ data: [], error: null })),
        range: jest.fn(() => ({ data: [], error: null, count: 0 }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({ data: null, error: null }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({ data: null, error: null }))
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({ error: null }))
      }))
    }))
  }))
}))

describe('CollectionsService', () => {
  let service: CollectionsService
  let mockSupabase: any

  beforeEach(() => {
    service = new CollectionsService()
    mockSupabase = require('@/lib/supabase/client').getSupabaseClient()
    testUtils.clearMocks()
  })

  describe('getAll', () => {
    it('debe obtener todas las colecciones', async () => {
      const mockCollections = mockData.collections
      mockSupabase().from().select().order.mockReturnValue({
        data: mockCollections,
        error: null
      })

      const result = await service.getAll()

      expect(result).toEqual(mockCollections)
      expect(mockSupabase().from).toHaveBeenCalledWith('collections')
    })

    it('debe manejar errores correctamente', async () => {
      mockSupabase().from().select().order.mockReturnValue({
        data: null,
        error: { message: 'Error de conexión' }
      })

      await expect(service.getAll()).rejects.toThrow()
    })
  })

  describe('getById', () => {
    it('debe obtener una colección por ID', async () => {
      const mockCollection = mockData.collections[0]
      mockSupabase().from().select().eq().single.mockReturnValue({
        data: mockCollection,
        error: null
      })

      const result = await service.getById('1')

      expect(result).toEqual(mockCollection)
    })

    it('debe retornar null cuando no se encuentra la colección', async () => {
      mockSupabase().from().select().eq().single.mockReturnValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      const result = await service.getById('999')

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('debe crear una nueva colección', async () => {
      const newCollection = {
        client_id: 'C001',
        invoice_id: 'F001',
        amount: 1000,
        collection_date: '2024-01-01',
        payment_method: 'transfer' as const,
        status: 'pending' as const
      }

      const createdCollection = {
        id: '1',
        ...newCollection,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        organization_id: '00000000-0000-0000-0000-000000000000'
      }

      mockSupabase().from().insert().select().single.mockReturnValue({
        data: createdCollection,
        error: null
      })

      const result = await service.create(newCollection)

      expect(result).toEqual(createdCollection)
      expect(mockSupabase().from().insert).toHaveBeenCalledWith([
        expect.objectContaining({
          ...newCollection,
          organization_id: '00000000-0000-0000-0000-000000000000'
        })
      ])
    })

    it('debe validar datos antes de crear', async () => {
      const invalidData = {
        client_id: '',
        invoice_id: '',
        amount: -100,
        collection_date: 'invalid-date',
        payment_method: 'invalid' as any
      }

      await expect(service.create(invalidData)).rejects.toThrow()
    })
  })

  describe('update', () => {
    it('debe actualizar una colección existente', async () => {
      const updateData = {
        amount: 1500,
        status: 'completed' as const
      }

      const updatedCollection = {
        id: '1',
        ...mockData.collections[0],
        ...updateData,
        updated_at: expect.any(String)
      }

      mockSupabase().from().update().eq().select().single.mockReturnValue({
        data: updatedCollection,
        error: null
      })

      const result = await service.update('1', updateData)

      expect(result).toEqual(updatedCollection)
      expect(mockSupabase().from().update).toHaveBeenCalledWith(
        expect.objectContaining(updateData)
      )
    })

    it('debe lanzar error cuando no se encuentra la colección', async () => {
      mockSupabase().from().update().eq().select().single.mockReturnValue({
        data: null,
        error: null
      })

      await expect(service.update('999', { amount: 1000 })).rejects.toThrow()
    })
  })

  describe('delete', () => {
    it('debe eliminar una colección', async () => {
      mockSupabase().from().delete().eq.mockReturnValue({
        error: null
      })

      await service.delete('1')

      expect(mockSupabase().from().delete).toHaveBeenCalledWith()
      expect(mockSupabase().from().delete().eq).toHaveBeenCalledWith('id', '1')
    })

    it('debe manejar errores al eliminar', async () => {
      mockSupabase().from().delete().eq.mockReturnValue({
        error: { message: 'Error al eliminar' }
      })

      await expect(service.delete('1')).rejects.toThrow()
    })
  })

  describe('getStats', () => {
    it('debe obtener estadísticas de colecciones', async () => {
      const mockStatsData = [
        { status: 'completed', amount: 1000 },
        { status: 'completed', amount: 2000 },
        { status: 'pending', amount: 500 },
        { status: 'overdue', amount: 300 }
      ]

      mockSupabase().from().select.mockReturnValue({
        data: mockStatsData,
        error: null
      })

      const result = await service.getStats()

      expect(result).toEqual({
        total_collections: 4,
        completed_collections: 2,
        pending_collections: 1,
        overdue_collections: 1,
        total_amount_collected: 3000,
        total_amount_pending: 500,
        total_amount_overdue: 300,
        average_collection_amount: 750,
        collection_rate: 50
      })
    })
  })

  describe('getByClient', () => {
    it('debe obtener colecciones por cliente', async () => {
      const mockCollections = mockData.collections
      mockSupabase().from().select().eq().order.mockReturnValue({
        data: mockCollections,
        error: null
      })

      const result = await service.getByClient('C001')

      expect(result).toEqual(mockCollections)
      expect(mockSupabase().from().select).toHaveBeenCalledWith('*')
      expect(mockSupabase().from().select().eq).toHaveBeenCalledWith('client_id', 'C001')
    })
  })

  describe('getPending', () => {
    it('debe obtener colecciones pendientes', async () => {
      const mockPendingCollections = [
        { ...mockData.collections[0], status: 'pending' }
      ]

      mockSupabase().from().select().eq().order.mockReturnValue({
        data: mockPendingCollections,
        error: null
      })

      const result = await service.getPending()

      expect(result).toEqual(mockPendingCollections)
      expect(mockSupabase().from().select().eq).toHaveBeenCalledWith('status', 'pending')
    })
  })

  describe('getOverdue', () => {
    it('debe obtener colecciones vencidas', async () => {
      const mockOverdueCollections = [
        { ...mockData.collections[0], status: 'pending', collection_date: '2023-12-01' }
      ]

      mockSupabase().from().select().eq().lt().order.mockReturnValue({
        data: mockOverdueCollections,
        error: null
      })

      const result = await service.getOverdue()

      expect(result).toEqual(mockOverdueCollections)
      expect(mockSupabase().from().select().eq).toHaveBeenCalledWith('status', 'pending')
    })
  })

  describe('markAsCompleted', () => {
    it('debe marcar una colección como completada', async () => {
      const completedCollection = {
        ...mockData.collections[0],
        status: 'completed',
        updated_at: expect.any(String)
      }

      mockSupabase().from().update().eq().select().single.mockReturnValue({
        data: completedCollection,
        error: null
      })

      const result = await service.markAsCompleted('1')

      expect(result).toEqual(completedCollection)
      expect(mockSupabase().from().update).toHaveBeenCalledWith({
        status: 'completed',
        updated_at: expect.any(String)
      })
    })
  })

  describe('markAsOverdue', () => {
    it('debe marcar una colección como vencida', async () => {
      const overdueCollection = {
        ...mockData.collections[0],
        status: 'overdue',
        updated_at: expect.any(String)
      }

      mockSupabase().from().update().eq().select().single.mockReturnValue({
        data: overdueCollection,
        error: null
      })

      const result = await service.markAsOverdue('1')

      expect(result).toEqual(overdueCollection)
      expect(mockSupabase().from().update).toHaveBeenCalledWith({
        status: 'overdue',
        updated_at: expect.any(String)
      })
    })
  })

  describe('getTotalByPeriod', () => {
    it('debe obtener total de colecciones por período', async () => {
      const mockCollections = [
        { amount: 1000 },
        { amount: 2000 },
        { amount: 500 }
      ]

      mockSupabase().from().select().eq().gte().lte.mockReturnValue({
        data: mockCollections,
        error: null
      })

      const result = await service.getTotalByPeriod('2024-01-01', '2024-01-31')

      expect(result).toBe(3500)
    })
  })

  describe('getTotalByClient', () => {
    it('debe obtener total de colecciones por cliente', async () => {
      const mockCollections = [
        { amount: 1000 },
        { amount: 2000 }
      ]

      mockSupabase().from().select().eq().eq.mockReturnValue({
        data: mockCollections,
        error: null
      })

      const result = await service.getTotalByClient('C001')

      expect(result).toBe(3000)
    })
  })
})

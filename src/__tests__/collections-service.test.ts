/**
 * Tests para CollectionsService
 * Verificación de funcionalidad del servicio de cobros
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CollectionsService } from '../lib/services/collections-service'
import type { Collection, CreateCollection, UpdateCollection } from '../lib/services/collections-service'

// Mock del cliente Supabase
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      order: vi.fn(() => Promise.resolve({ data: [], error: null }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null }))
    }))
  }))
}

// Mock del servicio
vi.mock('../../lib/core/supabase', () => ({
  getBrowserClient: vi.fn(() => mockSupabaseClient)
}))

describe('CollectionsService', () => {
  let service: CollectionsService

  beforeEach(() => {
    service = new CollectionsService()
    vi.clearAllMocks()
  })

  describe('getCollections', () => {
    it('should fetch collections successfully', async () => {
      const mockCollections: Collection[] = [
        {
          id: '1',
          customer_id: 'customer-1',
          amount: 100,
          currency: 'USD',
          status: 'pending',
          due_date: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

      mockSupabaseClient.from().select().order.mockResolvedValue({
        data: mockCollections,
        error: null
      })

      const result = await service.getCollections()

      expect(result).toEqual(mockCollections)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('collections')
    })

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error')
      mockSupabaseClient.from().select().order.mockRejectedValue(error)

      await expect(service.getCollections()).rejects.toThrow()
    })
  })

  describe('getCollectionStats', () => {
    it('should calculate stats correctly', async () => {
      const mockData = [
        { status: 'pending', amount: 100, due_date: '2024-01-01', paid_date: null },
        { status: 'paid', amount: 200, due_date: '2024-01-01', paid_date: '2024-01-01' },
        { status: 'overdue', amount: 150, due_date: '2023-12-01', paid_date: null }
      ]

      mockSupabaseClient.from().select.mockResolvedValue({
        data: mockData,
        error: null
      })

      const result = await service.getCollectionStats()

      expect(result.total).toBe(3)
      expect(result.pending).toBe(1)
      expect(result.paid).toBe(1)
      expect(result.overdue).toBe(1)
      expect(result.totalAmount).toBe(450)
    })

    it('should handle empty data', async () => {
      mockSupabaseClient.from().select.mockResolvedValue({
        data: [],
        error: null
      })

      const result = await service.getCollectionStats()

      expect(result.total).toBe(0)
      expect(result.totalAmount).toBe(0)
    })
  })

  describe('createCollection', () => {
    it('should create collection successfully', async () => {
      const newCollection: CreateCollection = {
        customer_id: 'customer-1',
        amount: 100,
        currency: 'USD',
        status: 'pending',
        due_date: '2024-01-01T00:00:00Z'
      }

      const createdCollection: Collection = {
        id: '1',
        ...newCollection,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: createdCollection,
        error: null
      })

      const result = await service.createCollection(newCollection)

      expect(result).toEqual(createdCollection)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('collections')
    })

    it('should validate data before creating', async () => {
      const invalidCollection = {
        customer_id: 'customer-1',
        amount: -100, // Invalid negative amount
        currency: 'USD',
        status: 'pending',
        due_date: '2024-01-01T00:00:00Z'
      }

      await expect(service.createCollection(invalidCollection)).rejects.toThrow()
    })
  })

  describe('updateCollection', () => {
    it('should update collection successfully', async () => {
      const updateData: UpdateCollection = {
        status: 'paid',
        paid_date: '2024-01-01T00:00:00Z'
      }

      const updatedCollection: Collection = {
        id: '1',
        customer_id: 'customer-1',
        amount: 100,
        currency: 'USD',
        status: 'paid',
        due_date: '2024-01-01T00:00:00Z',
        paid_date: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: updatedCollection,
        error: null
      })

      const result = await service.updateCollection('1', updateData)

      expect(result).toEqual(updatedCollection)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('collections')
    })
  })

  describe('markAsPaid', () => {
    it('should mark collection as paid', async () => {
      const updatedCollection: Collection = {
        id: '1',
        customer_id: 'customer-1',
        amount: 100,
        currency: 'USD',
        status: 'paid',
        due_date: '2024-01-01T00:00:00Z',
        paid_date: '2024-01-01T00:00:00Z',
        payment_method: 'credit_card',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: updatedCollection,
        error: null
      })

      const result = await service.markAsPaid('1', 'credit_card')

      expect(result.status).toBe('paid')
      expect(result.paid_date).toBeDefined()
      expect(result.payment_method).toBe('credit_card')
    })
  })

  describe('searchCollections', () => {
    it('should search collections by reference or notes', async () => {
      const mockCollections: Collection[] = [
        {
          id: '1',
          customer_id: 'customer-1',
          amount: 100,
          currency: 'USD',
          status: 'pending',
          due_date: '2024-01-01T00:00:00Z',
          reference: 'REF-001',
          notes: 'Test collection',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

      mockSupabaseClient.from().select().or().order.mockResolvedValue({
        data: mockCollections,
        error: null
      })

      const result = await service.searchCollections('REF-001')

      expect(result).toEqual(mockCollections)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('collections')
    })
  })

  describe('getOverdueCollections', () => {
    it('should fetch overdue collections', async () => {
      const mockCollections: Collection[] = [
        {
          id: '1',
          customer_id: 'customer-1',
          amount: 100,
          currency: 'USD',
          status: 'pending',
          due_date: '2023-12-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

      mockSupabaseClient.from().select().eq().lt().order.mockResolvedValue({
        data: mockCollections,
        error: null
      })

      const result = await service.getOverdueCollections()

      expect(result).toEqual(mockCollections)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('collections')
    })
  })
})
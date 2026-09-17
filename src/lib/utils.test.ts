import { describe, it, expect } from 'vitest'
import { formatFileSize } from './utils'

describe('formatFileSize', () => {
  it('returns 0 Bytes for zero', () => {
    expect(formatFileSize(0)).toBe('0 Bytes')
  })

  it('formats bytes below 1 KB', () => {
    expect(formatFileSize(500)).toBe('500 Bytes')
  })

  it('formats kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })

  it('formats megabytes', () => {
    expect(formatFileSize(1048576)).toBe('1 MB')
  })

  it('formats gigabytes', () => {
    expect(formatFileSize(1073741824)).toBe('1 GB')
  })

  it('rounds to two decimal places', () => {
    expect(formatFileSize(1234567)).toBe('1.18 MB')
  })
})

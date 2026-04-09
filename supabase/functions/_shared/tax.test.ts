
import { describe, it, expect } from 'vitest'
import { calculateTax, getTaxRate } from './tax'

describe('Tax Utility', () => {
  it('should return correct tax rate for Slovakia (SK)', () => {
    expect(getTaxRate('SK')).toBe(0.20)
  })

  it('should return correct tax rate for Czechia (CZ)', () => {
    expect(getTaxRate('CZ')).toBe(0.21)
  })

  it('should return default tax rate for unknown countries', () => {
    expect(getTaxRate('Unknown')).toBe(0.20)
  })

  it('should calculate tax correctly for SK', () => {
    const amount = 1000 // 10.00 EUR in cents
    const result = calculateTax(amount, 'SK')
    
    expect(result.subtotal).toBe(1000)
    expect(result.tax).toBe(200)
    expect(result.total).toBe(1200)
    expect(result.rate).toBe(20)
  })

  it('should round tax amounts correctly', () => {
    const amount = 999 // 9.99 EUR
    const result = calculateTax(amount, 'SK')
    
    // 999 * 0.20 = 199.8 -> rounded to 200
    expect(result.tax).toBe(200)
    expect(result.total).toBe(1199)
  })
})

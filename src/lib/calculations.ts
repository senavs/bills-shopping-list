import type { List } from '../types'

export interface Totals {
  totalAll: number
  totalSelected: number
  totalAllWithTax: number
  totalSelectedWithTax: number
}

export const calcTotals = (list: List): Totals => {
  let totalAll = 0
  let totalSelected = 0
  let taxBaseAll = 0
  let taxBaseSelected = 0

  for (const item of list.items) {
    const itemTotal = item.quantity * item.unitPrice
    totalAll += itemTotal
    
    if (item.selected) {
      totalSelected += itemTotal
      if (item.includeInTax) {
        taxBaseSelected += itemTotal
      }
    }
    
    if (item.includeInTax) {
      taxBaseAll += itemTotal
    }
  }

  const taxAmount = taxBaseAll * (list.taxPercentage / 100)
  const taxAmountSelected = taxBaseSelected * (list.taxPercentage / 100)

  return {
    totalAll,
    totalSelected,
    totalAllWithTax: totalAll + taxAmount,
    totalSelectedWithTax: totalSelected + taxAmountSelected,
  }
}

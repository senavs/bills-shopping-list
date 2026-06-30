import type { List } from '../types'

export interface Totals {
  totalAll: number
  totalSelected: number
  totalAllWithTax: number
  totalSelectedWithTax: number
}

export interface PersonSplitItem {
  name: string
  amount: number
  shared: boolean
}

export interface PersonSplit {
  personId: string
  personName: string
  subtotal: number
  taxAmount: number
  total: number
  items: PersonSplitItem[]
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

export const calcSplit = (list: List): PersonSplit[] => {
  const people = list.people || []
  if (people.length === 0) return []

  const totalPeople = people.length

  // Initialize per-person accumulators
  const splits: Record<string, { subtotal: number; taxableBase: number; items: PersonSplitItem[] }> = {}
  for (const person of people) {
    splits[person.id] = { subtotal: 0, taxableBase: 0, items: [] }
  }

  for (const item of list.items) {
    const itemCost = item.quantity * item.unitPrice
    const assignedTo = item.assignedTo || []

    if (assignedTo.length === 0) {
      // Shared by all people
      const share = itemCost / totalPeople
      for (const person of people) {
        splits[person.id].subtotal += share
        splits[person.id].items.push({ name: item.name, amount: share, shared: true })
        if (item.includeInTax) {
          splits[person.id].taxableBase += share
        }
      }
    } else {
      // Split among assigned people
      const share = itemCost / assignedTo.length
      for (const personId of assignedTo) {
        if (splits[personId]) {
          splits[personId].subtotal += share
          splits[personId].items.push({ name: item.name, amount: share, shared: assignedTo.length > 1 })
          if (item.includeInTax) {
            splits[personId].taxableBase += share
          }
        }
      }
    }
  }

  // Calculate tax for each person
  const taxRate = list.taxPercentage / 100

  return people.map(person => {
    const split = splits[person.id]
    const taxAmount = split.taxableBase * taxRate
    return {
      personId: person.id,
      personName: person.name,
      subtotal: split.subtotal,
      taxAmount,
      total: split.subtotal + taxAmount,
      items: split.items,
    }
  })
}

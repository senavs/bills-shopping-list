import { describe, it, expect } from 'vitest'
import { getPresetTemplates } from './presetTemplates'
import { en } from '../i18n/en'
import { ptBR } from '../i18n/ptBR'

describe('getPresetTemplates', () => {
  it('provides Compras do Mês in Portuguese with BRL and no tax', () => {
    const [monthly] = getPresetTemplates(ptBR, true)
    expect(monthly).toMatchObject({
      name: 'Compras do Mês',
      type: 'shopping',
      currency: 'BRL',
      taxPercentage: 0,
      isTemplate: true,
      archived: false,
      items: [],
    })
    expect(monthly.sections.map(s => s.name)).toEqual(
      ['Geladeira', 'Despensa Comida', 'Lavanderia', 'Banheiro', 'Quarto', 'Outros'],
    )
  })

  it('translates names and uses USD in English', () => {
    const [monthly] = getPresetTemplates(en, false)
    expect(monthly.name).toBe('Monthly Groceries')
    expect(monthly.currency).toBe('USD')
    expect(monthly.sections.map(s => s.name)).toEqual(
      ['Fridge', 'Pantry', 'Laundry', 'Bathroom', 'Bedroom', 'Other'],
    )
  })

  it('includes every built-in template, with tax only on restaurant and bar', () => {
    const presets = getPresetTemplates(ptBR, true)
    expect(presets.map(p => p.name)).toEqual([
      'Compras do Mês', 'Feira / Hortifrúti', 'Churrasco', 'Farmácia', 'Festa / Aniversário',
      'Restaurante com Amigos', 'Bar / Happy Hour', 'Material Escolar', 'Mudança / Casa Nova',
    ])
    expect(presets.filter(p => p.taxPercentage > 0).map(p => p.type)).toEqual(['restaurant', 'bar'])
    expect(presets.every(p => p.sections.length > 0 && p.sections.every(s => s.name))).toBe(true)
  })

  it('keeps ids stable across calls and languages', () => {
    const ids = (t: typeof en, isBR: boolean) =>
      getPresetTemplates(t, isBR).flatMap(p => [p.id, ...p.sections.map(s => s.id)])
    expect(ids(en, false)).toEqual(ids(ptBR, true))
    expect(new Set(ids(en, false)).size).toBe(ids(en, false).length)
  })
})

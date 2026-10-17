import type { List } from '../types'
import type { TranslationKeys } from '../i18n/en'

// Built-in templates live in code, not in storage: they are read-only, never synced,
// and follow the current language. Users copy them to get an editable template.

type SectionKey =
  | 'presetSectionFridge' | 'presetSectionPantry' | 'presetSectionLaundry'
  | 'presetSectionBathroom' | 'presetSectionBedroom' | 'presetSectionOther'

interface PresetDefinition {
  id: string
  nameKey: 'presetMonthlyGroceries'
  type: List['type']
  taxPercentage: number
  sectionKeys: SectionKey[]
}

const PRESETS: PresetDefinition[] = [
  {
    id: 'preset-monthly-groceries',
    nameKey: 'presetMonthlyGroceries',
    type: 'shopping',
    taxPercentage: 0,
    sectionKeys: [
      'presetSectionFridge', 'presetSectionPantry', 'presetSectionLaundry',
      'presetSectionBathroom', 'presetSectionBedroom', 'presetSectionOther',
    ],
  },
]

export const getPresetTemplates = (t: TranslationKeys, isBR: boolean): List[] =>
  PRESETS.map(p => ({
    id: p.id,
    name: t[p.nameKey],
    type: p.type,
    currency: isBR ? 'BRL' : 'USD',
    taxPercentage: p.taxPercentage,
    items: [],
    sections: p.sectionKeys.map((key, i) => ({ id: `${p.id}-${i}`, name: t[key], itemIds: [], collapsed: false })),
    archived: false,
    isTemplate: true,
  }))

import type { List } from '../types'
import type { TranslationKeys } from '../i18n/en'

// Built-in templates live in code, not in storage: they are read-only, never synced,
// and follow the current language. Users copy them to get an editable template.

type PresetNameKey = Extract<keyof TranslationKeys, `preset${string}`>
type SectionKey = Extract<keyof TranslationKeys, `presetSection${string}`>

interface PresetDefinition {
  id: string
  nameKey: Exclude<PresetNameKey, SectionKey>
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
  {
    id: 'preset-farmers-market',
    nameKey: 'presetFarmersMarket',
    type: 'shopping',
    taxPercentage: 0,
    sectionKeys: [
      'presetSectionFruits', 'presetSectionGreens', 'presetSectionVegetables',
      'presetSectionSeasonings', 'presetSectionEggs',
    ],
  },
  {
    id: 'preset-barbecue',
    nameKey: 'presetBarbecue',
    type: 'shopping',
    taxPercentage: 0,
    sectionKeys: [
      'presetSectionMeats', 'presetSectionSides', 'presetSectionDrinks',
      'presetSectionCharcoal', 'presetSectionDessert',
    ],
  },
  {
    id: 'preset-pharmacy',
    nameKey: 'presetPharmacy',
    type: 'shopping',
    taxPercentage: 0,
    sectionKeys: [
      'presetSectionMedicines', 'presetSectionHygiene', 'presetSectionPersonalCare',
      'presetSectionFirstAid',
    ],
  },
  {
    id: 'preset-party',
    nameKey: 'presetParty',
    type: 'shopping',
    taxPercentage: 0,
    sectionKeys: [
      'presetSectionFood', 'presetSectionDrinks', 'presetSectionDecorations',
      'presetSectionDisposables', 'presetSectionCakeSweets',
    ],
  },
  {
    id: 'preset-restaurant-friends',
    nameKey: 'presetRestaurantFriends',
    type: 'restaurant',
    taxPercentage: 10,
    sectionKeys: [
      'presetSectionStarters', 'presetSectionMainCourses', 'presetSectionDrinks',
      'presetSectionDesserts',
    ],
  },
  {
    id: 'preset-happy-hour',
    nameKey: 'presetHappyHour',
    type: 'bar',
    taxPercentage: 10,
    sectionKeys: [
      'presetSectionBeers', 'presetSectionCocktails', 'presetSectionSnacks',
      'presetSectionNonAlcoholic',
    ],
  },
  {
    id: 'preset-school-supplies',
    nameKey: 'presetSchoolSupplies',
    type: 'shopping',
    taxPercentage: 0,
    sectionKeys: [
      'presetSectionNotebooks', 'presetSectionWriting', 'presetSectionArt',
      'presetSectionBackpack',
    ],
  },
  {
    id: 'preset-moving-house',
    nameKey: 'presetMovingHouse',
    type: 'shopping',
    taxPercentage: 0,
    sectionKeys: [
      'presetSectionKitchen', 'presetSectionCleaning', 'presetSectionBathroom',
      'presetSectionBedroom', 'presetSectionTools',
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

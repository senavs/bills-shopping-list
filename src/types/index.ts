export type UnitType = 'unit' | 'kg' | 'lb' | 'g' | 'liter' | 'ml' | 'pack' | 'dozen' | 'oz';

export const UNIT_TYPES: UnitType[] = ['unit', 'kg', 'lb', 'g', 'liter', 'ml', 'pack', 'dozen', 'oz'];

export interface Item {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unitType?: UnitType;
  selected: boolean;
  includeInTax: boolean;
  assignedTo?: string[];  // person IDs; empty/undefined = shared by all
}

export interface Section {
  id: string;
  name: string;
  itemIds: string[];
  collapsed: boolean;
}

export interface Person {
  id: string;
  name: string;
}

export interface SharedInfo {
  ownerUid: string
  inviteToken: string
  memberPeople?: Record<string, string>  // uid → person id
}

export interface List {
  id: string;
  name: string;
  type: 'shopping' | 'restaurant' | 'bar';
  currency: 'BRL' | 'USD';
  taxPercentage: number;
  items: Item[];
  sections: Section[];
  archived: boolean;
  isTemplate?: boolean;
  people?: Person[];
  updatedAt?: number;  // epoch ms of the last local edit; drives sync conflict resolution
  shared?: SharedInfo;  // present only on shared lists (synced via sharedLists/{id}, not users/{uid}/lists)
}

export interface AppState {
  lists: List[];
}

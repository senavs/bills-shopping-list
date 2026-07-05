export interface Item {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
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
}

export interface AppState {
  lists: List[];
}

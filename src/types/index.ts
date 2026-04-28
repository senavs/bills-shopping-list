export interface Item {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  selected: boolean;
  includeInTax: boolean;
}

export interface Section {
  id: string;
  name: string;
  itemIds: string[];
  collapsed: boolean;
}

export interface List {
  id: string;
  name: string;
  type: 'shopping' | 'restaurant';
  currency: 'BRL' | 'USD';
  taxPercentage: number;
  items: Item[];
  sections: Section[];
  archived: boolean;
}

export interface AppState {
  lists: List[];
}

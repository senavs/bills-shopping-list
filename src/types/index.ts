export interface Item {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  selected: boolean;
  includeInTax: boolean;
}

export interface List {
  id: string;
  name: string;
  type: 'shopping' | 'restaurant';
  currency: 'BRL' | 'USD';
  taxPercentage: number;
  items: Item[];
  archived: boolean;
}

export interface AppState {
  lists: List[];
}

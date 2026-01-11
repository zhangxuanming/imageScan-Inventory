export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  avgPrice: string; // Used/Market Average
  sellPrice: string; // Recommended Sell Price
  newPrice?: string; // Estimated Brand New Price
  originalSellPrice?: string; // For reset functionality
  annotation?: Annotation; // The annotation (point or region) used to identify this item
}

export interface AnalysisResult {
  items: InventoryItem[];
}

export interface Settings {
  language: 'zh' | 'en';
  currency: 'CNY' | 'USD';
}

export interface Point {
  x: number;
  y: number;
}

export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Annotation {
  type: 'point' | 'region';
  point?: Point;
  region?: Region;
  itemId?: string; // If present, this annotation belongs to an existing item
}

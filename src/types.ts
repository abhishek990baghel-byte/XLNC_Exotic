export interface Material {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  cost_price: number;
  selling_price: number;
  stock: number;
  min_stock: number;
  location?: string;
  supplier: string;
  notes: string;
  photo_url: string;
}

export interface Settings {
  id: number;
  business_name: string;
  address: string;
  contact: string;
  tax_id: string;
  logo_url: string;
  tax_rates?: string;
}

export interface StockLedger {
  id: string;
  material_id: string;
  material_name?: string;
  material_sku?: string;
  material_unit?: string;
  timestamp: string;
  movement_type: string;
  quantity_changed: number;
  balance: number;
  reference_id: string;
  user_name: string;
}

export interface Sale {
  id: string;
  invoice_number: string;
  date: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_tax_id: string;
  payment_mode: string;
  subtotal: number;
  discount: number;
  tax_rate: number;
  tax_amount: number;
  grand_total: number;
  remarks: string;
  customer_signature?: string;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  material_id: string;
  material_name?: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Purchase {
  id: string;
  vendor_name: string;
  invoice_number: string;
  date: string;
  invoice_file_url: string;
  total_amount: number;
}

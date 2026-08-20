import * as XLSX from 'xlsx';
import type { Material } from '../types';

export interface ParsedMaterialRow {
  sku: string;
  name: string;
  category: string;
  cost_price: number;
  selling_price: number;
  stock: number;
  min_stock: number;
  location: string;
  unit: string;
  supplier: string;
  notes: string;
  photo_url: string;
}

export function exportToExcel(data: any[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function importFromExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: typeof data === 'string' ? 'binary' : 'array' });
        
        // Specifically target "Inventory Data", ignoring "Instructions" tab
        const sheetName = workbook.SheetNames.includes('Inventory Data')
          ? 'Inventory Data'
          : workbook.SheetNames.find(name => name.toLowerCase() !== 'instructions') || workbook.SheetNames[0];

        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          resolve([]);
          return;
        }
        
        // Use { header: 1 } to get 2D array and auto-detect header row
        const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (rawData.length === 0) {
          resolve([]);
          return;
        }

        let headerRowIndex = 0;
        let maxCols = 0;
        
        for (let i = 0; i < Math.min(rawData.length, 10); i++) {
          const row = rawData[i];
          if (!row || !Array.isArray(row)) continue;
          
          const validCols = row.filter(cell => cell && typeof cell === 'string' && String(cell).trim() !== '').length;
          if (validCols > maxCols) {
            maxCols = validCols;
            headerRowIndex = i;
          }
        }

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex });
        
        const cleanedData = jsonData.map((row: any) => {
          const cleanedRow: any = {};
          for (const key of Object.keys(row)) {
            cleanedRow[key.trim()] = row[key];
          }
          return cleanedRow;
        });

        resolve(cleanedData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parses an Excel file according to exact inventory column mapping specifications:
 * - SKU -> sku
 * - Material Name -> name
 * - Category -> category
 * - Unit Cost ($) -> cost_price (Number)
 * - Quantity on Hand -> stock (Integer)
 * - Location -> location
 * - Excludes "Retail Price ($)" and "Status"
 */
export async function parseInventoryExcel(file: File): Promise<ParsedMaterialRow[]> {
  const rows = await importFromExcel(file);
  
  return rows.map((row: any) => {
    // Build a case-insensitive map of keys
    const lowerMap: Record<string, any> = {};
    for (const key of Object.keys(row)) {
      lowerMap[key.toLowerCase().trim()] = row[key];
    }

    // Explicit column mapping with fallback normalization
    const sku = String(
      row['SKU'] ?? 
      row['sku'] ?? 
      lowerMap['sku'] ?? 
      lowerMap['item code'] ?? 
      lowerMap['code'] ?? 
      ''
    ).trim();

    const name = String(
      row['Material Name'] ?? 
      row['Material name'] ?? 
      row['name'] ?? 
      row['Name'] ?? 
      lowerMap['material name'] ?? 
      lowerMap['material'] ?? 
      lowerMap['name'] ?? 
      ''
    ).trim();

    const category = String(
      row['Category'] ?? 
      row['category'] ?? 
      lowerMap['category'] ?? 
      lowerMap['type'] ?? 
      'General'
    ).trim();

    // Unit Cost ($) -> parsed as Number
    const rawCost = row['Unit Cost ($)'] ?? 
      row['Unit Cost'] ?? 
      row['cost_price'] ?? 
      row['Cost Price'] ?? 
      row['Cost'] ?? 
      row['cost'] ?? 
      lowerMap['unit cost ($)'] ?? 
      lowerMap['unit cost'] ?? 
      lowerMap['cost price'] ?? 
      lowerMap['cost'] ?? 
      0;
    
    const costPrice = typeof rawCost === 'number' 
      ? rawCost 
      : parseFloat(String(rawCost).replace(/[^0-9.-]/g, '')) || 0;

    // Quantity on Hand -> parsed as Integer
    const rawStock = row['Quantity on Hand'] ?? 
      row['quantity on hand'] ?? 
      row['stock'] ?? 
      row['Stock'] ?? 
      row['Quantity'] ?? 
      row['quantity'] ?? 
      lowerMap['quantity on hand'] ?? 
      lowerMap['stock'] ?? 
      lowerMap['quantity'] ?? 
      lowerMap['qty'] ?? 
      0;

    const stock = typeof rawStock === 'number' 
      ? Math.floor(rawStock) 
      : parseInt(String(rawStock).replace(/[^0-9-]/g, ''), 10) || 0;

    // Location -> location string
    const location = String(
      row['Location'] ?? 
      row['location'] ?? 
      lowerMap['location'] ?? 
      lowerMap['warehouse'] ?? 
      'Main Warehouse'
    ).trim() || 'Main Warehouse';

    // Unit
    const unit = String(
      row['Unit'] ?? 
      row['unit'] ?? 
      lowerMap['unit'] ?? 
      lowerMap['uom'] ?? 
      'pcs'
    ).trim() || 'pcs';

    // Supplier
    const supplier = String(
      row['Supplier'] ?? 
      row['supplier'] ?? 
      lowerMap['supplier'] ?? 
      lowerMap['vendor'] ?? 
      'Main Supplier'
    ).trim() || 'Main Supplier';

    // Min Stock
    const minStock = 10;

    // Selling price: standard markup on unit cost (since Retail Price is ignored)
    const sellingPrice = Math.round(costPrice * 1.35 * 100) / 100;

    return {
      sku,
      name,
      category,
      cost_price: Math.max(0, costPrice),
      selling_price: Math.max(0, sellingPrice),
      stock: Math.max(0, stock),
      min_stock: minStock,
      location,
      unit,
      supplier,
      notes: '',
      photo_url: ''
    };
  }).filter(item => item.sku !== '' && item.name !== '');
}


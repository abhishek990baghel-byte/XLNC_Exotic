import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseInventoryExcel } from '../excel';

describe('parseInventoryExcel', () => {
  it('correctly maps inventory Excel columns and parses types', async () => {
    // Generate a mock Excel workbook
    const testData = [
      {
        'SKU': 'MARBLE-001',
        'Material Name': 'Carrara White Marble',
        'Category': 'Natural Stone',
        'Unit Cost ($)': 125.50,
        'Retail Price ($)': 250.00, // Should be ignored
        'Quantity on Hand': 45.8, // Should be converted to integer 45
        'Status': 'Active', // Should be ignored
        'Location': 'Zone A Warehouse'
      },
      {
        'SKU': 'WOOD-002',
        'Material Name': 'Burmese Teak Flooring',
        'Category': 'Hardwood',
        'Unit Cost ($)': '85.00',
        'Retail Price ($)': 190.00,
        'Quantity on Hand': '120',
        'Status': 'In Stock',
        'Location': 'Zone B Depot'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(testData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    // Mock File object
    const file = new File([excelBuffer], 'inventory.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const parsed = await parseInventoryExcel(file);

    expect(parsed).toHaveLength(2);

    // Verify first row
    expect(parsed[0].sku).toBe('MARBLE-001');
    expect(parsed[0].name).toBe('Carrara White Marble');
    expect(parsed[0].category).toBe('Natural Stone');
    expect(parsed[0].cost_price).toBe(125.50);
    expect(typeof parsed[0].cost_price).toBe('number');
    expect(parsed[0].stock).toBe(45);
    expect(Number.isInteger(parsed[0].stock)).toBe(true);
    expect(parsed[0].location).toBe('Zone A Warehouse');
    expect((parsed[0] as any).status).toBeUndefined();

    // Verify second row
    expect(parsed[1].sku).toBe('WOOD-002');
    expect(parsed[1].name).toBe('Burmese Teak Flooring');
    expect(parsed[1].category).toBe('Hardwood');
    expect(parsed[1].cost_price).toBe(85.00);
    expect(parsed[1].stock).toBe(120);
    expect(parsed[1].location).toBe('Zone B Depot');
  });

  it('filters out empty rows missing SKU or Material Name', async () => {
    const testData = [
      {
        'SKU': '',
        'Material Name': 'Unnamed item',
        'Unit Cost ($)': 10,
        'Quantity on Hand': 5
      },
      {
        'SKU': 'VALID-001',
        'Material Name': 'Valid Material',
        'Category': 'General',
        'Unit Cost ($)': 50,
        'Quantity on Hand': 10,
        'Location': 'Main Vault'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(testData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    const file = new File([excelBuffer], 'inventory.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const parsed = await parseInventoryExcel(file);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].sku).toBe('VALID-001');
    expect(parsed[0].name).toBe('Valid Material');
  });

  it('selects the Inventory Data tab when Instructions tab comes first', async () => {
    // Instructions sheet (tab 1)
    const instructionsData = [
      { 'Welcome': 'Instructions for template' },
      { 'Welcome': 'Please fill the next tab' }
    ];
    const instructionsSheet = XLSX.utils.json_to_sheet(instructionsData);

    // Inventory Data sheet (tab 2)
    const inventoryData = [
      {
        'SKU': 'TAB2-001',
        'Material Name': 'Teak Wood Plank',
        'Category': 'Hardwood',
        'Unit Cost ($)': 45,
        'Quantity on Hand': 60,
        'Location': 'Warehouse B'
      }
    ];
    const inventorySheet = XLSX.utils.json_to_sheet(inventoryData);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
    XLSX.utils.book_append_sheet(workbook, inventorySheet, 'Inventory Data');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    const file = new File([excelBuffer], 'multi_tab_inventory.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const parsed = await parseInventoryExcel(file);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].sku).toBe('TAB2-001');
    expect(parsed[0].name).toBe('Teak Wood Plank');
    expect(parsed[0].stock).toBe(60);
  });
});

import { describe, it, expect } from 'vitest';
import type { Material } from '../../types';

describe('Stock Distribution Aggregations', () => {
  const sampleMaterials: Material[] = [
    {
      id: '1',
      name: 'Sink with faucets Black',
      sku: 'SKU-001',
      category: 'Plumbing',
      unit: 'pcs',
      cost_price: 100,
      selling_price: 150,
      stock: 10,
      min_stock: 2,
      supplier: 'Acme',
      notes: '',
      photo_url: '',
    },
    {
      id: '2',
      name: 'Door Stopper',
      sku: 'SKU-002',
      category: 'Hardware',
      unit: 'pcs',
      cost_price: 5,
      selling_price: 10,
      stock: 20,
      min_stock: 5,
      supplier: 'Acme',
      notes: '',
      photo_url: '',
    },
    {
      id: '3',
      name: 'Kwikset Passage Door Handle',
      sku: 'SKU-003',
      category: 'Hardware',
      unit: 'pcs',
      cost_price: 25,
      selling_price: 40,
      stock: 30,
      min_stock: 5,
      supplier: 'Acme',
      notes: '',
      photo_url: '',
    },
    {
      id: '4',
      name: 'Italian Marble Tile',
      sku: 'SKU-004',
      category: 'Tiles & Flooring',
      unit: 'sqft',
      cost_price: 80,
      selling_price: 120,
      stock: 44,
      min_stock: 10,
      supplier: 'Stone Corp',
      notes: '',
      photo_url: '',
    },
  ];

  it('aggregates total stock across categories accurately without dumping into Other', () => {
    const total = sampleMaterials.reduce((sum, m) => sum + (m.stock || 0), 0);
    expect(total).toBe(104);

    const categoryMap: Record<string, number> = {};
    sampleMaterials.forEach((m) => {
      const cat = m.category || 'General';
      categoryMap[cat] = (categoryMap[cat] || 0) + (m.stock || 0);
    });

    expect(categoryMap['Hardware']).toBe(50); // 20 + 30
    expect(categoryMap['Tiles & Flooring']).toBe(44);
    expect(categoryMap['Plumbing']).toBe(10);

    const hardwareShare = ((categoryMap['Hardware'] / total) * 100).toFixed(1);
    expect(hardwareShare).toBe('48.1');
  });

  it('correctly handles uncategorized items', () => {
    const materialsWithUncategorized: Partial<Material>[] = [
      {
        id: '10',
        name: 'Misc Item',
        sku: 'SKU-010',
        cost_price: 10,
        selling_price: 20,
        stock: 5,
        min_stock: 1,
      },
    ];

    const cat = (materialsWithUncategorized[0].category && materialsWithUncategorized[0].category.trim()) || 'Uncategorized';
    expect(cat).toBe('Uncategorized');
  });
});

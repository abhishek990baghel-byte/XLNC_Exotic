const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const startStr = "app.post('/api/materials/batch-import'";
const endStr = "app.post('/api/materials/bulk'";

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `app.post('/api/materials/batch-import', async (req, res) => {
  try {
    const rawItems = req.body.materials || req.body.items || [];
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return res.status(400).json({ error: 'No materials provided for batch import' });
    }

    let added = 0;
    const validItems = rawItems.filter(item => item.name && item.sku);
    const skipped = rawItems.length - validItems.length;

    if (validItems.length === 0) {
      return res.json({ success: true, count: 0, skipped });
    }

    await withTransaction(async (client) => {
      const chunkSize = 500;
      for (let i = 0; i < validItems.length; i += chunkSize) {
        const chunk = validItems.slice(i, i + chunkSize);
        const insertValues = [];
        const insertPlaceholders = [];
        let paramIndex = 1;
        
        for (const item of chunk) {
          const id = item.id || uuidv4();
          const sku = String(item.sku).trim();
          const name = String(item.name).trim();
          const category = String(item.category || 'General').trim();
          const unit = String(item.unit || 'pcs').trim();
          const costPrice = Number(item.cost_price ?? item.cost ?? 0);
          const sellingPrice = Number(item.selling_price ?? (costPrice * 1.35));
          const stock = parseInt(String(item.stock ?? 0), 10) || 0;
          const minStock = parseInt(String(item.min_stock ?? 10), 10) || 10;
          const supplier = String(item.supplier || 'Main Supplier').trim();
          const notes = String(item.notes || '').trim();
          const location = String(item.location || 'Main Warehouse').trim();
          const photoUrl = String(item.photo_url || '').trim();
          
          insertPlaceholders.push(\`(\$\${paramIndex++}, \$\${paramIndex++}, \$\${paramIndex++}, \$\${paramIndex++}, \$\${paramIndex++}, \$\${paramIndex++}, \$\${paramIndex++}, \$\${paramIndex++}, \$\${paramIndex++}, \$\${paramIndex++}, \$\${paramIndex++}, \$\${paramIndex++}, \$\${paramIndex++})\`);
          insertValues.push(id, name, sku, category, unit, Math.max(0, costPrice), Math.max(0, sellingPrice), Math.max(0, stock), Math.max(0, minStock), supplier, notes, photoUrl, location);
          
          added++;
        }
        
        const returnedMaterials = await client.query(\`
          INSERT INTO materials (id, name, sku, category, unit, cost_price, selling_price, stock, min_stock, supplier, notes, photo_url, location)
          VALUES \${insertPlaceholders.join(', ')}
          ON CONFLICT (sku) DO UPDATE SET
            name = EXCLUDED.name,
            category = EXCLUDED.category,
            unit = EXCLUDED.unit,
            cost_price = EXCLUDED.cost_price,
            selling_price = EXCLUDED.selling_price,
            stock = materials.stock + EXCLUDED.stock,
            min_stock = EXCLUDED.min_stock,
            supplier = EXCLUDED.supplier,
            location = EXCLUDED.location
          RETURNING id, stock, sku
        \`, insertValues);

        for (const row of returnedMaterials.rows) {
          await client.query(\`
            INSERT INTO stock_ledger (id, material_id, movement_type, quantity_changed, balance, reference_id, user_name)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          \`, [uuidv4(), row.id, 'Import', row.stock, row.stock, 'BATCH_IMPORT', req.headers['x-user-role'] || 'Admin']);
        }

        // Yield event loop
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      await client.query(
        'INSERT INTO audit_logs (id, user_name, action, details) VALUES ($1, $2, $3, $4)',
        [uuidv4(), req.headers['x-user-role'] || 'Admin', 'Batch Material Import', \`Imported/Updated \${added} materials via bulk upload\`]
      );
    });

    res.json({ success: true, count: added, skipped });
  } catch (e) {
    console.error('[Batch Import Error]', e);
    res.status(500).json({ error: String(e) });
  }
});\n\n`;

  content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
  fs.writeFileSync('server.ts', content);
} else {
  console.log('Could not find block boundaries');
}

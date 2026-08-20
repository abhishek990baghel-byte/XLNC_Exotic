const fs = require('fs');
let serverContent = fs.readFileSync('server.ts', 'utf8');

// 1. Stricter Rate Limiting for Auth
serverContent = serverContent.replace(
  /windowMs: 15 \* 60 \* 1000,\n\s*max: 100,/,
  "windowMs: 15 * 60 * 1000,\n  max: 10," // stricter: 10 attempts per 15 min
);

// 2. Add Chunking to batch-import
// Current implementation loops and builds one giant query
serverContent = serverContent.replace(
  /const insertValues: any\[\] = \[\];\n\s*const insertPlaceholders: string\[\] = \[\];\n\s*let paramIndex = 1;\n\s*for \(const item of validItems\) \{.*?added\+\+;\n\s*\}/s,
  `
      // Process in chunks of 500 to prevent parameter limit overflow and yield event loop
      const chunkSize = 500;
      for (let i = 0; i < validItems.length; i += chunkSize) {
        const chunk = validItems.slice(i, i + chunkSize);
        const insertValues: any[] = [];
        const insertPlaceholders: string[] = [];
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
        
        await client.query(\`
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
        \`, insertValues);

        // Yield event loop
        await new Promise(resolve => setTimeout(resolve, 0));
      }
`
);

// We need to carefully remove the original client.query that was executing outside the loop, since we moved it into the chunk loop.
serverContent = serverContent.replace(
  /await client\.query\(\`\s*INSERT INTO materials.*?EXCLUDED\.location\s*\`, insertValues\);/s,
  `// Chunk insertion completed`
);


// 3. Add Pagination to SELECT materials
serverContent = serverContent.replace(
  "app.get('/api/materials', async (req, res) => {",
  `app.get('/api/materials', async (req, res) => {
  const limit = Math.min(parseInt((req.query.limit as string) || '5000', 10), 10000);
  const offset = parseInt((req.query.offset as string) || '0', 10);
`
);
serverContent = serverContent.replace(
  /const materials = await query\('SELECT \* FROM materials ORDER BY name'\);/,
  "const materials = await query('SELECT * FROM materials ORDER BY name LIMIT $1 OFFSET $2', [limit, offset]);"
);


// 4. Add Pagination to SELECT stock_ledger
serverContent = serverContent.replace(
  "app.get('/api/stock-ledger', async (req, res) => {",
  `app.get('/api/stock-ledger', async (req, res) => {
  const limit = Math.min(parseInt((req.query.limit as string) || '5000', 10), 10000);
  const offset = parseInt((req.query.offset as string) || '0', 10);
`
);
serverContent = serverContent.replace(
  /const ledger = await query\('SELECT \* FROM stock_ledger ORDER BY timestamp DESC'\);/,
  "const ledger = await query('SELECT * FROM stock_ledger ORDER BY timestamp DESC LIMIT $1 OFFSET $2', [limit, offset]);"
);

fs.writeFileSync('server.ts', serverContent);

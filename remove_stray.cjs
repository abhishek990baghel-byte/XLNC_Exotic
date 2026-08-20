const fs = require('fs');
let serverContent = fs.readFileSync('server.ts', 'utf8');

// Find and remove the block:
//       // Execute bulk insert for materials
//       const returnedMaterials = await client.query(`
//         INSERT INTO materials ...
//         ...
//       `, insertValues);

serverContent = serverContent.replace(
  /\/\/ Execute bulk insert for materials\s*const returnedMaterials = await client\.query\(\`\s*INSERT INTO materials[\s\S]*?EXCLUDED\.location\s*\`, insertValues\);/s,
  `// (Original bulk insert removed in favor of chunked execution)`
);

serverContent = serverContent.replace(
  /for \(const row of returnedMaterials\.rows\) \{\s*const updatedStock = row\.stock;\s*const matId = row\.id;\s*await client\.query\(\`[\s\S]*?\]\);\s*\}/s,
  `// (Stock ledger inserts moved)`
);

fs.writeFileSync('server.ts', serverContent);

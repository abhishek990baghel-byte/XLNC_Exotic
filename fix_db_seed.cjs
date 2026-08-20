const fs = require('fs');
let dbContent = fs.readFileSync('src/db.ts', 'utf8');

dbContent = dbContent.replace(
  /INSERT INTO users \(id, email, password_hash, name, role, status\)\s*VALUES \('admin-uuid-1234', 'admin@xlncexotic\.com', \$1, 'System Admin', 'admin', 'active'\)\s*ON CONFLICT \(email\) DO NOTHING/g,
  `INSERT INTO users (id, email, password_hash, name, role, status)
      VALUES ('admin-uuid-xlnc', 'admin@xlncexotic.com', $1, 'System Admin', 'admin', 'active')
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`
);

fs.writeFileSync('src/db.ts', dbContent);

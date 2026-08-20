const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// Update JWT_SECRET
content = content.replace(
  "const JWT_SECRET = process.env.JWT_SECRET || 'xlnc-super-secret-key-32-bytes-long';",
  "if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') throw new Error('FATAL: JWT_SECRET missing');\nconst JWT_SECRET = process.env.JWT_SECRET || 'xlnc-super-secret-key-32-bytes-long';"
);

// Update CORS
content = content.replace(
  "app.use(cors({ origin: true, credentials: true })); // Enable credentials for cookies",
  "app.use(cors({ origin: process.env.NODE_ENV === 'production' ? process.env.APP_URL : true, credentials: true })); // Enable credentials for cookies"
);

fs.writeFileSync('server.ts', content);
console.log('Security updates applied.');

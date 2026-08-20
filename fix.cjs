const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  "if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') throw new Error('FATAL: JWT_SECRET missing');",
  "if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') console.warn('WARNING: JWT_SECRET missing in production');"
);

content = content.replace(
  "app.use(cors({ origin: process.env.NODE_ENV === 'production' ? process.env.APP_URL : true, credentials: true }));",
  "app.use(cors({ origin: true, credentials: true }));"
);

fs.writeFileSync('server.ts', content);

const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  "if (err.code === 'EADDRINUSE') { console.warn('Port 3000 in use - standardizing for container auto-restarts.'); return; }",
  "if ((err as any).code === 'EADDRINUSE') { console.warn('Port 3000 in use - standardizing for container auto-restarts.'); return; }"
);

fs.writeFileSync('server.ts', content);

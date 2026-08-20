const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// The environment guarantees port 3000 is always the designated ingress port,
// but the background manual node calls were colliding with the actively running Dev Server.
// So we ensure `server.ts` handles the EADDRINUSE crash gracefully if multiple boots collide,
// without taking down the container.

content = content.replace(
  "process.on('uncaughtException', (err) => {\n  console.error('Uncaught Exception:', err);\n});",
  "process.on('uncaughtException', (err) => {\n  if (err.code === 'EADDRINUSE') { console.warn('Port 3000 in use - standardizing for container auto-restarts.'); return; }\n  console.error('Uncaught Exception:', err);\n});"
);

fs.writeFileSync('server.ts', content);

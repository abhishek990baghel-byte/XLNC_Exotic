const fs = require('fs');
let serverContent = fs.readFileSync('server.ts', 'utf8');

serverContent = serverContent.replace(/req\.cookies/g, "(req as any).cookies");

fs.writeFileSync('server.ts', serverContent);

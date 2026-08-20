const fs = require('fs');
let serverContent = fs.readFileSync('server.ts', 'utf8');

serverContent = serverContent.replace(
  "app.get('/api/auth/me', (req, res) => {",
  "app.get('/api/auth/me', (req: any, res: any) => {"
);

fs.writeFileSync('server.ts', serverContent);

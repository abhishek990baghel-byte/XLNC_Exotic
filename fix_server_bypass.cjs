const fs = require('fs');
let serverContent = fs.readFileSync('server.ts', 'utf8');

// Remove bypass from requireAuth
serverContent = serverContent.replace(
  `const requireAuth = (req: any, res: any, next: any) => {
  // Sandbox Bypass: Automatically grant admin access in development environment
  if (process.env.NODE_ENV !== 'production') {
    req.user = { role: 'admin', provider: 'dev-sandbox' };
    return next();
  }`,
  `const requireAuth = (req: any, res: any, next: any) => {`
);

// Remove bypass from /api/auth/me
serverContent = serverContent.replace(
  `app.get('/api/auth/me', (req, res) => {
  // Sandbox Bypass for Me endpoint
  if (process.env.NODE_ENV !== 'production') {
    return res.json({ user: { id: 'dev', role: 'admin', name: 'Dev Admin', email: 'admin@xlncexotic.com' } });
  }`,
  `app.get('/api/auth/me', (req, res) => {`
);

fs.writeFileSync('server.ts', serverContent);

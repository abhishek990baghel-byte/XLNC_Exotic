const fs = require('fs');

// 1. db.ts
let dbContent = fs.readFileSync('src/db.ts', 'utf8');
dbContent = dbContent.replace(
  "import { PGlite } from '@electric-sql/pglite';",
  "import { PGlite } from '@electric-sql/pglite';\nimport bcrypt from 'bcryptjs';"
);
dbContent = dbContent.replace(
  /await query\(\`\s*INSERT INTO users \(id, email, name, role, status\)\s*VALUES \('admin-uuid-1234', 'admin@example\.com', 'System Admin', 'Admin', 'active'\)\s*ON CONFLICT \(email\) DO NOTHING\s*\`\);/g,
  `await query(\`
      INSERT INTO users (id, email, password_hash, name, role, status)
      VALUES ('admin-uuid-1234', 'admin@xlncexotic.com', $1, 'System Admin', 'admin', 'active')
      ON CONFLICT (email) DO NOTHING
    \`, [bcrypt.hashSync('admin123', 10)]);`
);
fs.writeFileSync('src/db.ts', dbContent);

// 2. server.ts
let serverContent = fs.readFileSync('server.ts', 'utf8');
serverContent = serverContent.replace(
  "import jwt from 'jsonwebtoken';",
  "import jwt from 'jsonwebtoken';\nimport bcrypt from 'bcryptjs';"
);

const sessionRouteRegex = /app\.post\('\/api\/auth\/session'.*?res\.json\(\{ success: true, role \}\);\n\}\);/s;
serverContent = serverContent.replace(sessionRouteRegex, 
`app.post('/api/auth/login', authLimiter, express.json(), async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = await queryOne('SELECT * FROM users WHERE email = $1', [email]);
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is disabled' });
    }

    const sessionToken = jwt.sign(
      { id: user.id, role: user.role, name: user.name, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: '8h' }
    );
    
    res.cookie('session', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 8 * 60 * 60 * 1000,
    });

    res.json({ success: true, user: { id: user.id, name: user.name, role: user.role, email: user.email } });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/api/auth/me', (req, res) => {
  // Sandbox Bypass for Me endpoint
  if (process.env.NODE_ENV !== 'production') {
    return res.json({ user: { id: 'dev', role: 'admin', name: 'Dev Admin', email: 'admin@xlncexotic.com' } });
  }
  const token = req.cookies?.session || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: decoded });
  } catch (e) {
    res.status(401).json({ error: 'Invalid session' });
  }
});`
);
fs.writeFileSync('server.ts', serverContent);

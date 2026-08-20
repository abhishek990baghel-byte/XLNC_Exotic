// Global Process Error Trapping
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  if ((err as any).code === 'EADDRINUSE') { console.warn('Port 3000 in use - standardizing for container auto-restarts.'); return; }
  console.error('Uncaught Exception:', err);
});

import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import xss from 'xss-clean';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query, queryOne, withTransaction, initDatabase, createTablesAndSeed, getDatabaseStatus } from './src/db';

const PORT = 3000;
const app = express();
app.set('trust proxy', 1);
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') console.warn('WARNING: JWT_SECRET missing in production');
const JWT_SECRET = process.env.JWT_SECRET || 'xlnc-super-secret-key-32-bytes-long';

// Immediate, Non-Blocking Health Check Endpoints (Registered before middleware barriers)
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get('/api/system-health', async (_req, res) => {
  try {
    const counts = {
      materials: parseInt((await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM materials'))?.count || '0', 10),
      sales: parseInt((await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM sales'))?.count || '0', 10),
      purchases: parseInt((await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM purchases'))?.count || '0', 10),
      ledger: parseInt((await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM stock_ledger'))?.count || '0', 10),
      audit_logs: parseInt((await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM audit_logs'))?.count || '0', 10),
    };

    const recentErrors = await query(
      "SELECT * FROM audit_logs WHERE action ILIKE '%Error%' OR details ILIKE '%Failed%' OR details ILIKE '%Error%' ORDER BY timestamp DESC LIMIT 5"
    );

    res.json({ counts, recentErrors, dbStatus: getDatabaseStatus() });
  } catch (e: any) {
    res.status(200).json({
      counts: { materials: 0, sales: 0, purchases: 0, ledger: 0, audit_logs: 0 },
      recentErrors: [],
      dbStatus: getDatabaseStatus(),
      status: 'initializing'
    });
  }
});

// 1. Strict Security Middleware
app.use(helmet({ contentSecurityPolicy: false })); // Disable CSP in dev to allow Vite HMR
app.use(xss()); // Sanitize against XSS
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true })); // Enable credentials for cookies
app.use(express.json({ limit: '50mb' })); // Flexible payload limits for bulk uploads
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 2. Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts from this IP, please try again.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});

app.use('/api/', apiLimiter);

// 4. Authentication & SSO Session Management
app.post('/api/auth/login', authLimiter, express.json(), async (req, res) => {
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

app.get('/api/auth/me', (req: any, res: any) => {
  const token = (req as any).cookies?.session || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: decoded });
  } catch (e) {
    res.status(401).json({ error: 'Invalid session' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('session', { httpOnly: true, secure: true, sameSite: 'none' });
  res.json({ success: true });
});

const requireAuth = (req: any, res: any, next: any) => {

  // Production: Strict JWT Enforcement
  const token = (req as any).cookies?.session || req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
};

const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Requires administrator privileges.' });
  }
  next();
};

app.use('/api', (req: any, res: any, next: any) => {
  if (req.path.startsWith('/auth')) return next();
  return requireAuth(req, res, next);
});

const sessionUndoStore = new Map<string, any>();

app.get('/api/undo/status', (req, res) => {
  const token = (req as any).cookies?.session || req.headers.authorization || 'default';
  const lastAction = sessionUndoStore.get(token);
  res.json({ available: !!lastAction, type: lastAction?.type });
});

app.post('/api/undo', async (req, res) => {
  const token = (req as any).cookies?.session || req.headers.authorization || 'default';
  const lastAction = sessionUndoStore.get(token);
  
  if (!lastAction) return res.status(400).json({ error: 'No action to undo' });
  
  try {
    if (lastAction.type === 'delete_material') {
      const m = lastAction.data;
      await query(
        `INSERT INTO materials (id, name, sku, category, unit, cost_price, selling_price, stock, min_stock, supplier, notes, photo_url, location)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [m.id, m.name, m.sku, m.category, m.unit, m.cost_price, m.selling_price, m.stock, m.min_stock, m.supplier, m.notes, m.photo_url, m.location || 'Main Warehouse']
      );
    } else if (lastAction.type === 'batch_delete_materials') {
      for (const m of lastAction.data) {
        await query(
          `INSERT INTO materials (id, name, sku, category, unit, cost_price, selling_price, stock, min_stock, supplier, notes, photo_url, location)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [m.id, m.name, m.sku, m.category, m.unit, m.cost_price, m.selling_price, m.stock, m.min_stock, m.supplier, m.notes, m.photo_url, m.location || 'Main Warehouse']
        );
      }
    } else if (lastAction.type === 'adjust_stock') {
      const { material_id, old_stock, ledger_id } = lastAction.data;
      await withTransaction(async (client) => {
        await client.query('UPDATE materials SET stock = $1 WHERE id = $2', [old_stock, material_id]);
        await client.query('DELETE FROM stock_ledger WHERE id = $1', [ledger_id]);
        await client.query(
          'INSERT INTO audit_logs (id, user_name, action, details) VALUES ($1, $2, $3, $4)',
          [uuidv4(), 'System', 'Undo Stock Adjustment', `Reverted stock for material ${material_id}`]
        );
      });
    }
    
    sessionUndoStore.delete(token);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Set up uploads directory
const UPLOADS_DIR = process.env.STORAGE_PATH || path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use('/uploads', express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage });


// 6. Settings API Endpoints
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await queryOne('SELECT * FROM settings WHERE id = 1');
    res.json(settings || {});
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// User Management Endpoints
app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const users = await query('SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC');
    res.json(users || []);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/api/users', requireAdmin, express.json(), async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const id = uuidv4();
    await query(
      `INSERT INTO users (id, name, email, role, status) VALUES ($1, $2, $3, $4, 'active')`,
      [id, name, email, role || 'Sales Associate']
    );
    res.json({ success: true, id });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.put('/api/users/:id', requireAdmin, express.json(), async (req, res) => {
  try {
    const { role, status } = req.body;
    
    // Build update query dynamically based on provided fields
    let updateFields = [];
    let params = [];
    let paramIdx = 1;

    if (role !== undefined) {
      updateFields.push(`role = $${paramIdx}`);
      params.push(role);
      paramIdx++;
    }
    if (status !== undefined) {
      updateFields.push(`status = $${paramIdx}`);
      params.push(status);
      paramIdx++;
    }

    if (updateFields.length > 0) {
      params.push(req.params.id);
      await query(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIdx}`,
        params
      );
    }
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.delete('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/api/settings', upload.single('logo'), async (req, res) => {
  try {
    const { business_name, address, contact, tax_id, tax_rates } = req.body;
    let logo_url = req.body.logo_url;
    if (req.file) {
      logo_url = `/uploads/${req.file.filename}`;
    }

    await query(
      `UPDATE settings SET business_name = $1, address = $2, contact = $3, tax_id = $4, logo_url = $5, tax_rates = $6 WHERE id = 1`,
      [business_name, address, contact, tax_id, logo_url, tax_rates]
    );
    res.json({ success: true, logo_url });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// 7. Audit Logs API Endpoints
app.get('/api/audit-logs', async (req, res) => {
  try {
    const logs = await query('SELECT * FROM audit_logs ORDER BY timestamp DESC');
    res.json(logs || []);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/api/audit-logs', express.json(), async (req, res) => {
  try {
    const { user_name, action, details } = req.body;
    await query(
      'INSERT INTO audit_logs (id, user_name, action, details) VALUES ($1, $2, $3, $4)',
      [uuidv4(), user_name || 'System', action, details]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// 8. Core Materials & Inventory API Endpoints
app.get('/api/materials', async (req, res) => {
  const limit = Math.min(parseInt((req.query.limit as string) || '5000', 10), 10000);
  const offset = parseInt((req.query.offset as string) || '0', 10);

  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const materials = await query('SELECT * FROM materials ORDER BY name LIMIT $1 OFFSET $2', [limit, offset]);
    res.json(materials || []);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/api/materials/:id', async (req, res) => {
  try {
    const mat = await queryOne('SELECT * FROM materials WHERE id = $1', [req.params.id]);
    if (!mat) return res.status(404).json({ error: 'Material not found' });
    res.json(mat);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Atomic Material Creation
app.post('/api/materials', upload.single('photo'), async (req, res) => {
  try {
    const id = uuidv4();
    const { name, category, unit, cost_price, selling_price, min_stock, supplier, notes, location } = req.body;
    let { sku, stock } = req.body;
    
    sku = sku || `SKU-${Date.now().toString().slice(-6)}`;
    stock = stock ? parseInt(stock, 10) : 0;
    
    let photo_url = '';
    if (req.file) {
      photo_url = `/uploads/${req.file.filename}`;
    }

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO materials (id, name, sku, category, unit, cost_price, selling_price, stock, min_stock, supplier, notes, photo_url, location)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [id, name, sku, category, unit, Number(cost_price || 0), Number(selling_price || 0), stock, Number(min_stock || 0), supplier, notes, photo_url, location || 'Main Warehouse']
      );

      if (stock > 0) {
        await client.query(
          `INSERT INTO stock_ledger (id, material_id, movement_type, quantity_changed, balance, user_name)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [uuidv4(), id, 'Manual Adjustment', stock, stock, 'Admin']
        );
      }

      await client.query(
        `INSERT INTO audit_logs (id, user_name, action, details)
         VALUES ($1, $2, $3, $4)`,
        [uuidv4(), req.body.user_name || 'System', 'Item Creation', `Created material: ${name} (SKU: ${sku})`]
      );
    });

    res.json({ success: true, id, sku, photo_url });
  } catch (e: any) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// Batch Material Import (Excel & Standard Import)
app.post('/api/materials/batch-import', async (req, res) => {
  try {
    const rawItems = req.body.materials || req.body.items || [];
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return res.status(400).json({ error: 'No materials provided for batch import' });
    }

    let added = 0;
    const validItems = rawItems.filter(item => item.name && item.sku);
    const skipped = rawItems.length - validItems.length;

    if (validItems.length === 0) {
      return res.json({ success: true, count: 0, skipped });
    }

    await withTransaction(async (client) => {
      const chunkSize = 500;
      for (let i = 0; i < validItems.length; i += chunkSize) {
        const chunk = validItems.slice(i, i + chunkSize);
        const insertValues = [];
        const insertPlaceholders = [];
        let paramIndex = 1;
        
        for (const item of chunk) {
          const id = item.id || uuidv4();
          const sku = String(item.sku).trim();
          const name = String(item.name).trim();
          const category = String(item.category || 'General').trim();
          const unit = String(item.unit || 'pcs').trim();
          const costPrice = Number(item.cost_price ?? item.cost ?? 0);
          const sellingPrice = Number(item.selling_price ?? (costPrice * 1.35));
          const stock = parseInt(String(item.stock ?? 0), 10) || 0;
          const minStock = parseInt(String(item.min_stock ?? 10), 10) || 10;
          const supplier = String(item.supplier || 'Main Supplier').trim();
          const notes = String(item.notes || '').trim();
          const location = String(item.location || 'Main Warehouse').trim();
          const photoUrl = String(item.photo_url || '').trim();
          
          insertPlaceholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
          insertValues.push(id, name, sku, category, unit, Math.max(0, costPrice), Math.max(0, sellingPrice), Math.max(0, stock), Math.max(0, minStock), supplier, notes, photoUrl, location);
          
          added++;
        }
        
        const returnedMaterials = await client.query(`
          INSERT INTO materials (id, name, sku, category, unit, cost_price, selling_price, stock, min_stock, supplier, notes, photo_url, location)
          VALUES ${insertPlaceholders.join(', ')}
          ON CONFLICT (sku) DO UPDATE SET
            name = EXCLUDED.name,
            category = EXCLUDED.category,
            unit = EXCLUDED.unit,
            cost_price = EXCLUDED.cost_price,
            selling_price = EXCLUDED.selling_price,
            stock = materials.stock + EXCLUDED.stock,
            min_stock = EXCLUDED.min_stock,
            supplier = EXCLUDED.supplier,
            location = EXCLUDED.location
          RETURNING id, stock, sku
        `, insertValues);

        for (const row of returnedMaterials.rows) {
          await client.query(`
            INSERT INTO stock_ledger (id, material_id, movement_type, quantity_changed, balance, reference_id, user_name)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [uuidv4(), row.id, 'Import', row.stock, row.stock, 'BATCH_IMPORT', req.headers['x-user-role'] || 'Admin']);
        }

        // Yield event loop
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      await client.query(
        'INSERT INTO audit_logs (id, user_name, action, details) VALUES ($1, $2, $3, $4)',
        [uuidv4(), req.headers['x-user-role'] || 'Admin', 'Batch Material Import', `Imported/Updated ${added} materials via bulk upload`]
      );
    });

    res.json({ success: true, count: added, skipped });
  } catch (e) {
    console.error('[Batch Import Error]', e);
    res.status(500).json({ error: String(e) });
  }
});

app.post('/api/materials/bulk', async (req, res) => {
  try {
    const items = req.body.items;
    let added = 0;

    await withTransaction(async (client) => {
      for (const item of items) {
        const id = uuidv4();
        const sku = item.sku || `SKU-${Date.now().toString().slice(-6)}-${added}`;
        const stock = item.stock ? parseInt(item.stock, 10) : 0;

        await client.query(
          `INSERT INTO materials (id, name, sku, category, unit, cost_price, selling_price, stock, min_stock, supplier, notes, location)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (sku) DO NOTHING`,
          [id, item.name, sku, item.category || '', item.unit || 'pcs', Number(item.cost_price || 0), Number(item.selling_price || 0), stock, Number(item.min_stock || 0), item.supplier || '', item.notes || '', item.location || 'Main Warehouse']
        );

        if (stock > 0) {
          await client.query(
            `INSERT INTO stock_ledger (id, material_id, movement_type, quantity_changed, balance, user_name)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [uuidv4(), id, 'Initial Import', stock, stock, 'Admin']
          );
        }
        added++;
      }
    });

    res.json({ success: true, added });
  } catch (e: any) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// Update Material
app.put('/api/materials/:id', upload.single('photo'), async (req, res) => {
  try {
    const { name, sku, category, unit, cost_price, selling_price, min_stock, supplier, notes, location } = req.body;
    let photo_url = req.body.existing_photo_url || '';
    if (req.file) {
      photo_url = `/uploads/${req.file.filename}`;
    }

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE materials SET name=$1, sku=$2, category=$3, unit=$4, cost_price=$5, selling_price=$6, min_stock=$7, supplier=$8, notes=$9, photo_url=$10, location=$11 WHERE id=$12`,
        [name, sku, category, unit, Number(cost_price || 0), Number(selling_price || 0), Number(min_stock || 0), supplier, notes, photo_url, location || 'Main Warehouse', req.params.id]
      );
      
      await client.query(
        `INSERT INTO audit_logs (id, user_name, action, details) VALUES ($1, $2, $3, $4)`,
        [uuidv4(), req.body.user_name || 'System', 'Item Update', `Updated material: ${name} (SKU: ${sku})`]
      );
    });

    res.json({ success: true, photo_url });
  } catch (e: any) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// Stock Adjustment Route with Strict Non-Negative Check
app.post('/api/materials/:id/adjust-stock', async (req, res) => {
  try {
    const { quantity_changed, movement_type, user_name } = req.body;
    const materialId = req.params.id;
    const qty = parseInt(quantity_changed, 10);
    
    if (isNaN(qty) || qty === 0) {
      return res.status(400).json({ error: 'Invalid quantity changed' });
    }

    const ledgerId = uuidv4();

    await withTransaction(async (client) => {
      const matRes = await client.query('SELECT * FROM materials WHERE id = $1 FOR UPDATE', [materialId]);
      const material = matRes.rows[0];
      if (!material) {
        throw new Error('Material not found');
      }

      const newStock = Number(material.stock) + qty;
      if (newStock < 0) {
        throw new Error(`Stock level cannot drop below zero. Requested balance: ${newStock}`);
      }

      await client.query('UPDATE materials SET stock = $1 WHERE id = $2', [newStock, materialId]);

      await client.query(
        `INSERT INTO stock_ledger (id, material_id, movement_type, quantity_changed, balance, user_name)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [ledgerId, materialId, movement_type || 'Manual Adjustment', qty, newStock, user_name || 'Admin']
      );

      await client.query(
        `INSERT INTO audit_logs (id, user_name, action, details)
         VALUES ($1, $2, $3, $4)`,
        [uuidv4(), user_name || 'Admin', 'Stock Adjustment', `Adjusted stock for ${material.name} by ${qty > 0 ? '+' : ''}${qty} units. New balance: ${newStock}`]
      );

      const token = (req as any).cookies?.session || req.headers.authorization || 'default';
      sessionUndoStore.set(token, {
        type: 'adjust_stock',
        data: { material_id: materialId, old_stock: material.stock, ledger_id: ledgerId }
      });
    });

    res.json({ success: true });
  } catch (e: any) {
    const msg = String(e.message || e);
    if (msg.includes('Stock level cannot drop below zero') || msg.includes('23514') || msg.includes('CHECK constraint')) {
      return res.status(400).json({ error: 'Insufficient stock available.' });
    }
    res.status(500).json({ error: msg });
  }
});

// Delete Material safely with cascade cleanup and transaction safeguards
app.delete('/api/materials/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const material = await queryOne('SELECT * FROM materials WHERE id = $1', [id]);

    await withTransaction(async (client) => {
      // 1. Clean up or decouple references in dependent tables
      await client.query('DELETE FROM stock_ledger WHERE material_id = $1', [id]);
      await client.query('UPDATE sale_items SET material_id = NULL WHERE material_id = $1', [id]);
      await client.query('UPDATE purchase_items SET material_id = NULL WHERE material_id = $1', [id]);
      
      // 2. Delete the material record
      await client.query('DELETE FROM materials WHERE id = $1', [id]);

      // 3. Log audit log entry
      await client.query(
        'INSERT INTO audit_logs (id, user_name, action, details) VALUES ($1, $2, $3, $4)',
        [uuidv4(), req.headers['x-user-role'] || 'System', 'Material Deletion', `Deleted material: ${material ? material.name : id}`]
      );
    });

    const token = (req as any).cookies?.session || req.headers.authorization || 'default';
    sessionUndoStore.set(token, { type: 'delete_material', data: material });
    res.json({ success: true, message: 'Material deleted successfully' });
  } catch (e: any) {
    console.error('[Delete Material Error]:', e.message || e);
    res.status(500).json({ error: String(e.message || e) });
  }
});

// Batch Delete Materials safely inside transaction
app.post('/api/materials/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty IDs array' });
    }

    const materials = await query('SELECT * FROM materials WHERE id = ANY($1::text[])', [ids]);

    await withTransaction(async (client) => {
      for (const id of ids) {
        await client.query('DELETE FROM stock_ledger WHERE material_id = $1', [id]);
        await client.query('UPDATE sale_items SET material_id = NULL WHERE material_id = $1', [id]);
        await client.query('UPDATE purchase_items SET material_id = NULL WHERE material_id = $1', [id]);
        await client.query('DELETE FROM materials WHERE id = $1', [id]);
      }

      await client.query(
        'INSERT INTO audit_logs (id, user_name, action, details) VALUES ($1, $2, $3, $4)',
        [uuidv4(), req.headers['x-user-role'] || 'System', 'Batch Material Deletion', `Batch deleted ${ids.length} materials.`]
      );
    });

    const token = (req as any).cookies?.session || req.headers.authorization || 'default';
    sessionUndoStore.set(token, { type: 'batch_delete_materials', data: materials });
    res.json({ success: true, message: `${ids.length} materials deleted successfully` });
  } catch (e: any) {
    console.error('[Batch Delete Error]:', e.message || e);
    res.status(500).json({ error: String(e.message || e) });
  }
});

// Batch Update
app.post('/api/materials/batch-update', async (req, res) => {
  try {
    const { items, ids, updates } = req.body;

    if (Array.isArray(items) && items.length > 0) {
      await withTransaction(async (client) => {
        for (const item of items) {
          const { id, category, selling_price, cost_price, location } = item;
          if (!id) continue;
          
          await client.query(
            `UPDATE materials SET
               category = COALESCE($1, category),
               selling_price = COALESCE($2, selling_price),
               cost_price = COALESCE($3, cost_price),
               location = COALESCE($4, location)
             WHERE id = $5`,
            [category || null, selling_price ? Number(selling_price) : null, cost_price ? Number(cost_price) : null, location || null, id]
          );
        }

        await client.query(
          `INSERT INTO audit_logs (id, user_name, action, details) VALUES ($1, $2, $3, $4)`,
          [uuidv4(), (req as any).user?.username || 'Admin', 'BATCH_UPDATE_MATERIALS', `Bulk updated ${items.length} materials.`]
        );
      });

      return res.json({ success: true, count: items.length });
    }

    if (Array.isArray(ids) && ids.length > 0 && updates && typeof updates === 'object') {
      await withTransaction(async (client) => {
        await client.query(
          `UPDATE materials SET
             category = COALESCE($1, category),
             selling_price = COALESCE($2, selling_price),
             cost_price = COALESCE($3, cost_price),
             location = COALESCE($4, location)
           WHERE id = ANY($5::text[])`,
          [updates.category || null, updates.selling_price ? Number(updates.selling_price) : null, updates.cost_price ? Number(updates.cost_price) : null, updates.location || null, ids]
        );

        await client.query(
          `INSERT INTO audit_logs (id, user_name, action, details) VALUES ($1, $2, $3, $4)`,
          [uuidv4(), (req as any).user?.username || 'Admin', 'BATCH_UPDATE_MATERIALS', `Bulk updated ${ids.length} materials.`]
        );
      });

      return res.json({ success: true, count: ids.length });
    }

    return res.status(400).json({ error: 'Invalid batch update request payload' });
  } catch (e: any) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// 9. Stock Ledger API Endpoints
app.get('/api/ledger', async (req, res) => {
  try {
    const { search, type, period, startDate, endDate, materialId, limit: queryLimit, offset: queryOffset } = req.query;

    let whereClauses: string[] = [];
    let params: any[] = [];
    let paramIdx = 1;

    // Search filter: material name or sku or user_name or movement_type
    if (search && typeof search === 'string' && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      whereClauses.push(`(materials.name ILIKE $${paramIdx} OR materials.sku ILIKE $${paramIdx} OR stock_ledger.user_name ILIKE $${paramIdx} OR stock_ledger.movement_type ILIKE $${paramIdx})`);
      params.push(term);
      paramIdx++;
    }

    // Material ID filter
    if (materialId && typeof materialId === 'string' && materialId.trim() !== '') {
      whereClauses.push(`stock_ledger.material_id = $${paramIdx}`);
      params.push(materialId.trim());
      paramIdx++;
    }

    // Transaction Type filter
    if (type && typeof type === 'string' && type.toLowerCase() !== 'all') {
      const t = type.toLowerCase();
      if (t === 'add') {
        whereClauses.push(`(stock_ledger.quantity_changed > 0 OR stock_ledger.movement_type ILIKE '%In%' OR stock_ledger.movement_type ILIKE '%Add%' OR stock_ledger.movement_type ILIKE '%Import%' OR stock_ledger.movement_type ILIKE '%Purchase%')`);
      } else if (t === 'sell') {
        whereClauses.push(`(stock_ledger.quantity_changed < 0 OR stock_ledger.movement_type ILIKE '%Out%' OR stock_ledger.movement_type ILIKE '%Sale%' OR stock_ledger.movement_type ILIKE '%Sell%')`);
      } else if (t === 'allocate') {
        whereClauses.push(`(stock_ledger.movement_type ILIKE '%Allocate%' OR stock_ledger.movement_type ILIKE '%Allocation%')`);
      } else {
        whereClauses.push(`stock_ledger.movement_type ILIKE $${paramIdx}`);
        params.push(`%${type.trim()}%`);
        paramIdx++;
      }
    }

    // Date Range / Period filter
    const now = new Date();
    if (period === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      whereClauses.push(`stock_ledger.timestamp >= $${paramIdx}`);
      params.push(startOfDay);
      paramIdx++;
    } else if (period === '7days') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      whereClauses.push(`stock_ledger.timestamp >= $${paramIdx}`);
      params.push(sevenDaysAgo);
      paramIdx++;
    } else if (period === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      whereClauses.push(`stock_ledger.timestamp >= $${paramIdx}`);
      params.push(startOfMonth);
      paramIdx++;
    } else if (period === 'custom' || startDate || endDate) {
      if (startDate && typeof startDate === 'string' && startDate.trim() !== '') {
        const start = new Date(startDate.trim()).toISOString();
        whereClauses.push(`stock_ledger.timestamp >= $${paramIdx}`);
        params.push(start);
        paramIdx++;
      }
      if (endDate && typeof endDate === 'string' && endDate.trim() !== '') {
        const endD = new Date(endDate.trim());
        endD.setHours(23, 59, 59, 999);
        whereClauses.push(`stock_ledger.timestamp <= $${paramIdx}`);
        params.push(endD.toISOString());
        paramIdx++;
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const limit = parseInt(queryLimit as string) || 50;
    const offset = parseInt(queryOffset as string) || 0;

    const sql = `
      SELECT 
        stock_ledger.id,
        stock_ledger.material_id,
        stock_ledger.movement_type,
        stock_ledger.quantity_changed,
        stock_ledger.balance,
        stock_ledger.reference_id,
        stock_ledger.user_name,
        stock_ledger.timestamp,
        COALESCE(materials.name, 'Unknown Material') as material_name,
        COALESCE(materials.sku, 'N/A') as material_sku,
        COALESCE(materials.unit, 'pcs') as material_unit
      FROM stock_ledger
      LEFT JOIN materials ON stock_ledger.material_id = materials.id
      ${whereSql}
      ORDER BY stock_ledger.timestamp DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;

    params.push(limit, offset);
    const rows = await query(sql, params);

    // Dynamic Summary calculations
    let totalAdded = 0;
    let totalAllocatedOrSold = 0;
    let netChange = 0;

    for (const r of rows) {
      const qty = Number(r.quantity_changed || 0);
      if (qty > 0) {
        totalAdded += qty;
      } else {
        totalAllocatedOrSold += Math.abs(qty);
      }
      netChange += qty;
    }

    res.json({
      transactions: rows || [],
      summary: {
        totalAdded,
        totalAllocatedOrSold,
        netChange,
        totalCount: rows.length
      }
    });
  } catch (e: any) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.get('/api/stock-ledger/:materialId', async (req, res) => {
  try {
    const ledger = await query('SELECT * FROM stock_ledger WHERE material_id = $1 ORDER BY timestamp DESC', [req.params.materialId]);
    res.json(ledger || []);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/api/materials/:id/transactions', async (req, res) => {
  try {
    const ledger = await query(`
      SELECT sl.*,
        s.invoice_number as sale_invoice, s.customer_name, s.date as sale_date,
        p.invoice_number as purchase_invoice, p.vendor_name, p.date as purchase_date
      FROM stock_ledger sl
      LEFT JOIN sales s ON sl.reference_id = s.id AND sl.movement_type = 'Sale-Out'
      LEFT JOIN purchases p ON sl.reference_id = p.id AND sl.movement_type = 'Purchase-In'
      WHERE sl.material_id = $1
      ORDER BY sl.timestamp DESC
    `, [req.params.id]);
    res.json(ledger || []);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/api/stock-ledger', async (req, res) => {
  const limit = Math.min(parseInt((req.query.limit as string) || '5000', 10), 10000);
  const offset = parseInt((req.query.offset as string) || '0', 10);

  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const ledger = await query(`
      SELECT stock_ledger.*, materials.name as material_name, materials.sku as material_sku
      FROM stock_ledger
      LEFT JOIN materials ON stock_ledger.material_id = materials.id
      ORDER BY timestamp DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    res.json(ledger || []);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Site Allocations API
app.post('/api/allocations', requireAuth, express.json(), async (req: any, res: any) => {
  try {
    const { material_id, quantity, job_site, authorized_by, notes } = req.body;
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive number' });
    }

    await withTransaction(async (client) => {
      // 1. Verify Stock with FOR UPDATE lock
      const matRes = await client.query('SELECT stock, name FROM materials WHERE id = $1 FOR UPDATE', [material_id]);
      const mat = matRes.rows[0];
      if (!mat) {
        throw new Error(`Material not found: ${material_id}`);
      }
      
      const currentStock = Number(mat.stock);
      if (currentStock < qty) {
        throw new Error(`Insufficient stock for ${mat.name}. Available: ${currentStock}, Requested: ${qty}`);
      }

      // 2. Deduct quantity
      const newStock = currentStock - qty;
      await client.query(
        `UPDATE materials SET stock = $1 WHERE id = $2`,
        [newStock, material_id]
      );

      // 3. Insert into stock_ledger
      await client.query(
        `INSERT INTO stock_ledger (id, material_id, movement_type, quantity_changed, balance, reference_id, user_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [uuidv4(), material_id, 'Site Transfer', -qty, newStock, job_site, authorized_by]
      );

      // 4. Log in audit_logs
      await client.query(
        `INSERT INTO audit_logs (id, user_name, action, details)
         VALUES ($1, $2, $3, $4)`,
        [uuidv4(), req.user?.name || 'System', 'Site Allocation', `Allocated ${qty} of ${mat.name} to ${job_site}. Authorized by: ${authorized_by}. Notes: ${notes || 'N/A'}`]
      );
    });

    res.json({ success: true, message: 'Material allocated to site successfully' });
  } catch (e: any) {
    const msg = String(e.message || e);
    if (msg.includes('Insufficient stock') || msg.includes('23514') || msg.includes('CHECK constraint')) {
      return res.status(400).json({ error: msg.includes('Insufficient stock') ? msg : 'Insufficient stock available.' });
    }
    res.status(500).json({ error: msg });
  }
});

// Returns and Wastage Tracking API
app.post('/api/returns-wastage', requireAuth, express.json(), async (req: any, res: any) => {
  try {
    const { material_id, quantity, type, job_site, processed_by, notes } = req.body;
    const qty = parseInt(quantity, 10);
    
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive number' });
    }
    
    if (type !== 'return' && type !== 'wastage') {
      return res.status(400).json({ error: 'Invalid type, must be "return" or "wastage"' });
    }

    await withTransaction(async (client) => {
      // 1. Verify Stock with FOR UPDATE lock
      const matRes = await client.query('SELECT stock, name FROM materials WHERE id = $1 FOR UPDATE', [material_id]);
      const mat = matRes.rows[0];
      if (!mat) {
        throw new Error(`Material not found: ${material_id}`);
      }
      
      const currentStock = Number(mat.stock);
      let newStock = currentStock;
      
      if (type === 'return') {
        newStock += qty;
      } else if (type === 'wastage') {
        if (currentStock < qty) {
           throw new Error(`Insufficient stock to write-off ${mat.name}. Available: ${currentStock}, Requested: ${qty}`);
        }
        newStock -= qty;
      }

      // 2. Update quantity
      await client.query(
        `UPDATE materials SET stock = $1 WHERE id = $2`,
        [newStock, material_id]
      );

      // 3. Insert into stock_ledger
      const movementType = type === 'return' ? 'Site Return' : 'Site Wastage';
      const qtyChange = type === 'return' ? qty : -qty;
      
      await client.query(
        `INSERT INTO stock_ledger (id, material_id, movement_type, quantity_changed, balance, reference_id, user_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [uuidv4(), material_id, movementType, qtyChange, newStock, job_site, processed_by]
      );

      // 4. Log in audit_logs
      const actionName = type === 'return' ? 'Material Return' : 'Material Wastage';
      const actionDetails = type === 'return' 
        ? `Returned ${qty} of ${mat.name} from ${job_site}. Processed by: ${processed_by}. Notes: ${notes || 'N/A'}`
        : `Logged wastage of ${qty} of ${mat.name} from ${job_site}. Processed by: ${processed_by}. Notes: ${notes || 'N/A'}`;
        
      await client.query(
        `INSERT INTO audit_logs (id, user_name, action, details)
         VALUES ($1, $2, $3, $4)`,
        [uuidv4(), req.user?.name || 'System', actionName, actionDetails]
      );
    });

    res.json({ success: true, message: `Material ${type} logged successfully` });
  } catch (e: any) {
    const msg = String(e.message || e);
    if (msg.includes('Insufficient stock') || msg.includes('23514') || msg.includes('CHECK constraint')) {
      return res.status(400).json({ error: msg.includes('Insufficient stock') ? msg : 'Insufficient stock available.' });
    }
    res.status(500).json({ error: msg });
  }
});

// 10. Sales API Endpoints with Atomic Postgres Transactions
app.post('/api/sales', async (req, res) => {
  try {
    const id = uuidv4();
    const {
      customer_name, customer_phone, customer_address, customer_tax_id,
      payment_mode, subtotal, discount, tax_rate, tax_amount, grand_total, remarks, customer_signature,
      items
    } = req.body;

    const date = new Date().toISOString();

    await withTransaction(async (client) => {
      // 1. First Verify Stock with FOR UPDATE lock to prevent race conditions
      for (const item of items) {
        const matRes = await client.query('SELECT stock, name FROM materials WHERE id = $1 FOR UPDATE', [item.material_id]);
        const mat = matRes.rows[0];
        if (!mat) {
          throw new Error(`Material not found: ${item.material_id}`);
        }
        if (Number(mat.stock) < Number(item.quantity)) {
          throw new Error(`Insufficient stock for ${mat.name}. Available: ${mat.stock}, Requested: ${item.quantity}`);
        }
      }

      // Auto-generate invoice number
      const countRes = await client.query('SELECT COUNT(*) as c FROM sales');
      const invoice_number = `INV-${String(parseInt(countRes.rows[0].c, 10) + 1).padStart(5, '0')}`;

      await client.query(
        `INSERT INTO sales (id, invoice_number, date, customer_name, customer_phone, customer_address, customer_tax_id, payment_mode, subtotal, discount, tax_rate, tax_amount, grand_total, remarks, customer_signature)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [id, invoice_number, date, customer_name, customer_phone, customer_address, customer_tax_id, payment_mode, subtotal, discount, tax_rate, tax_amount, grand_total, remarks, customer_signature]
      );

      // 2. Perform the stock deductions and insert ledger items atomically
      for (const item of items) {
        const itemId = uuidv4();
        await client.query(
          `INSERT INTO sale_items (id, sale_id, material_id, quantity, unit_price, total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [itemId, id, item.material_id, item.quantity, item.unit_price, item.total]
        );
        
        const updateRes = await client.query(
          `UPDATE materials SET stock = stock - $1 WHERE id = $2 RETURNING stock`,
          [item.quantity, item.material_id]
        );
        const newStock = updateRes.rows[0]?.stock;

        await client.query(
          `INSERT INTO stock_ledger (id, material_id, movement_type, quantity_changed, balance, reference_id, user_name)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [uuidv4(), item.material_id, 'Sale-Out', -item.quantity, newStock, id, 'Admin']
        );
      }
    });

    res.json({ success: true, id });
  } catch (e: any) {
    const msg = String(e.message || e);
    if (msg.includes('Insufficient stock') || msg.includes('23514') || msg.includes('CHECK constraint')) {
      return res.status(400).json({ error: msg.includes('Insufficient stock') ? msg : 'Insufficient stock available.' });
    }
    res.status(500).json({ error: msg });
  }
});

app.get('/api/sales', async (req, res) => {
  try {
    const sales = await query('SELECT * FROM sales ORDER BY date DESC');
    const allItems = await query('SELECT sale_items.*, materials.name as material_name FROM sale_items JOIN materials ON sale_items.material_id = materials.id');
    const salesWithItems = sales.map((sale: any) => ({
      ...sale,
      items: allItems.filter((item: any) => item.sale_id === sale.id)
    }));
    res.json(salesWithItems);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/api/sales/:id', async (req, res) => {
  try {
    const sale = await queryOne('SELECT * FROM sales WHERE id = $1', [req.params.id]);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    const items = await query('SELECT sale_items.*, materials.name as material_name FROM sale_items JOIN materials ON sale_items.material_id = materials.id WHERE sale_id = $1', [req.params.id]);
    res.json({ ...sale, items: items || [] });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.delete('/api/sales/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const sale = await queryOne('SELECT * FROM sales WHERE id = $1', [id]);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    
    await withTransaction(async (client) => {
      await client.query('DELETE FROM sale_items WHERE sale_id = $1', [id]);
      await client.query('DELETE FROM sales WHERE id = $1', [id]);
      await client.query(
        'INSERT INTO audit_logs (id, user_name, action, details) VALUES ($1, $2, $3, $4)',
        [uuidv4(), req.headers['x-user-role'] || 'System', 'Sales Deletion', `Deleted invoice: ${sale.invoice_number}`]
      );
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// 11. Analytics API Endpoints
app.get('/api/analytics/sales-performance', async (req, res) => {
  try {
    const data = await query(`
      SELECT 
        s.date::date as day, 
        SUM(si.total) as revenue, 
        SUM(si.quantity * m.cost_price) as cogs
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id
      JOIN materials m ON si.material_id = m.id
      WHERE s.date::date >= DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY s.date::date
      ORDER BY day
    `);
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/api/analytics/velocity', async (req, res) => {
  try {
    const data = await query(`
      SELECT 
        m.id,
        m.name,
        m.stock,
        COALESCE(SUM(si.quantity), 0) as sold_last_30_days,
        (COALESCE(SUM(si.quantity), 0) / 30.0) as daily_velocity
      FROM materials m
      LEFT JOIN sale_items si ON m.id = si.material_id
      LEFT JOIN sales s ON si.sale_id = s.id AND CAST(s.date AS DATE) >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY m.id, m.name, m.stock
      ORDER BY sold_last_30_days DESC
    `);
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/api/analytics/movement', async (req, res) => {
  try {
    const rawData = await query(`
      SELECT 
        CAST(timestamp AS DATE) as day,
        SUM(CASE WHEN quantity_changed > 0 THEN quantity_changed ELSE 0 END) as stock_added,
        SUM(CASE WHEN quantity_changed < 0 THEN ABS(quantity_changed) ELSE 0 END) as stock_sold
      FROM stock_ledger
      WHERE CAST(timestamp AS DATE) >= CURRENT_DATE - INTERVAL '29 days'
      GROUP BY CAST(timestamp AS DATE)
      ORDER BY day
    `);

    const daysList: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      daysList.push(d.toISOString().split('T')[0]);
    }

    const result = daysList.map((dayStr) => {
      const row = (rawData || []).find((r: any) => String(r.day || '').startsWith(dayStr));
      return {
        day: dayStr,
        added: row ? Number(row.stock_added || 0) : 0,
        sold: row ? Number(row.stock_sold || 0) : 0
      };
    });

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// 12. Purchases API Endpoints with Atomic Transactions
app.post('/api/purchases', async (req, res) => {
  try {
    const id = uuidv4();
    const { 
      vendor_name, 
      supplier_name, 
      invoice_number, 
      date, 
      invoice_file_url,
      invoice_url,
      fileUrl,
      invoice_file_base64,
      file_base64,
      total_amount, 
      items 
    } = req.body;

    const rawVendorName = (vendor_name || supplier_name || '').trim();
    if (!rawVendorName) {
      return res.status(400).json({ error: 'Vendor Name is required.' });
    }

    const invoiceNum = (invoice_number || `PUR-${Date.now().toString().slice(-6)}`).trim();
    const purchaseDate = date || new Date().toISOString().split('T')[0];
    const rawItems = Array.isArray(items) ? items : [];

    if (rawItems.length === 0) {
      return res.status(400).json({ error: 'Please include at least one line item in the purchase.' });
    }

    let finalFileUrl = (invoice_file_url || invoice_url || fileUrl || '').trim();

    // If base64 payload is provided, persist it into uploads directory
    const base64Content = invoice_file_base64 || file_base64;
    if (!finalFileUrl && base64Content && typeof base64Content === 'string') {
      try {
        const matches = base64Content.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        let ext = '.png';
        let buffer: Buffer;
        if (matches && matches.length === 3) {
          const mime = matches[1];
          if (mime === 'application/pdf') ext = '.pdf';
          else if (mime === 'image/jpeg') ext = '.jpg';
          else if (mime === 'image/webp') ext = '.webp';
          buffer = Buffer.from(matches[2], 'base64');
        } else {
          buffer = Buffer.from(base64Content, 'base64');
        }
        const filename = `${uuidv4()}${ext}`;
        const targetPath = path.join(UPLOADS_DIR, filename);
        fs.writeFileSync(targetPath, buffer);
        finalFileUrl = `/uploads/${filename}`;
      } catch (err) {
        console.warn('Failed to parse base64 attachment:', err);
      }
    }

    await withTransaction(async (client) => {
      const finalVendorName = rawVendorName;

      // Compute total amount accurately if 0 or undefined
      const calculatedTotal = rawItems.reduce((sum: number, it: any) => {
        const lineTotal = Number(it.total ?? (Number(it.quantity || 1) * Number(it.unit_price || 0)));
        return sum + lineTotal;
      }, 0);
      const finalTotalAmount = Number(total_amount) > 0 ? Number(total_amount) : calculatedTotal;

      await client.query(
        `INSERT INTO purchases (id, vendor_name, invoice_number, date, invoice_file_url, total_amount)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, finalVendorName, invoiceNum, purchaseDate, finalFileUrl, finalTotalAmount]
      );

      for (const item of rawItems) {
        const itemId = uuidv4();
        let matId = item.material_id;
        const qty = Math.max(1, parseInt(String(item.quantity ?? 1), 10) || 1);
        const unitPrice = Math.max(0, Number(item.unit_price ?? 0));
        const lineTotal = Number(item.total ?? (qty * unitPrice));
        
        if (!matId && item.name) {
          matId = uuidv4();
          const sku = `SKU-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
          await client.query(
            `INSERT INTO materials (id, name, sku, category, unit, cost_price, selling_price, stock, min_stock, supplier, location)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [matId, String(item.name).trim(), sku, 'General', 'pcs', unitPrice, Math.max(unitPrice * 1.35, unitPrice), 0, 10, finalVendorName, 'Main Warehouse']
          );
        }

        if (!matId) {
          throw new Error('Line item is missing a valid Material selection or Material Name.');
        }

        await client.query(
          `INSERT INTO purchase_items (id, purchase_id, material_id, quantity, unit_price, total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [itemId, id, matId, qty, unitPrice, lineTotal]
        );
        
        const updateRes = await client.query(
          `UPDATE materials SET stock = stock + $1, cost_price = $2, supplier = COALESCE(NULLIF(supplier, ''), $3) WHERE id = $4 RETURNING stock`,
          [qty, unitPrice, finalVendorName, matId]
        );
        const newStock = updateRes.rows[0]?.stock;

        await client.query(
          `INSERT INTO stock_ledger (id, material_id, movement_type, quantity_changed, balance, reference_id, user_name)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [uuidv4(), matId, 'Purchase-In', qty, newStock, id, req.headers['x-user-role'] || 'Admin']
        );
      }

      await client.query(
        'INSERT INTO audit_logs (id, user_name, action, details) VALUES ($1, $2, $3, $4)',
        [uuidv4(), req.headers['x-user-role'] || 'Admin', 'Purchase Invoice Created', `Saved purchase invoice #${invoiceNum} from ${finalVendorName} with ${rawItems.length} items (Total: $${finalTotalAmount.toFixed(2)})`]
      );
    });

    res.json({ success: true, id });
  } catch (e: any) {
    console.error('[Purchase Save Error]:', e.message || e);
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.get('/api/purchases', async (req, res) => {
  try {
    const purchases = await query('SELECT * FROM purchases ORDER BY date DESC');
    res.json(purchases || []);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.delete('/api/purchases/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const purchase = await queryOne('SELECT * FROM purchases WHERE id = $1', [id]);
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' });
    
    await withTransaction(async (client) => {
      await client.query('DELETE FROM purchase_items WHERE purchase_id = $1', [id]);
      await client.query('DELETE FROM purchases WHERE id = $1', [id]);
      await client.query(
        'INSERT INTO audit_logs (id, user_name, action, details) VALUES ($1, $2, $3, $4)',
        [uuidv4(), req.headers['x-user-role'] || 'System', 'Purchase Deletion', `Deleted purchase: ${purchase.invoice_number}`]
      );
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// 15. Standard File / Document & Invoice Attachment Upload Endpoint
app.post('/api/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message });
    if (!req.file) {
      // Try 'image' or 'invoice' field fallback
      return upload.single('image')(req, res, (err2) => {
        if (err2) return res.status(400).json({ success: false, error: err2.message });
        if (!req.file) {
          return upload.single('invoice')(req, res, (err3) => {
            if (err3) return res.status(400).json({ success: false, error: err3.message });
            if (!req.file) {
              return res.status(400).json({ success: false, error: 'No file uploaded' });
            }
            const fileUrl = `/uploads/${req.file.filename}`;
            res.json({
              success: true,
              fileUrl,
              fileName: req.file.originalname,
              mimeType: req.file.mimetype,
              size: req.file.size
            });
          });
        }
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({
          success: true,
          fileUrl,
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size
        });
      });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      success: true,
      fileUrl,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size
    });
  });
});

// 16. Start Vite / Express Hybrid Server with Non-Blocking Boot Pipeline
async function startServer() {
  // 1. Immediately bind to port so health probes & container ingress succeed
  const httpServer = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PostgreSQL Backend Engine] Server listening immediately on http://0.0.0.0:${PORT}`);
  });

  // 2. Initialize database driver & schema migrations in background
  initDatabase().catch((err) => {
    console.error('[Database Initialization Error]:', err);
  });

  // 3. Vite development middleware or static production serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: { server: httpServer }
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

startServer();

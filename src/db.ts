import pg from 'pg';
import path from 'path';
import { PGlite } from '@electric-sql/pglite';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

export type QueryResult<T = any> = T[] & {
  rows: T[];
  rowCount: number;
};

let pool: pg.Pool | null = null;
let pgliteInstance: PGlite | null = null;
let isInitialized = false;
let initPromise: Promise<void> | null = null;

function wrapQueryResult<T = any>(rows: T[], rowCount?: number): QueryResult<T> {
  const count = typeof rowCount === 'number' ? rowCount : rows.length;
  const result = [...rows] as QueryResult<T>;
  result.rows = rows;
  result.rowCount = count;
  return result;
}

/**
 * Initializes the unified PostgreSQL database driver.
 * Supports production remote PostgreSQL via pg.Pool and local sandboxed/development mode via PGlite v16.
 */
export async function initDatabase(): Promise<void> {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const dbUrl = process.env.DATABASE_URL?.trim();
    const isExplicitRemotePostgres =
      dbUrl &&
      !dbUrl.includes('localhost:5432') &&
      !dbUrl.includes('127.0.0.1:5432');

    if (isExplicitRemotePostgres) {
      let retries = 3;
      let lastError: any = null;

      while (retries > 0) {
        try {
          const testPool = new Pool({
            connectionString: dbUrl,
            ssl: process.env.NODE_ENV === 'production' || dbUrl.includes('supabase') || dbUrl.includes('sslmode=require')
              ? { rejectUnauthorized: false }
              : undefined,
            connectionTimeoutMillis: 5000,
            max: 20,
            idleTimeoutMillis: 30000,
          });

          // Prevent idle client errors from crashing the Node process
          testPool.on('error', (err) => {
            console.error('[PostgreSQL Pool Background Error]:', err.message);
          });

          await testPool.query('SELECT 1');
          pool = testPool;
          console.log('[Database] Successfully connected to remote PostgreSQL via pg.Pool.');
          break;
        } catch (err: any) {
          lastError = err;
          retries--;
          console.warn(`[Database Warning] pg.Pool connection attempt failed (${retries} retries left):`, err.message);
          if (retries > 0) {
            await new Promise((res) => setTimeout(res, 1000));
          }
        }
      }

      if (!pool) {
        console.warn('[Database] Remote PostgreSQL unreachable after retries. Falling back to local PostgreSQL v16 PGlite engine.');
      }
    }

    if (!pool) {
      try {
        const dataDir = path.join(process.cwd(), '.pgdata');
        pgliteInstance = new PGlite(dataDir);
        await pgliteInstance.query('SELECT 1');
        console.log('[Database] Connected to sandboxed PostgreSQL v16 engine (PGlite).');
      } catch (err: any) {
        console.error('[Database Fatal Error] Failed to initialize PGlite engine:', err.message);
        throw err;
      }
    }

    isInitialized = true;
    // Execute schema migrations
    await createTablesAndSeed();
  })();

  return initPromise;
}

/**
 * Standard unified query execution method for PostgreSQL.
 * Returns an array-like QueryResult supporting both array manipulation and `{ rows, rowCount }` destructuring.
 */
export async function query<T = any>(text: string, params: any[] = []): Promise<QueryResult<T>> {
  if (!isInitialized) {
    await initDatabase();
  }

  if (pool) {
    const res = await pool.query(text, params);
    return wrapQueryResult<T>(res.rows as T[], res.rowCount ?? res.rows.length);
  }

  if (pgliteInstance) {
    const res = await pgliteInstance.query(text, params);
    return wrapQueryResult<T>(res.rows as T[], (res as any).affectedRows ?? res.rows.length);
  }

  throw new Error('Database driver is not initialized.');
}

/**
 * Helper to fetch a single row or null.
 */
export async function queryOne<T = any>(text: string, params: any[] = []): Promise<T | null> {
  const res = await query<T>(text, params);
  return res.rows[0] || null;
}

/**
 * Helper wrapper for executing operations inside isolated atomic SQL transactions.
 */
export async function withTransaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  if (!isInitialized) {
    await initDatabase();
  }

  if (pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  if (pgliteInstance) {
    return await pgliteInstance.transaction(async (tx) => {
      const txClient = {
        query: async (sqlText: string, queryParams: any[] = []) => {
          const res = await tx.query(sqlText, queryParams);
          return res;
        }
      };
      return await callback(txClient);
    });
  }

  throw new Error('Database driver is not initialized.');
}

/**
 * Schema migrations for XLNC Exotic Homes PostgreSQL database.
 */
export async function createTablesAndSeed(): Promise<void> {
  try {
    // Users Table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'Sales Associate',
        status TEXT DEFAULT 'active',
        avatar TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure status column exists in case the table already existed
    await query(`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';`);

    // Seed default admin user
    await query(`
      INSERT INTO users (id, email, password_hash, name, role, status)
      VALUES ('admin-uuid-xlnc', 'admin@xlncexotic.com', $1, 'System Admin', 'admin', 'active')
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
    `, [bcrypt.hashSync('admin123', 10)]);

    // Settings Table
    await query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        business_name TEXT DEFAULT 'XLNC Exotic Homes',
        address TEXT,
        contact TEXT,
        tax_id TEXT,
        logo_url TEXT,
        tax_rates TEXT DEFAULT '[]',
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      INSERT INTO settings (id, business_name, address, contact)
      VALUES (1, 'XLNC Exotic Homes', '100 Luxury Way, Beverly Hills, CA', '+1 800 555 XLNC')
      ON CONFLICT (id) DO NOTHING
    `);

    // Ensure suppliers table is dropped and tables use vendor_name
    await query(`DROP TABLE IF EXISTS suppliers CASCADE;`);
    await query(`ALTER TABLE IF EXISTS purchases DROP COLUMN IF EXISTS supplier_id;`);
    await query(`ALTER TABLE IF EXISTS purchases ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(255);`);
    await query(`ALTER TABLE IF EXISTS invoices DROP COLUMN IF EXISTS supplier_id;`);
    await query(`ALTER TABLE IF EXISTS invoices ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(255);`);

    // Categories Table
    await query(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Materials Core Inventory Table
    await query(`
      CREATE TABLE IF NOT EXISTS materials (
        id TEXT PRIMARY KEY,
        sku TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        unit TEXT DEFAULT 'pcs',
        cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (cost_price >= 0),
        selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (selling_price >= 0),
        stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
        min_stock INTEGER NOT NULL DEFAULT 10 CHECK (min_stock >= 0),
        supplier TEXT,
        notes TEXT,
        photo_url TEXT,
        location TEXT DEFAULT 'Main Warehouse',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Stock Ledger Table
    await query(`
      CREATE TABLE IF NOT EXISTS stock_ledger (
        id TEXT PRIMARY KEY,
        material_id TEXT NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
        movement_type TEXT NOT NULL,
        quantity_changed INTEGER NOT NULL,
        balance INTEGER NOT NULL,
        reference_id TEXT,
        user_name TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sales Table
    await query(`
      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        invoice_number TEXT UNIQUE NOT NULL,
        date TEXT,
        customer_name TEXT,
        customer_phone TEXT,
        customer_address TEXT,
        customer_tax_id TEXT,
        payment_mode TEXT,
        subtotal NUMERIC(12, 2) DEFAULT 0.00,
        discount NUMERIC(12, 2) DEFAULT 0.00,
        tax_rate NUMERIC(12, 2) DEFAULT 0.00,
        tax_amount NUMERIC(12, 2) DEFAULT 0.00,
        grand_total NUMERIC(12, 2) DEFAULT 0.00,
        remarks TEXT,
        customer_signature TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sale Items Table
    await query(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id TEXT PRIMARY KEY,
        sale_id TEXT REFERENCES sales(id) ON DELETE CASCADE,
        material_id TEXT REFERENCES materials(id) ON DELETE SET NULL,
        quantity INTEGER NOT NULL,
        unit_price NUMERIC(12, 2) NOT NULL,
        total NUMERIC(12, 2) NOT NULL
      )
    `);

    // Audit Logs Table
    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_name TEXT,
        action TEXT,
        details TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Purchases Table
    await query(`
      CREATE TABLE IF NOT EXISTS purchases (
        id TEXT PRIMARY KEY,
        vendor_name TEXT,
        invoice_number TEXT,
        date TEXT,
        invoice_file_url TEXT,
        total_amount NUMERIC(12, 2) DEFAULT 0.00,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Purchase Items Table
    await query(`
      CREATE TABLE IF NOT EXISTS purchase_items (
        id TEXT PRIMARY KEY,
        purchase_id TEXT REFERENCES purchases(id) ON DELETE CASCADE,
        material_id TEXT REFERENCES materials(id) ON DELETE SET NULL,
        quantity INTEGER NOT NULL,
        unit_price NUMERIC(12, 2) NOT NULL,
        total NUMERIC(12, 2) NOT NULL
      )
    `);

    // Invoices OCR Table
    await query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        invoice_number TEXT,
        vendor_name VARCHAR(255),
        file_name TEXT,
        file_url TEXT,
        parsed_data TEXT NOT NULL DEFAULT '{}',
        status TEXT DEFAULT 'processed',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Performance Indexes
    await query('CREATE INDEX IF NOT EXISTS idx_materials_sku ON materials(sku)');
    await query('CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category)');
    await query('CREATE INDEX IF NOT EXISTS idx_stock_ledger_material ON stock_ledger(material_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_stock_ledger_timestamp ON stock_ledger(timestamp DESC)');
    await query('CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date DESC)');
  } catch (err: any) {
    console.error('[PostgreSQL Schema Init Warning]:', err.message);
  }
}

export function getDatabaseStatus(): { engine: string; mode: string } {
  if (pool) {
    return { engine: 'PostgreSQL', mode: 'Remote (pg.Pool)' };
  }
  if (pgliteInstance) {
    return { engine: 'PostgreSQL v16', mode: 'Sandboxed (PGlite)' };
  }
  return { engine: 'PostgreSQL', mode: 'Uninitialized' };
}

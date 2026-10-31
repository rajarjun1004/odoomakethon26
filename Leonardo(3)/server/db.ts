import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'brightloop.db');
export const db = new Database(dbPath);

// Enable WAL mode for high concurrency and performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password: string, combinedHash: string): boolean {
  try {
    const [salt, key] = combinedHash.split(':');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return key === derivedKey.toString('hex');
  } catch {
    return false;
  }
}

export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length <= 8) {
    return { valid: false, message: 'Password must be more than 8 characters long (at least 9 characters).' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character (e.g. !@#$%^&*).' };
  }
  return { valid: true };
}

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'staff', 'customer')),
      customer_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact_name TEXT,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      billing_address TEXT,
      tax_id TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('Software', 'Add-on', 'Service', 'Hardware')),
      sales_price REAL NOT NULL,
      cost_price REAL NOT NULL,
      notes TEXT,
      is_archived INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      name TEXT NOT NULL,
      additional_price REAL NOT NULL DEFAULT 0,
      sku TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subscription_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      billing_cadence TEXT NOT NULL CHECK(billing_cadence IN ('daily', 'weekly', 'monthly', 'yearly')),
      base_cost REAL NOT NULL,
      min_quantity INTEGER DEFAULT 1,
      valid_from TEXT,
      valid_until TEXT,
      auto_close_on_end INTEGER DEFAULT 1,
      allow_early_close INTEGER DEFAULT 1,
      allow_pause INTEGER DEFAULT 1,
      allow_renew INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quotation_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      validity_days INTEGER DEFAULT 30,
      terms TEXT,
      items_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
    );

    CREATE TABLE IF NOT EXISTS taxes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      rate REAL NOT NULL,
      is_default INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS discounts (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('fixed', 'percentage')),
      value REAL NOT NULL,
      min_purchase_amount REAL DEFAULT 0,
      min_quantity INTEGER DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      usage_limit INTEGER DEFAULT 0,
      times_used INTEGER DEFAULT 0,
      applies_to_product_id TEXT,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS quotations (
      id TEXT PRIMARY KEY,
      quote_number TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      issue_date TEXT NOT NULL,
      valid_until TEXT NOT NULL,
      payment_terms TEXT NOT NULL,
      discount_id TEXT,
      status TEXT NOT NULL CHECK(status IN ('Draft', 'Sent', 'Accepted', 'Rejected', 'Converted')),
      notes TEXT,
      subtotal REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      converted_subscription_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
    );

    CREATE TABLE IF NOT EXISTS quotation_items (
      id TEXT PRIMARY KEY,
      quotation_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      variant_id TEXT,
      description TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      tax_rate REAL DEFAULT 0,
      amount REAL NOT NULL,
      FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      subscription_number TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      start_date TEXT NOT NULL,
      expiry_date TEXT,
      next_billing_date TEXT NOT NULL,
      last_billed_date TEXT,
      billing_cadence TEXT NOT NULL CHECK(billing_cadence IN ('daily', 'weekly', 'monthly', 'yearly')),
      payment_terms TEXT NOT NULL,
      discount_id TEXT,
      status TEXT NOT NULL CHECK(status IN ('Draft', 'Quotation', 'Confirmed', 'Active', 'Paused', 'Closed')),
      notes TEXT,
      subtotal REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
    );

    CREATE TABLE IF NOT EXISTS subscription_items (
      id TEXT PRIMARY KEY,
      subscription_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      variant_id TEXT,
      description TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      tax_rate REAL DEFAULT 0,
      amount REAL NOT NULL,
      FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      subscription_id TEXT,
      customer_id TEXT NOT NULL,
      period_start TEXT,
      period_end TEXT,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Draft', 'Confirmed', 'Paid', 'Cancelled')),
      subtotal REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      balance_due REAL NOT NULL,
      payment_terms TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      product_id TEXT,
      variant_id TEXT,
      description TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      tax_rate REAL DEFAULT 0,
      amount REAL NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      payment_number TEXT UNIQUE NOT NULL,
      invoice_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      reference TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('card', 'bank_account', 'upi')),
      provider TEXT NOT NULL,
      brand TEXT,
      last4 TEXT NOT NULL,
      exp_month INTEGER,
      exp_year INTEGER,
      holder_name TEXT,
      is_default INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payment_allocations (
      id TEXT PRIMARY KEY,
      payment_id TEXT NOT NULL,
      invoice_id TEXT NOT NULL,
      amount REAL NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    );

    CREATE TABLE IF NOT EXISTS payment_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS billing_runs (
      id TEXT PRIMARY KEY,
      run_date TEXT NOT NULL,
      subscriptions_evaluated INTEGER NOT NULL,
      invoices_created INTEGER NOT NULL,
      total_billed_amount REAL NOT NULL,
      status TEXT NOT NULL,
      logs TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Safe schema migrations on payments table
  try { db.exec("ALTER TABLE payments ADD COLUMN status TEXT NOT NULL DEFAULT 'Successful'"); } catch {}
  try { db.exec("ALTER TABLE payments ADD COLUMN refunded_amount REAL DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE payments ADD COLUMN refund_reason TEXT"); } catch {}
  try { db.exec("ALTER TABLE payments ADD COLUMN unallocated_amount REAL DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE payments ADD COLUMN recorded_by TEXT DEFAULT 'Customer'"); } catch {}
  try { db.exec("ALTER TABLE payments ADD COLUMN gateway TEXT DEFAULT 'Credit Card'"); } catch {}

  // Seed default data if database is fresh
  seedInitialData();
  seedPaymentDefaults();
}

export function seedInitialData() {
  const userCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) {
    return; // Already seeded
  }

  const now = new Date().toISOString();
  const todayStr = now.split('T')[0];

  // Default Passwords comply with PDF (>8 chars, uppercase, lowercase, special char)
  // Password: "Brightloop#2026"
  const defaultHash = hashPassword('Brightloop#2026');

  // Insert Default Taxes
  const taxStmt = db.prepare('INSERT INTO taxes (id, name, rate, is_default, is_active) VALUES (?, ?, ?, ?, ?)');
  taxStmt.run('tax_vat20', 'Standard VAT (20%)', 20.0, 1, 1);
  taxStmt.run('tax_gst18', 'GST (18%)', 18.0, 0, 1);
  taxStmt.run('tax_us8', 'US State Sales Tax (8.25%)', 8.25, 0, 1);
  taxStmt.run('tax_zero', 'Zero-Rated / Exempt (0%)', 0.0, 0, 1);

  // Insert Customers
  const customerStmt = db.prepare(`
    INSERT INTO customers (id, name, contact_name, email, phone, billing_address, tax_id, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  customerStmt.run(
    'cust_acme',
    'Acme Global Enterprises',
    'Sarah Jenkins',
    'sarah.jenkins@acme.com',
    '+1 (555) 234-5678',
    '100 Enterprise Way, Suite 400, San Francisco, CA 94105',
    'US-94281726',
    'Key enterprise account with yearly contract.',
    now
  );
  customerStmt.run(
    'cust_techflow',
    'TechFlow Dynamics',
    'Marcus Reed',
    'marcus@techflow.io',
    '+1 (555) 876-5432',
    '45 Innovation Blvd, Floor 2, Austin, TX 78701',
    'US-88392019',
    'Fast-growing mid-market tech customer.',
    now
  );
  customerStmt.run(
    'cust_apex',
    'Apex Artisan Bakery & Retail',
    'Elena Rostova',
    'elena@apexretail.shop',
    '+1 (555) 345-9876',
    '12 Market Street, Seattle, WA 98101',
    'US-55443322',
    'Small retail shop on monthly plan.',
    now
  );

  // Insert Users (Admin, Staff, Customers)
  const userStmt = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, customer_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  // Admin user
  userStmt.run('user_admin', 'Brightloop Administrator', 'admin@brightloop.com', defaultHash, 'admin', null, now);
  // Staff user
  userStmt.run('user_staff', 'Alex Morgan (Operations Rep)', 'staff@brightloop.com', defaultHash, 'staff', null, now);
  // Customer users linked to their respective customer record
  userStmt.run('user_sarah', 'Sarah Jenkins (Acme)', 'sarah.jenkins@acme.com', defaultHash, 'customer', 'cust_acme', now);
  userStmt.run('user_marcus', 'Marcus Reed (TechFlow)', 'marcus@techflow.io', defaultHash, 'customer', 'cust_techflow', now);
  userStmt.run('user_elena', 'Elena Rostova (Apex)', 'elena@apexretail.shop', defaultHash, 'customer', 'cust_apex', now);

  // Insert Products & Variants (incorporating PDF details: Odoo brand adds 560 to price!)
  const productStmt = db.prepare(`
    INSERT INTO products (id, name, type, sales_price, cost_price, notes, is_archived, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const variantStmt = db.prepare(`
    INSERT INTO product_variants (id, product_id, name, additional_price, sku)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Product 1: Core Business ERP Suite
  productStmt.run('prod_core_erp', 'Brightloop Core Business Suite', 'Software', 490.0, 150.0, 'Full cloud ERP with inventory, finance and sales.', 0, now);
  variantStmt.run('var_erp_std', 'prod_core_erp', 'Standard Edition', 0, 'BL-ERP-STD');
  variantStmt.run('var_erp_odoo', 'prod_core_erp', 'Odoo Brand Integration (+560)', 560.0, 'BL-ERP-ODOO');
  variantStmt.run('var_erp_ent', 'prod_core_erp', 'Enterprise Multi-Company (+350)', 350.0, 'BL-ERP-ENT');

  // Product 2: Advanced Analytics & AI Forecaster Add-on
  productStmt.run('prod_analytics', 'Advanced Analytics & Forecasting Add-on', 'Add-on', 190.0, 45.0, 'Automated cashflow prediction and cohort analytics.', 0, now);
  variantStmt.run('var_ana_std', 'prod_analytics', 'Standard Tier (up to 50k events)', 0, 'BL-ADD-ANA1');
  variantStmt.run('var_ana_pro', 'prod_analytics', 'High-Volume Stream (+120)', 120.0, 'BL-ADD-ANA2');

  // Product 3: Dedicated Support & SLA
  productStmt.run('prod_sla', '24/7 Dedicated Technical Account Manager', 'Service', 350.0, 120.0, 'Guaranteed 1-hour SLA response and monthly architectural review.', 0, now);

  // Product 4: Secure Hardware Token Box
  productStmt.run('prod_hw_key', 'Hardware FIDO2 Security Keys (Pack of 5)', 'Hardware', 150.0, 60.0, 'Physical authentication tokens for high-security teams.', 0, now);

  // Insert Subscription Plans
  const planStmt = db.prepare(`
    INSERT INTO subscription_plans (id, name, billing_cadence, base_cost, min_quantity, valid_from, valid_until, auto_close_on_end, allow_early_close, allow_pause, allow_renew, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  planStmt.run('plan_monthly_pro', 'Professional Monthly', 'monthly', 490.0, 1, '2026-01-01', null, 0, 1, 1, 1, 1, now);
  planStmt.run('plan_yearly_ent', 'Enterprise Annual Contract', 'yearly', 4900.0, 1, '2026-01-01', null, 0, 1, 1, 1, 1, now);
  planStmt.run('plan_weekly_trial', 'Weekly Fast-Track Pilot', 'weekly', 150.0, 1, '2026-01-01', '2027-12-31', 1, 1, 0, 1, 1, now);
  planStmt.run('plan_daily_burst', 'Daily High-Compute Pass', 'daily', 45.0, 1, '2026-01-01', null, 1, 1, 0, 0, 1, now);

  // Insert Discounts
  const discountStmt = db.prepare(`
    INSERT INTO discounts (id, code, type, value, min_purchase_amount, min_quantity, start_date, end_date, usage_limit, times_used, applies_to_product_id, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  discountStmt.run('disc_early20', 'EARLYBIRD20', 'percentage', 20.0, 200.0, 1, '2026-01-01', '2027-12-31', 50, 4, null, 1);
  discountStmt.run('disc_seats100', 'SEATS100OFF', 'fixed', 100.0, 500.0, 2, '2026-01-01', '2027-12-31', 100, 2, null, 1);
  discountStmt.run('disc_odoo50', 'ODOOPROMO', 'fixed', 50.0, 300.0, 1, '2026-01-01', '2027-12-31', 25, 1, 'prod_core_erp', 1);

  // Insert Quotation Template
  const templateStmt = db.prepare(`
    INSERT INTO quotation_templates (id, name, plan_id, validity_days, terms, items_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const templateItems = [
    { product_id: 'prod_core_erp', variant_id: 'var_erp_odoo', quantity: 1, unit_price: 1050.0, tax_rate: 20 },
    { product_id: 'prod_analytics', variant_id: 'var_ana_std', quantity: 1, unit_price: 190.0, tax_rate: 20 },
  ];
  templateStmt.run(
    'tmpl_odoo_bundle',
    'Odoo Brand ERP + Analytics Standard Bundle',
    'plan_monthly_pro',
    30,
    'Standard Brightloop Master Services Agreement applies. Net 30 days payment terms upon invoice confirmation.',
    JSON.stringify(templateItems),
    now
  );

  // Insert Seed Active Subscriptions
  const subStmt = db.prepare(`
    INSERT INTO subscriptions (
      id, subscription_number, customer_id, plan_id, start_date, expiry_date,
      next_billing_date, last_billed_date, billing_cadence, payment_terms, discount_id,
      status, notes, subtotal, discount_amount, tax_amount, total_amount, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const subItemStmt = db.prepare(`
    INSERT INTO subscription_items (id, subscription_id, product_id, variant_id, description, quantity, unit_price, tax_rate, amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Sub 1: Acme Corp - Yearly Contract with Odoo variant
  subStmt.run(
    'sub_acme_01',
    'SUB-2026-0001',
    'cust_acme',
    'plan_yearly_ent',
    '2026-01-15',
    '2027-01-15',
    '2027-01-15',
    '2026-01-15',
    'yearly',
    'Net 30',
    'disc_early20',
    'Active',
    'Annual corporate contract with custom SLA.',
    5460.0,
    1092.0,
    873.6,
    5241.6,
    '2026-01-15T10:00:00Z'
  );
  subItemStmt.run('subitem_1_1', 'sub_acme_01', 'prod_core_erp', 'var_erp_odoo', 'Brightloop Core Suite (Odoo Brand)', 1, 1050.0 * 4, 20.0, 4200.0);
  subItemStmt.run('subitem_1_2', 'sub_acme_01', 'prod_sla', null, '24/7 Dedicated TAM & SLA', 1, 1260.0, 20.0, 1260.0);

  // Sub 2: TechFlow Dynamics - Monthly with due date matching current or upcoming date
  // Let's set next_billing_date to today so the billing engine is immediately ready to demonstrate in class!
  subStmt.run(
    'sub_techflow_01',
    'SUB-2026-0002',
    'cust_techflow',
    'plan_monthly_pro',
    '2026-09-01',
    '2027-09-01',
    todayStr,
    '2026-09-01',
    'monthly',
    'Net 15',
    null,
    'Active',
    'Monthly subscription billed on schedule.',
    680.0,
    0,
    136.0,
    816.0,
    '2026-09-01T09:00:00Z'
  );
  subItemStmt.run('subitem_2_1', 'sub_techflow_01', 'prod_core_erp', 'var_erp_std', 'Brightloop Core Suite (Standard)', 1, 490.0, 20.0, 490.0);
  subItemStmt.run('subitem_2_2', 'sub_techflow_01', 'prod_analytics', 'var_ana_std', 'Advanced Analytics Add-on', 1, 190.0, 20.0, 190.0);

  // Sub 3: Apex Retail - Paused / Monthly
  subStmt.run(
    'sub_apex_01',
    'SUB-2026-0003',
    'cust_apex',
    'plan_monthly_pro',
    '2026-08-10',
    null,
    '2026-11-10',
    '2026-10-10',
    'monthly',
    'Due on Receipt',
    null,
    'Active',
    'Retail storefront software.',
    490.0,
    0,
    98.0,
    588.0,
    '2026-08-10T12:00:00Z'
  );
  subItemStmt.run('subitem_3_1', 'sub_apex_01', 'prod_core_erp', 'var_erp_std', 'Brightloop Core Suite (Standard)', 1, 490.0, 20.0, 490.0);

  // Insert Historical Invoices
  const invStmt = db.prepare(`
    INSERT INTO invoices (
      id, invoice_number, subscription_id, customer_id, period_start, period_end,
      issue_date, due_date, status, subtotal, discount_amount, tax_amount,
      total_amount, paid_amount, balance_due, payment_terms, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const invItemStmt = db.prepare(`
    INSERT INTO invoice_items (id, invoice_id, product_id, variant_id, description, quantity, unit_price, tax_rate, amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Invoice 1: Acme Paid
  invStmt.run(
    'inv_2026_001',
    'INV-2026-0001',
    'sub_acme_01',
    'cust_acme',
    '2026-01-15',
    '2027-01-14',
    '2026-01-15',
    '2026-02-14',
    'Paid',
    5460.0,
    1092.0,
    873.6,
    5241.6,
    5241.6,
    0.0,
    'Net 30',
    'Annual subscription kickoff invoice.',
    '2026-01-15T10:05:00Z'
  );
  invItemStmt.run('invitem_1_1', 'inv_2026_001', 'prod_core_erp', 'var_erp_odoo', 'Brightloop Core Suite (Odoo Brand)', 1, 4200.0, 20.0, 4200.0);
  invItemStmt.run('invitem_1_2', 'inv_2026_001', 'prod_sla', null, '24/7 Dedicated TAM & SLA', 1, 1260.0, 20.0, 1260.0);

  // Invoice 2: TechFlow Confirmed & Partially Paid
  invStmt.run(
    'inv_2026_002',
    'INV-2026-0002',
    'sub_techflow_01',
    'cust_techflow',
    '2026-09-01',
    '2026-09-30',
    '2026-09-01',
    '2026-09-16',
    'Paid',
    680.0,
    0,
    136.0,
    816.0,
    816.0,
    0.0,
    'Net 15',
    'Monthly subscription cycle Sept 2026.',
    '2026-09-01T09:10:00Z'
  );
  invItemStmt.run('invitem_2_1', 'inv_2026_002', 'prod_core_erp', 'var_erp_std', 'Brightloop Core Suite (Standard)', 1, 490.0, 20.0, 490.0);
  invItemStmt.run('invitem_2_2', 'inv_2026_002', 'prod_analytics', 'var_ana_std', 'Advanced Analytics Add-on', 1, 190.0, 20.0, 190.0);

  // Invoice 3: Apex Overdue (due date in past, balance > 0)
  invStmt.run(
    'inv_2026_003',
    'INV-2026-0003',
    'sub_apex_01',
    'cust_apex',
    '2026-09-10',
    '2026-10-09',
    '2026-09-10',
    '2026-09-10',
    'Confirmed',
    490.0,
    0,
    98.0,
    588.0,
    200.0,
    388.0,
    'Due on Receipt',
    'Overdue monthly renewal invoice awaiting final payment balance.',
    '2026-09-10T12:05:00Z'
  );
  invItemStmt.run('invitem_3_1', 'inv_2026_003', 'prod_core_erp', 'var_erp_std', 'Brightloop Core Suite (Standard)', 1, 490.0, 20.0, 490.0);

  // Insert Payments
  const payStmt = db.prepare(`
    INSERT INTO payments (id, payment_number, invoice_id, customer_id, amount, payment_date, payment_method, reference, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  payStmt.run('pay_2026_001', 'PAY-2026-0001', 'inv_2026_001', 'cust_acme', 5241.6, '2026-01-20', 'Bank Transfer', 'WIRE-ACH-892110', 'Full payment settled via Wire Transfer.', '2026-01-20T14:30:00Z');
  payStmt.run('pay_2026_002', 'PAY-2026-0002', 'inv_2026_002', 'cust_techflow', 816.0, '2026-09-05', 'Credit Card', 'AUTH-STRIPE-4492', 'Corporate Visa card payment.', '2026-09-05T11:20:00Z');
  payStmt.run('pay_2026_003', 'PAY-2026-0003', 'inv_2026_003', 'cust_apex', 200.0, '2026-09-12', 'Bank Transfer', 'ACH-REF-33291', 'Partial installment payment received.', '2026-09-12T16:00:00Z');

  // Insert a Quotation in Draft/Sent status
  const quoteStmt = db.prepare(`
    INSERT INTO quotations (
      id, quote_number, customer_id, plan_id, issue_date, valid_until,
      payment_terms, discount_id, status, notes, subtotal, discount_amount, tax_amount, total_amount, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  quoteStmt.run(
    'quote_2026_001',
    'QT-2026-0001',
    'cust_techflow',
    'plan_yearly_ent',
    '2026-10-25',
    '2026-11-25',
    'Net 30',
    'disc_seats100',
    'Sent',
    'Proposed upgrade offer to Enterprise Annual tier with Odoo variant included.',
    1240.0,
    100.0,
    228.0,
    1368.0,
    '2026-10-25T15:00:00Z'
  );
  const quoteItemStmt = db.prepare(`
    INSERT INTO quotation_items (id, quotation_id, product_id, variant_id, description, quantity, unit_price, tax_rate, amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  quoteItemStmt.run('qitem_1_1', 'quote_2026_001', 'prod_core_erp', 'var_erp_odoo', 'Brightloop Core Suite (Odoo Brand)', 1, 1050.0, 20.0, 1050.0);
  quoteItemStmt.run('qitem_1_2', 'quote_2026_001', 'prod_analytics', 'var_ana_std', 'Advanced Analytics Add-on', 1, 190.0, 20.0, 190.0);
  // Also seed initial allocations for seeded payments
  const allocStmt = db.prepare(`
    INSERT OR IGNORE INTO payment_allocations (id, payment_id, invoice_id, amount, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  allocStmt.run('alloc_1', 'pay_2026_001', 'inv_2026_001', 5241.6, '2026-01-20T14:30:00Z');
  allocStmt.run('alloc_2', 'pay_2026_002', 'inv_2026_002', 816.0, '2026-09-05T11:20:00Z');
  allocStmt.run('alloc_3', 'pay_2026_003', 'inv_2026_003', 200.0, '2026-09-12T16:00:00Z');
}

export function seedPaymentDefaults() {
  const now = new Date().toISOString();

  // 1. Seed Payment Settings if not present
  const existingSettings = db.prepare("SELECT key FROM payment_settings WHERE key = 'gateways'").get();
  if (!existingSettings) {
    const defaultGateways = [
      {
        id: 'stripe',
        name: 'Credit & Debit Cards (Stripe / Global Cards)',
        type: 'card',
        enabled: true,
        mode: 'test',
        currency: 'USD',
        fee_percent: 2.9,
        fee_fixed: 0.30,
        publishable_key: 'pk_test_brightloop_sim_prod_key',
        secret_key_configured: true,
        supports_refunds: true
      },
      {
        id: 'upi',
        name: 'UPI & Instant NetBanking (Razorpay / Instant Pay)',
        type: 'upi',
        enabled: true,
        mode: 'test',
        currency: 'INR / USD',
        fee_percent: 0.0,
        fee_fixed: 0.0,
        vpa_merchant: 'brightloop.tech@icici',
        merchant_id: 'rzp_test_brightloop882',
        supports_refunds: true
      },
      {
        id: 'wire',
        name: 'Direct Bank Wire / ACH Transfer',
        type: 'bank_account',
        enabled: true,
        mode: 'live',
        currency: 'USD',
        fee_percent: 0.0,
        fee_fixed: 0.0,
        beneficiary: 'Brightloop Technologies Inc.',
        bank_name: 'Silicon Valley Commercial Bank',
        routing_number: '021000021',
        account_number: '9876543210',
        swift_bic: 'SVCBUS33',
        supports_refunds: false
      },
      {
        id: 'check',
        name: 'Corporate Check & Offline Deposit',
        type: 'offline',
        enabled: true,
        mode: 'live',
        currency: 'USD',
        fee_percent: 0.0,
        fee_fixed: 0.0,
        payee: 'Brightloop Technologies Inc.',
        address: '100 Innovation Way, Suite 400, San Francisco, CA 94105',
        supports_refunds: false
      }
    ];

    const defaultDunning = {
      auto_retry: true,
      max_retries: 3,
      retry_interval_days: 2,
      grace_period_days: 7,
      late_fee_percent: 2.5,
      auto_send_receipt: true,
      statement_descriptor: 'BRIGHTLOOP*SAAS'
    };

    db.prepare(`
      INSERT INTO payment_settings (key, value, updated_at) VALUES (?, ?, ?)
    `).run('gateways', JSON.stringify(defaultGateways), now);

    db.prepare(`
      INSERT INTO payment_settings (key, value, updated_at) VALUES (?, ?, ?)
    `).run('dunning', JSON.stringify(defaultDunning), now);
  }

  // 2. Seed default payment methods for sample customers if empty
  const methodCount = db.prepare('SELECT COUNT(*) as count FROM payment_methods').get() as { count: number };
  if (methodCount.count === 0) {
    const pmStmt = db.prepare(`
      INSERT INTO payment_methods (id, customer_id, type, provider, brand, last4, exp_month, exp_year, holder_name, is_default, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Techflow cards
    pmStmt.run('pm_techflow_1', 'cust_techflow', 'card', 'Stripe', 'Visa', '4242', 12, 2028, 'Sarah Lin', 1, now);
    pmStmt.run('pm_techflow_2', 'cust_techflow', 'card', 'Stripe', 'Mastercard', '5555', 8, 2029, 'Sarah Lin', 0, now);
    pmStmt.run('pm_techflow_3', 'cust_techflow', 'upi', 'Razorpay UPI', 'UPI', 'sarah@okaxis', null, null, 'TechFlow Solutions', 0, now);

    // Acme card
    pmStmt.run('pm_acme_1', 'cust_acme', 'card', 'Stripe', 'American Express', '8821', 10, 2027, 'John Doe', 1, now);
    pmStmt.run('pm_acme_2', 'cust_acme', 'bank_account', 'ACH', 'Bank Account', '6789', null, null, 'Acme Corp Commercial', 0, now);

    // Apex card
    pmStmt.run('pm_apex_1', 'cust_apex', 'card', 'Stripe', 'Visa', '1111', 5, 2028, 'Marcus Vance', 1, now);
  }
}

export function resetAndReSeed() {
  db.exec(`
    DELETE FROM sessions;
    DELETE FROM payment_allocations;
    DELETE FROM payment_methods;
    DELETE FROM payment_settings;
    DELETE FROM payments;
    DELETE FROM invoice_items;
    DELETE FROM invoices;
    DELETE FROM subscription_items;
    DELETE FROM subscriptions;
    DELETE FROM quotation_items;
    DELETE FROM quotations;
    DELETE FROM quotation_templates;
    DELETE FROM subscription_plans;
    DELETE FROM discounts;
    DELETE FROM taxes;
    DELETE FROM product_variants;
    DELETE FROM products;
    DELETE FROM password_resets;
    DELETE FROM users;
    DELETE FROM customers;
    DELETE FROM billing_runs;
  `);
  seedInitialData();
  seedPaymentDefaults();
}

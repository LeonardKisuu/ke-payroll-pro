import { createClient } from '@libsql/client';

async function migrate() {
  const client = createClient({
    url: process.env.DATABASE_URL || 'file:local.db',
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  console.log('🔄 Running migrations for KE Payroll Pro...\n');

  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS organisations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      kra_pin TEXT,
      logo_url TEXT,
      primary_color TEXT DEFAULT '#1B3A6B',
      secondary_color TEXT DEFAULT '#C9A046',
      address TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_no TEXT NOT NULL,
      full_name TEXT NOT NULL,
      id_number TEXT NOT NULL UNIQUE,
      kra_pin TEXT UNIQUE,
      nssf_no TEXT,
      nhif_no TEXT,
      department TEXT,
      designation TEXT,
      date_of_joining TEXT,
      basic_salary REAL NOT NULL DEFAULT 0,
      house_allowance REAL DEFAULT 0,
      commuter_allowance REAL DEFAULT 0,
      car_allowance REAL DEFAULT 0,
      other_allowances REAL DEFAULT 0,
      bonus_pay REAL DEFAULT 0,
      leave_pay REAL DEFAULT 0,
      leave_deduction REAL DEFAULT 0,
      arrears REAL DEFAULT 0,
      airtime_benefit REAL DEFAULT 0,
      internet_benefit REAL DEFAULT 0,
      other_fringe_benefits REAL DEFAULT 0,
      bank_name TEXT,
      bank_branch TEXT,
      bank_account_no TEXT,
      bank_code TEXT,
      payment_method TEXT DEFAULT 'bank_transfer',
      org_id INTEGER NOT NULL REFERENCES organisations(id),
      is_active INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS custom_deductions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      deduction_type TEXT NOT NULL DEFAULT 'fixed',
      is_pension_contribution INTEGER DEFAULT 0,
      is_employer_cost INTEGER DEFAULT 0,
      org_id INTEGER NOT NULL REFERENCES organisations(id),
      is_active INTEGER DEFAULT 1,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS employee_custom_deductions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL REFERENCES employees(id),
      deduction_id INTEGER NOT NULL REFERENCES custom_deductions(id),
      amount REAL NOT NULL DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      email TEXT,
      role TEXT NOT NULL DEFAULT 'hr',
      org_id INTEGER REFERENCES organisations(id),
      employee_id INTEGER REFERENCES employees(id),
      is_active INTEGER DEFAULT 1,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS payroll_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      org_id INTEGER NOT NULL REFERENCES organisations(id),
      is_final INTEGER DEFAULT 0,
      run_by INTEGER REFERENCES users(id),
      run_at TEXT,
      created_at TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS unique_month_year_org ON payroll_runs(month, year, org_id);

    CREATE TABLE IF NOT EXISTS payroll_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL REFERENCES payroll_runs(id),
      employee_id INTEGER NOT NULL REFERENCES employees(id),
      org_id INTEGER NOT NULL REFERENCES organisations(id),
      employee_no TEXT,
      employee_name TEXT,
      basic_salary REAL DEFAULT 0,
      house_allowance REAL DEFAULT 0,
      commuter_allowance REAL DEFAULT 0,
      car_allowance REAL DEFAULT 0,
      other_allowances REAL DEFAULT 0,
      bonus_pay REAL DEFAULT 0,
      leave_pay REAL DEFAULT 0,
      leave_deduction REAL DEFAULT 0,
      arrears REAL DEFAULT 0,
      gross_pay REAL DEFAULT 0,
      airtime_benefit REAL DEFAULT 0,
      internet_benefit REAL DEFAULT 0,
      other_fringe_benefits REAL DEFAULT 0,
      fringe_benefits REAL DEFAULT 0,
      gross_for_paye REAL DEFAULT 0,
      nssf_employee REAL DEFAULT 0,
      nssf_employer REAL DEFAULT 0,
      shif REAL DEFAULT 0,
      ahl_employee REAL DEFAULT 0,
      ahl_employer REAL DEFAULT 0,
      pension_contributions REAL DEFAULT 0,
      pension_relief REAL DEFAULT 0,
      taxable_income REAL DEFAULT 0,
      paye_gross_tax REAL DEFAULT 0,
      personal_relief REAL DEFAULT 0,
      paye REAL DEFAULT 0,
      custom_deductions_json TEXT,
      custom_deductions_total REAL DEFAULT 0,
      employer_custom_deductions_total REAL DEFAULT 0,
      total_deductions REAL DEFAULT 0,
      net_pay REAL DEFAULT 0,
      nita REAL DEFAULT 50,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_trail (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      org_id INTEGER,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS statutory_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rate_type TEXT NOT NULL,
      rate_key TEXT NOT NULL,
      rate_value REAL NOT NULL,
      effective_from TEXT NOT NULL,
      effective_to TEXT,
      description TEXT,
      created_at TEXT
    );
  `);

  console.log('✅ All tables created/verified successfully.\n');

  // ── ALTER TABLE migrations for existing databases ──────────────────
  console.log('🔄 Running ALTER TABLE migrations...');

  const alterStatements = [
    // Rename transport_allowance → commuter_allowance (employees)
    'ALTER TABLE employees RENAME COLUMN transport_allowance TO commuter_allowance',
    // Add new columns to employees
    'ALTER TABLE employees ADD COLUMN car_allowance REAL DEFAULT 0',
    'ALTER TABLE employees ADD COLUMN bonus_pay REAL DEFAULT 0',
    'ALTER TABLE employees ADD COLUMN leave_pay REAL DEFAULT 0',
    'ALTER TABLE employees ADD COLUMN leave_deduction REAL DEFAULT 0',
    'ALTER TABLE employees ADD COLUMN arrears REAL DEFAULT 0',
    // Rename transport_allowance → commuter_allowance (payroll_records)
    'ALTER TABLE payroll_records RENAME COLUMN transport_allowance TO commuter_allowance',
    // Add new columns to payroll_records
    'ALTER TABLE payroll_records ADD COLUMN car_allowance REAL DEFAULT 0',
    'ALTER TABLE payroll_records ADD COLUMN bonus_pay REAL DEFAULT 0',
    'ALTER TABLE payroll_records ADD COLUMN leave_pay REAL DEFAULT 0',
    'ALTER TABLE payroll_records ADD COLUMN leave_deduction REAL DEFAULT 0',
    'ALTER TABLE payroll_records ADD COLUMN arrears REAL DEFAULT 0',
  ];

  for (const stmt of alterStatements) {
    try {
      await client.execute(stmt);
      console.log(`  ✅ ${stmt.substring(0, 60)}...`);
    } catch (err) {
      // Ignore errors (column already exists or already renamed)
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('duplicate column') || msg.includes('already exists') || msg.includes('no such column')) {
        console.log(`  ⏭️  Skipped (already applied): ${stmt.substring(0, 50)}...`);
      } else {
        console.log(`  ⚠️  ${msg}: ${stmt.substring(0, 50)}...`);
      }
    }
  }

  console.log('✅ ALTER TABLE migrations complete.\n');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});

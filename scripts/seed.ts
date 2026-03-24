import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../drizzle/schema';
import bcrypt from 'bcryptjs';

async function seed() {
  const client = createClient({
    url: process.env.DATABASE_URL || 'file:local.db',
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  const db = drizzle(client, { schema });

  console.log('🌱 Seeding KE Payroll Pro database...\n');

  // ── 1. Create tables ──────────────────────────────────────────────

  console.log('📦 Creating tables...');

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
      transport_allowance REAL DEFAULT 0,
      other_allowances REAL DEFAULT 0,
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
      transport_allowance REAL DEFAULT 0,
      other_allowances REAL DEFAULT 0,
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

  console.log('✅ Tables created\n');

  // ── 2. Seed Organisations ──────────────────────────────────────────

  console.log('🏢 Creating organisations...');

  const now = new Date().toISOString();

  // Org 1: Taxwise Africa (platform owner)
  await db.insert(schema.organisations).values({
    name: 'Taxwise Africa Consulting LLP',
    kraPin: 'P051000001A',
    primaryColor: '#1B3A6B',
    secondaryColor: '#C9A046',
    address: 'Westlands, Nairobi',
    contactEmail: 'info@taxwiseafrica.com',
    contactPhone: '+254 700 000 001',
    isActive: true,
    createdAt: now,
  }).onConflictDoNothing();

  // Org 2: Fortune Container Depot (sample client)
  await db.insert(schema.organisations).values({
    name: 'Fortune Container Depot Ltd',
    kraPin: 'P051234567A',
    primaryColor: '#1E40AF',
    secondaryColor: '#D97706',
    address: 'Mombasa Road, Nairobi',
    contactEmail: 'payroll@fortunecontainer.co.ke',
    contactPhone: '+254 700 123 456',
    isActive: true,
    createdAt: now,
  }).onConflictDoNothing();

  console.log('✅ Organisations created\n');

  // ── 3. Seed Employees (for Fortune Container, org 2) ──────────────

  console.log('👥 Creating employees...');

  const employeeData = [
    {
      employeeNo: 'FCD001',
      fullName: 'John Kamau',
      idNumber: '12345678',
      kraPin: 'A001234567B',
      nssfNo: 'NSS100001',
      nhifNo: 'NHIF100001',
      department: 'Operations',
      designation: 'Logistics Manager',
      dateOfJoining: '2022-03-15',
      basicSalary: 85000,
      houseAllowance: 15000,
      transportAllowance: 8000,
      otherAllowances: 0,
      airtimeBenefit: 0,
      internetBenefit: 0,
      otherFringeBenefits: 0,
      bankName: 'KCB Bank',
      bankBranch: 'Westlands',
      bankAccountNo: '1234567890',
      bankCode: '01',
      paymentMethod: 'bank_transfer',
      orgId: 2,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      employeeNo: 'FCD002',
      fullName: 'Mary Wanjiku',
      idNumber: '23456789',
      kraPin: 'A002345678C',
      nssfNo: 'NSS100002',
      nhifNo: 'NHIF100002',
      department: 'Finance',
      designation: 'Accountant',
      dateOfJoining: '2021-06-01',
      basicSalary: 65000,
      houseAllowance: 12000,
      transportAllowance: 5000,
      otherAllowances: 0,
      airtimeBenefit: 0,
      internetBenefit: 0,
      otherFringeBenefits: 0,
      bankName: 'Equity Bank',
      bankBranch: 'CBD',
      bankAccountNo: '2345678901',
      bankCode: '68',
      paymentMethod: 'bank_transfer',
      orgId: 2,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      employeeNo: 'FCD003',
      fullName: 'Peter Odhiambo',
      idNumber: '34567890',
      kraPin: 'A003456789D',
      nssfNo: 'NSS100003',
      nhifNo: 'NHIF100003',
      department: 'Warehouse',
      designation: 'Warehouse Supervisor',
      dateOfJoining: '2023-01-10',
      basicSalary: 45000,
      houseAllowance: 8000,
      transportAllowance: 4000,
      otherAllowances: 0,
      airtimeBenefit: 0,
      internetBenefit: 0,
      otherFringeBenefits: 0,
      bankName: 'Co-operative Bank',
      bankBranch: 'Industrial Area',
      bankAccountNo: '3456789012',
      bankCode: '11',
      paymentMethod: 'bank_transfer',
      orgId: 2,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      employeeNo: 'FCD004',
      fullName: 'Grace Muthoni',
      idNumber: '45678901',
      kraPin: 'A004567890E',
      nssfNo: 'NSS100004',
      nhifNo: 'NHIF100004',
      department: 'Management',
      designation: 'General Manager',
      dateOfJoining: '2020-09-01',
      basicSalary: 120000,
      houseAllowance: 25000,
      transportAllowance: 10000,
      otherAllowances: 0,
      airtimeBenefit: 3000,
      internetBenefit: 0,
      otherFringeBenefits: 0,
      bankName: 'NCBA Bank',
      bankBranch: 'Upper Hill',
      bankAccountNo: '4567890123',
      bankCode: '07',
      paymentMethod: 'bank_transfer',
      orgId: 2,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      employeeNo: 'FCD005',
      fullName: 'James Kiprop',
      idNumber: '56789012',
      kraPin: 'A005678901F',
      nssfNo: 'NSS100005',
      nhifNo: 'NHIF100005',
      department: 'Warehouse',
      designation: 'Stores Clerk',
      dateOfJoining: '2024-02-20',
      basicSalary: 35000,
      houseAllowance: 5000,
      transportAllowance: 3000,
      otherAllowances: 0,
      airtimeBenefit: 0,
      internetBenefit: 0,
      otherFringeBenefits: 0,
      bankName: 'M-Pesa',
      bankBranch: '',
      bankAccountNo: '0712345678',
      bankCode: '',
      paymentMethod: 'mpesa',
      orgId: 2,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const emp of employeeData) {
    await db.insert(schema.employees).values(emp).onConflictDoNothing();
  }

  console.log('✅ 5 employees created\n');

  // ── 4. Seed Custom Deductions ──────────────────────────────────────

  console.log('💰 Creating custom deductions...');

  await db.insert(schema.customDeductions).values({
    name: 'HELB Loan',
    description: 'Higher Education Loans Board repayment',
    deductionType: 'fixed',
    isPensionContribution: false,
    isEmployerCost: false,
    orgId: 2,
    isActive: true,
    createdAt: now,
  }).onConflictDoNothing();

  await db.insert(schema.customDeductions).values({
    name: 'SACCO Contribution',
    description: 'Staff SACCO savings contribution',
    deductionType: 'fixed',
    isPensionContribution: true,
    isEmployerCost: false,
    orgId: 2,
    isActive: true,
    createdAt: now,
  }).onConflictDoNothing();

  console.log('✅ Custom deductions created\n');

  // ── 5. Assign deductions to employees ─────────────────────────────

  console.log('🔗 Assigning deductions to employees...');

  // HELB → John Kamau (employee 1, deduction 1)
  await db.insert(schema.employeeCustomDeductions).values({
    employeeId: 1,
    deductionId: 1,
    amount: 3000,
    isActive: true,
  }).onConflictDoNothing();

  // SACCO → Mary Wanjiku (employee 2, deduction 2)
  await db.insert(schema.employeeCustomDeductions).values({
    employeeId: 2,
    deductionId: 2,
    amount: 5000,
    isActive: true,
  }).onConflictDoNothing();

  // SACCO → Grace Muthoni (employee 4, deduction 2)
  await db.insert(schema.employeeCustomDeductions).values({
    employeeId: 4,
    deductionId: 2,
    amount: 5000,
    isActive: true,
  }).onConflictDoNothing();

  console.log('✅ Deductions assigned\n');

  // ── 6. Seed Users ──────────────────────────────────────────────────

  console.log('👤 Creating users...');

  const adminHash = await bcrypt.hash('Admin@2026', 12);
  const accountantHash = await bcrypt.hash('Acc@2026', 12);
  const hrHash = await bcrypt.hash('Hr@2026', 12);

  await db.insert(schema.users).values({
    username: 'admin',
    passwordHash: adminHash,
    fullName: 'System Administrator',
    email: 'admin@taxwiseafrica.com',
    role: 'admin',
    orgId: null,
    employeeId: null,
    isActive: true,
    createdAt: now,
  }).onConflictDoNothing();

  await db.insert(schema.users).values({
    username: 'accountant',
    passwordHash: accountantHash,
    fullName: 'Jane Accountant',
    email: 'accountant@taxwiseafrica.com',
    role: 'accountant',
    orgId: 2,
    employeeId: null,
    isActive: true,
    createdAt: now,
  }).onConflictDoNothing();

  await db.insert(schema.users).values({
    username: 'hr',
    passwordHash: hrHash,
    fullName: 'John Kamau',
    email: 'hr@fortunecontainer.co.ke',
    role: 'hr',
    orgId: 2,
    employeeId: 1,
    isActive: true,
    createdAt: now,
  }).onConflictDoNothing();

  console.log('✅ Users created\n');

  // ── 7. Seed default statutory rates ────────────────────────────────

  console.log('📊 Creating default statutory rates...');

  const defaultRates = [
    { key: 'nssf_tier1_limit', value: 9000, desc: 'NSSF Tier I upper limit' },
    { key: 'nssf_tier2_limit', value: 108000, desc: 'NSSF Tier II upper limit' },
    { key: 'nssf_rate', value: 6, desc: 'NSSF rate (%)' },
    { key: 'shif_rate', value: 2.75, desc: 'SHIF rate (%)' },
    { key: 'shif_minimum', value: 300, desc: 'SHIF minimum (KES)' },
    { key: 'ahl_rate', value: 1.5, desc: 'AHL rate (%)' },
    { key: 'personal_relief', value: 2400, desc: 'Personal relief (KES/month)' },
    { key: 'pension_relief_cap', value: 30000, desc: 'Pension relief cap (KES/month)' },
    { key: 'nita', value: 50, desc: 'NITA levy (KES/month)' },
  ];

  for (const rate of defaultRates) {
    await db.insert(schema.statutoryRates).values({
      rateType: 'statutory',
      rateKey: rate.key,
      rateValue: rate.value,
      effectiveFrom: '2026-01-01',
      effectiveTo: null,
      description: rate.desc,
      createdAt: now,
    }).onConflictDoNothing();
  }

  console.log('✅ Statutory rates created\n');

  // ── Done ───────────────────────────────────────────────────────────

  console.log('🎉 Seed complete!\n');
  console.log('Default login credentials:');
  console.log('  admin     / Admin@2026   (full access)');
  console.log('  accountant / Acc@2026    (payroll, employees, reports — Fortune Container)');
  console.log('  hr        / Hr@2026      (my payslips only — linked to John Kamau)\n');

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});

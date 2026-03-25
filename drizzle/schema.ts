import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';

// Organisation
export const organisations = sqliteTable('organisations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  kraPin: text('kra_pin'),
  logoUrl: text('logo_url'),
  primaryColor: text('primary_color').default('#1B3A6B'),
  secondaryColor: text('secondary_color').default('#C9A046'),
  address: text('address'),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default('datetime("now")'),
});

// Employee - use real() for all monetary fields
export const employees = sqliteTable('employees', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  employeeNo: text('employee_no').notNull(),
  fullName: text('full_name').notNull(),
  idNumber: text('id_number').notNull().unique(),
  kraPin: text('kra_pin').unique(),
  nssfNo: text('nssf_no'),
  nhifNo: text('nhif_no'),
  department: text('department'),
  designation: text('designation'),
  dateOfJoining: text('date_of_joining'),
  basicSalary: real('basic_salary').notNull().default(0),
  houseAllowance: real('house_allowance').default(0),
  commuterAllowance: real('commuter_allowance').default(0),
  carAllowance: real('car_allowance').default(0),
  otherAllowances: real('other_allowances').default(0),
  bonusPay: real('bonus_pay').default(0),
  leavePay: real('leave_pay').default(0),
  leaveDeduction: real('leave_deduction').default(0),
  arrears: real('arrears').default(0),
  airtimeBenefit: real('airtime_benefit').default(0),
  internetBenefit: real('internet_benefit').default(0),
  otherFringeBenefits: real('other_fringe_benefits').default(0),
  bankName: text('bank_name'),
  bankBranch: text('bank_branch'),
  bankAccountNo: text('bank_account_no'),
  bankCode: text('bank_code'),
  paymentMethod: text('payment_method').default('bank_transfer'),
  orgId: integer('org_id').notNull().references(() => organisations.id),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
});

// CustomDeduction
export const customDeductions = sqliteTable('custom_deductions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  deductionType: text('deduction_type', { enum: ['fixed', 'percent'] }).notNull().default('fixed'),
  isPensionContribution: integer('is_pension_contribution', { mode: 'boolean' }).default(false),
  isEmployerCost: integer('is_employer_cost', { mode: 'boolean' }).default(false),
  orgId: integer('org_id').notNull().references(() => organisations.id),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at'),
});

// EmployeeCustomDeduction
export const employeeCustomDeductions = sqliteTable('employee_custom_deductions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  employeeId: integer('employee_id').notNull().references(() => employees.id),
  deductionId: integer('deduction_id').notNull().references(() => customDeductions.id),
  amount: real('amount').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
});

// User - defined before PayrollRun to resolve forward reference
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name'),
  email: text('email'),
  role: text('role', { enum: ['admin', 'accountant', 'hr'] }).notNull().default('hr'),
  orgId: integer('org_id').references(() => organisations.id),
  employeeId: integer('employee_id').references(() => employees.id),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at'),
});

// PayrollRun - with unique constraint on (month, year, orgId)
export const payrollRuns = sqliteTable('payroll_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  orgId: integer('org_id').notNull().references(() => organisations.id),
  isFinal: integer('is_final', { mode: 'boolean' }).default(false),
  runBy: integer('run_by').references(() => users.id),
  runAt: text('run_at'),
  createdAt: text('created_at'),
}, (table) => ({
  uniqueMonthYearOrg: uniqueIndex('unique_month_year_org').on(table.month, table.year, table.orgId),
}));

// PayrollRecord - stores all calculation results
export const payrollRecords = sqliteTable('payroll_records', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  runId: integer('run_id').notNull().references(() => payrollRuns.id),
  employeeId: integer('employee_id').notNull().references(() => employees.id),
  orgId: integer('org_id').notNull().references(() => organisations.id),
  employeeNo: text('employee_no'),
  employeeName: text('employee_name'),
  basicSalary: real('basic_salary').default(0),
  houseAllowance: real('house_allowance').default(0),
  commuterAllowance: real('commuter_allowance').default(0),
  carAllowance: real('car_allowance').default(0),
  otherAllowances: real('other_allowances').default(0),
  bonusPay: real('bonus_pay').default(0),
  leavePay: real('leave_pay').default(0),
  leaveDeduction: real('leave_deduction').default(0),
  arrears: real('arrears').default(0),
  grossPay: real('gross_pay').default(0),
  airtimeBenefit: real('airtime_benefit').default(0),
  internetBenefit: real('internet_benefit').default(0),
  otherFringeBenefits: real('other_fringe_benefits').default(0),
  fringeBenefits: real('fringe_benefits').default(0),
  grossForPaye: real('gross_for_paye').default(0),
  nssfEmployee: real('nssf_employee').default(0),
  nssfEmployer: real('nssf_employer').default(0),
  shif: real('shif').default(0),
  ahlEmployee: real('ahl_employee').default(0),
  ahlEmployer: real('ahl_employer').default(0),
  pensionContributions: real('pension_contributions').default(0),
  pensionRelief: real('pension_relief').default(0),
  taxableIncome: real('taxable_income').default(0),
  payeGrossTax: real('paye_gross_tax').default(0),
  personalRelief: real('personal_relief').default(0),
  paye: real('paye').default(0),
  customDeductionsJson: text('custom_deductions_json'),
  customDeductionsTotal: real('custom_deductions_total').default(0),
  employerCustomDeductionsTotal: real('employer_custom_deductions_total').default(0),
  totalDeductions: real('total_deductions').default(0),
  netPay: real('net_pay').default(0),
  nita: real('nita').default(50),
  createdAt: text('created_at'),
});

// AuditTrail
export const auditTrail = sqliteTable('audit_trail', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: integer('entity_id'),
  details: text('details'),
  orgId: integer('org_id'),
  createdAt: text('created_at'),
});

// StatutoryRates - for editable/effective-dated rates
export const statutoryRates = sqliteTable('statutory_rates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  rateType: text('rate_type').notNull(),
  rateKey: text('rate_key').notNull(),
  rateValue: real('rate_value').notNull(),
  effectiveFrom: text('effective_from').notNull(),
  effectiveTo: text('effective_to'),
  description: text('description'),
  createdAt: text('created_at'),
});

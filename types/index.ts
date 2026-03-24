import type {
  organisations,
  employees,
  customDeductions,
  employeeCustomDeductions,
  payrollRuns,
  payrollRecords,
  users,
  auditTrail,
  statutoryRates,
} from '@/drizzle/schema';

// Inferred select types
export type Organisation = typeof organisations.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type CustomDeduction = typeof customDeductions.$inferSelect;
export type EmployeeCustomDeduction = typeof employeeCustomDeductions.$inferSelect;
export type PayrollRun = typeof payrollRuns.$inferSelect;
export type PayrollRecord = typeof payrollRecords.$inferSelect;
export type User = typeof users.$inferSelect;
export type AuditTrailEntry = typeof auditTrail.$inferSelect;
export type StatutoryRate = typeof statutoryRates.$inferSelect;

// Inferred insert types
export type NewOrganisation = typeof organisations.$inferInsert;
export type NewEmployee = typeof employees.$inferInsert;
export type NewCustomDeduction = typeof customDeductions.$inferInsert;
export type NewEmployeeCustomDeduction = typeof employeeCustomDeductions.$inferInsert;
export type NewPayrollRun = typeof payrollRuns.$inferInsert;
export type NewPayrollRecord = typeof payrollRecords.$inferInsert;
export type NewUser = typeof users.$inferInsert;
export type NewAuditTrailEntry = typeof auditTrail.$inferInsert;
export type NewStatutoryRate = typeof statutoryRates.$inferInsert;

// Session
export interface Session {
  userId: number;
  username: string;
  role: 'admin' | 'accountant' | 'hr';
  orgId: number;
}

// Custom deduction input for payroll calculator
export interface CustomDeductionInput {
  name: string;
  amount: number;
  type: 'fixed' | 'percent';
  isPensionContribution: boolean;
  isEmployerCost: boolean;
}

// Payroll calculator input
export interface PayrollInput {
  employeeId: number;
  employeeNo: string;
  employeeName: string;
  basicSalary: number;
  houseAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
  airtimeBenefit: number;
  internetBenefit: number;
  otherFringeBenefits: number;
  customDeductions: CustomDeductionInput[];
}

// Payroll calculator output
export interface PayrollResult {
  employeeId: number;
  employeeNo: string;
  employeeName: string;
  basicSalary: number;
  houseAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
  grossPay: number;
  airtimeBenefit: number;
  internetBenefit: number;
  otherFringeBenefits: number;
  fringeBenefits: number;
  grossForPaye: number;
  nssfEmployee: number;
  nssfEmployer: number;
  shif: number;
  ahlEmployee: number;
  ahlEmployer: number;
  pensionContributions: number;
  pensionRelief: number;
  taxableIncome: number;
  payeGrossTax: number;
  personalRelief: number;
  paye: number;
  customDeductions: CustomDeductionInput[];
  customDeductionsTotal: number;
  employerCustomDeductionsTotal: number;
  totalDeductions: number;
  netPay: number;
  nita: number;
}

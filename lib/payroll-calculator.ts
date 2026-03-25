/**
 * KE Payroll Pro — Kenyan Statutory Payroll Calculator
 * Implements Finance Act 2023 + 2024 PAYE, NSSF Act 2013 Year 4,
 * SHIF, AHL, Pension Relief (ITA Cap 470 s.22A), and NITA.
 *
 * All monetary values rounded to 2 decimal places.
 */

import { round2 } from './utils';

// ----- STATUTORY CONSTANTS (2026) -----

/** PAYE bands (Finance Act 2023 + 2024 amendments) */
const PAYE_BANDS = [
  { min: 0,       max: 24000,   rate: 0.10  },
  { min: 24001,   max: 32333,   rate: 0.25  },
  { min: 32334,   max: 500000,  rate: 0.30  },
  { min: 500001,  max: 800000,  rate: 0.325 },
  { min: 800001,  max: Infinity, rate: 0.35 },
];

/** Personal Relief: KSh 2,400/month */
const PERSONAL_RELIEF = 2400;

/** NSSF Act 2013, Year 4 (Feb 2026 onwards)
 * Tier I: 6% on earnings up to KSh 9,000
 * Tier II: 6% on earnings KSh 9,001 – 108,000
 */
const NSSF_TIER1_LIMIT = 9000;
const NSSF_TIER2_LIMIT = 108000;
const NSSF_RATE = 0.06;

/** SHIF: 2.75% of gross cash pay, minimum KSh 300 */
const SHIF_RATE = 0.0275;
const SHIF_MINIMUM = 300;

/** AHL: 1.5% employee + 1.5% employer on gross cash pay (uncapped) */
const AHL_RATE = 0.015;

/** Pension Relief cap: KSh 30,000/month minus NSSF employee */
const PENSION_RELIEF_CAP = 30000;

/** NITA: KSh 50/month — employer cost only */
const NITA = 50;

// ---- Custom Deduction input type ----
interface CustomDeductionInput {
  name: string;
  amount: number;
  deductionType: 'fixed' | 'percent';
  isPensionContribution: boolean;
  isEmployerCost: boolean;
}

// ---- Employee input type ----
interface EmployeeInput {
  basicSalary: number;
  houseAllowance: number;
  commuterAllowance: number;
  carAllowance: number;
  otherAllowances: number;
  bonusPay: number;
  leavePay: number;
  leaveDeduction: number;
  arrears: number;
  airtimeBenefit: number;
  internetBenefit: number;
  otherFringeBenefits: number;
}

// ---- Result type ----
export interface PayrollResult {
  basicSalary: number;
  houseAllowance: number;
  commuterAllowance: number;
  carAllowance: number;
  otherAllowances: number;
  bonusPay: number;
  leavePay: number;
  leaveDeduction: number;
  arrears: number;
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
  customDeductions: Array<{ name: string; amount: number; isEmployerCost: boolean }>;
  customDeductionsTotal: number;
  employerCustomDeductionsTotal: number;
  totalDeductions: number;
  netPay: number;
  nita: number;
}

/** Calculate NSSF (employee or employer — same rates) */
function calculateNSSF(grossCashPay: number): number {
  // Tier I: 6% of earnings up to KSh 9,000
  const tier1Earnings = Math.min(grossCashPay, NSSF_TIER1_LIMIT);
  const tier1 = round2(tier1Earnings * NSSF_RATE);

  // Tier II: 6% of earnings between KSh 9,001 and KSh 108,000
  const tier2Earnings = Math.max(0, Math.min(grossCashPay, NSSF_TIER2_LIMIT) - NSSF_TIER1_LIMIT);
  const tier2 = round2(tier2Earnings * NSSF_RATE);

  return round2(tier1 + tier2);
}

/** Calculate SHIF (2.75% of gross cash pay, min KSh 300) */
function calculateSHIF(grossCashPay: number): number {
  if (grossCashPay <= 0) return 0;
  return round2(Math.max(SHIF_MINIMUM, grossCashPay * SHIF_RATE));
}

/** Calculate PAYE using progressive tax bands */
function calculatePAYE(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;

  let tax = 0;
  let remaining = taxableIncome;

  for (const band of PAYE_BANDS) {
    if (remaining <= 0) break;

    const bandWidth = band.max === Infinity ? remaining : (band.max - band.min + 1);
    const taxableInBand = Math.min(remaining, bandWidth);
    tax += taxableInBand * band.rate;
    remaining -= taxableInBand;
  }

  return round2(tax);
}

/**
 * computePayroll — The core statutory payroll calculation function.
 *
 * Follows KRA-mandated calculation order:
 * 1. Gross Cash Pay = Basic + House + Commuter + Car + Other + Bonus + Leave Pay + Arrears - Leave Deduction
 * 2. Fringe Benefits (airtime, internet, other) — added to PAYE gross only
 * 3. NSSF Employee (on gross cash pay)
 * 4. SHIF (on gross cash pay)
 * 5. AHL Employee (on gross cash pay)
 * 6. Pension Relief = min(pension_contributions, max(0, 30000 − NSSF employee))
 * 7. Taxable Income = Gross for PAYE − NSSF − SHIF − AHL − Pension Relief
 * 8. PAYE = bands(Taxable) − Personal Relief (never negative)
 * 9. Net Pay = Gross Cash − NSSF − SHIF − AHL − PAYE − cash custom deductions
 */
export function computePayroll(
  employee: EmployeeInput,
  customDeductions: CustomDeductionInput[] = []
): PayrollResult {
  // Step 1: Gross Cash Pay
  const basicSalary = round2(employee.basicSalary || 0);
  const houseAllowance = round2(employee.houseAllowance || 0);
  const commuterAllowance = round2(employee.commuterAllowance || 0);
  const carAllowance = round2(employee.carAllowance || 0);
  const otherAllowances = round2(employee.otherAllowances || 0);
  const bonusPay = round2(employee.bonusPay || 0);
  const leavePay = round2(employee.leavePay || 0);
  const leaveDeduction = round2(employee.leaveDeduction || 0);
  const arrears = round2(employee.arrears || 0);
  const grossPay = round2(basicSalary + houseAllowance + commuterAllowance + carAllowance + otherAllowances + bonusPay + leavePay + arrears - leaveDeduction);

  // Step 2: Fringe Benefits (added to PAYE gross only, not to net pay calc)
  const airtimeBenefit = round2(employee.airtimeBenefit || 0);
  const internetBenefit = round2(employee.internetBenefit || 0);
  const otherFringeBenefits = round2(employee.otherFringeBenefits || 0);
  const fringeBenefits = round2(airtimeBenefit + internetBenefit + otherFringeBenefits);
  const grossForPaye = round2(grossPay + fringeBenefits);

  // Step 3: NSSF (on gross cash pay)
  const nssfEmployee = calculateNSSF(grossPay);
  const nssfEmployer = calculateNSSF(grossPay);

  // Step 4: SHIF (on gross cash pay)
  const shif = calculateSHIF(grossPay);

  // Step 5: AHL (on gross cash pay)
  const ahlEmployee = round2(grossPay * AHL_RATE);
  const ahlEmployer = round2(grossPay * AHL_RATE);

  // Process custom deductions
  const processedDeductions: Array<{ name: string; amount: number; isEmployerCost: boolean }> = [];
  let pensionContributions = 0;
  let cashCustomDeductionsTotal = 0;
  let employerCustomDeductionsTotal = 0;

  for (const ded of customDeductions) {
    if (!ded.amount || ded.amount <= 0) continue;

    // Calculate actual amount (fixed or percent of gross)
    const actualAmount = ded.deductionType === 'percent'
      ? round2(grossPay * (ded.amount / 100))
      : round2(ded.amount);

    processedDeductions.push({
      name: ded.name,
      amount: actualAmount,
      isEmployerCost: ded.isEmployerCost,
    });

    if (ded.isPensionContribution && !ded.isEmployerCost) {
      pensionContributions += actualAmount;
    }

    if (ded.isEmployerCost) {
      employerCustomDeductionsTotal += actualAmount;
    } else {
      cashCustomDeductionsTotal += actualAmount;
    }
  }

  pensionContributions = round2(pensionContributions);
  cashCustomDeductionsTotal = round2(cashCustomDeductionsTotal);
  employerCustomDeductionsTotal = round2(employerCustomDeductionsTotal);

  // Step 6: Pension Relief = min(pension_contributions, max(0, 30000 − NSSF employee))
  const pensionReliefCap = round2(Math.max(0, PENSION_RELIEF_CAP - nssfEmployee));
  const pensionRelief = round2(Math.min(pensionContributions, pensionReliefCap));

  // Step 7: Taxable Income = Gross for PAYE − NSSF − SHIF − AHL − Pension Relief
  const taxableIncome = round2(Math.max(0, grossForPaye - nssfEmployee - shif - ahlEmployee - pensionRelief));

  // Step 8: PAYE = bands(Taxable) − Personal Relief (never negative)
  const payeGrossTax = calculatePAYE(taxableIncome);
  const personalRelief = PERSONAL_RELIEF;
  const paye = round2(Math.max(0, payeGrossTax - personalRelief));

  // Step 9: Net Pay = Gross Cash − NSSF − SHIF − AHL − PAYE − cash custom deductions
  const totalDeductions = round2(nssfEmployee + shif + ahlEmployee + paye + cashCustomDeductionsTotal);
  const netPay = round2(grossPay - totalDeductions);

  return {
    basicSalary,
    houseAllowance,
    commuterAllowance,
    carAllowance,
    otherAllowances,
    bonusPay,
    leavePay,
    leaveDeduction,
    arrears,
    grossPay,
    airtimeBenefit,
    internetBenefit,
    otherFringeBenefits,
    fringeBenefits,
    grossForPaye,
    nssfEmployee,
    nssfEmployer,
    shif,
    ahlEmployee,
    ahlEmployer,
    pensionContributions,
    pensionRelief,
    taxableIncome,
    payeGrossTax,
    personalRelief,
    paye,
    customDeductions: processedDeductions,
    customDeductionsTotal: cashCustomDeductionsTotal,
    employerCustomDeductionsTotal,
    totalDeductions,
    netPay,
    nita: NITA,
  };
}

// Export constants for use in settings/display
export const STATUTORY_CONSTANTS = {
  PAYE_BANDS,
  PERSONAL_RELIEF,
  NSSF_TIER1_LIMIT,
  NSSF_TIER2_LIMIT,
  NSSF_RATE,
  SHIF_RATE,
  SHIF_MINIMUM,
  AHL_RATE,
  PENSION_RELIEF_CAP,
  NITA,
};

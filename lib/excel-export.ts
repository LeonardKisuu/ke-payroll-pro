import * as XLSX from 'xlsx';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface PayrollRecordRow {
  employeeNo: string | null;
  employeeName: string | null;
  basicSalary: number | null;
  houseAllowance: number | null;
  commuterAllowance: number | null;
  carAllowance: number | null;
  otherAllowances: number | null;
  bonusPay: number | null;
  leavePay: number | null;
  leaveDeduction: number | null;
  arrears: number | null;
  grossPay: number | null;
  airtimeBenefit: number | null;
  internetBenefit: number | null;
  otherFringeBenefits: number | null;
  fringeBenefits: number | null;
  grossForPaye: number | null;
  nssfEmployee: number | null;
  nssfEmployer: number | null;
  shif: number | null;
  ahlEmployee: number | null;
  ahlEmployer: number | null;
  pensionContributions: number | null;
  pensionRelief: number | null;
  taxableIncome: number | null;
  payeGrossTax: number | null;
  personalRelief: number | null;
  paye: number | null;
  customDeductionsTotal: number | null;
  employerCustomDeductionsTotal: number | null;
  totalDeductions: number | null;
  netPay: number | null;
  nita: number | null;
}

interface EmployeeRecord extends PayrollRecordRow {
  kraPin?: string | null;
  nssfNo?: string | null;
  nhifNo?: string | null;
  idNumber?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  bankAccountNo?: string | null;
  bankCode?: string | null;
}

function n(val: number | null | undefined): number {
  return val || 0;
}

function sumCol(records: PayrollRecordRow[], key: keyof PayrollRecordRow): number {
  return records.reduce((sum, r) => sum + n(r[key] as number | null), 0);
}

function createWorkbook(
  sheetName: string,
  titleRows: string[][],
  headers: string[],
  dataRows: (string | number)[][],
  totalsRow: (string | number)[],
  colWidths: number[]
): Buffer {
  const ws: XLSX.WorkSheet = {};
  const allRows = [...titleRows, [], headers, ...dataRows, [], totalsRow];

  const range = { s: { c: 0, r: 0 }, e: { c: headers.length - 1, r: allRows.length - 1 } };

  let rowIdx = 0;
  for (const row of allRows) {
    for (let c = 0; c < row.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ c, r: rowIdx });
      const val = row[c];
      if (typeof val === 'number') {
        ws[cellRef] = { t: 'n', v: val, z: '#,##0.00' };
      } else {
        ws[cellRef] = { t: 's', v: val || '' };
      }
    }
    rowIdx++;
  }

  ws['!ref'] = XLSX.utils.encode_range(range);
  ws['!cols'] = colWidths.map((w) => ({ wch: w }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(buf);
}

export function generateBankSchedule(
  records: EmployeeRecord[],
  orgName: string,
  month: number,
  year: number
): Buffer {
  const title = [
    [orgName],
    ['Bank Payment Schedule'],
    [`Period: ${MONTH_NAMES[month]} ${year}`],
  ];
  const headers = ['No', 'Employee Name', 'Bank Name', 'Branch', 'Account No', 'Bank Code', 'Net Pay'];
  const data = records.map((r, i) => [
    i + 1,
    r.employeeName || '',
    r.bankName || '',
    r.bankBranch || '',
    r.bankAccountNo || '',
    r.bankCode || '',
    n(r.netPay),
  ]);
  const totals = ['', 'TOTAL', '', '', '', '', sumCol(records, 'netPay')];
  const widths = [6, 30, 20, 15, 20, 12, 16];
  return createWorkbook('Bank Schedule', title, headers, data, totals, widths);
}

export function generatePayrollSummary(
  records: EmployeeRecord[],
  orgName: string,
  month: number,
  year: number
): Buffer {
  const title = [
    [orgName],
    ['Full Payroll Summary'],
    [`Period: ${MONTH_NAMES[month]} ${year}`],
  ];
  const headers = [
    'No', 'Emp No', 'Employee Name', 'Basic Salary', 'House Allow.', 'Commuter Allow.',
    'Car Allow.', 'Other Allow.', 'Bonus Pay', 'Leave Pay', 'Leave Ded.', 'Arrears',
    'Gross Pay', 'Fringe Benefits', 'Gross for PAYE',
    'NSSF (Emp)', 'NSSF (Empr)', 'SHIF', 'AHL (Emp)', 'AHL (Empr)',
    'Pension Contrib.', 'Pension Relief', 'Taxable Income', 'PAYE Gross Tax',
    'Personal Relief', 'PAYE', 'Custom Ded.', 'Total Deductions', 'Net Pay', 'NITA',
  ];
  const data = records.map((r, i) => [
    i + 1,
    r.employeeNo || '',
    r.employeeName || '',
    n(r.basicSalary),
    n(r.houseAllowance),
    n(r.commuterAllowance),
    n(r.carAllowance),
    n(r.otherAllowances),
    n(r.bonusPay),
    n(r.leavePay),
    n(r.leaveDeduction),
    n(r.arrears),
    n(r.grossPay),
    n(r.fringeBenefits),
    n(r.grossForPaye),
    n(r.nssfEmployee),
    n(r.nssfEmployer),
    n(r.shif),
    n(r.ahlEmployee),
    n(r.ahlEmployer),
    n(r.pensionContributions),
    n(r.pensionRelief),
    n(r.taxableIncome),
    n(r.payeGrossTax),
    n(r.personalRelief),
    n(r.paye),
    n(r.customDeductionsTotal),
    n(r.totalDeductions),
    n(r.netPay),
    n(r.nita),
  ]);
  const totals = [
    '', '', 'TOTAL',
    sumCol(records, 'basicSalary'),
    sumCol(records, 'houseAllowance'),
    sumCol(records, 'commuterAllowance'),
    sumCol(records, 'carAllowance'),
    sumCol(records, 'otherAllowances'),
    sumCol(records, 'bonusPay'),
    sumCol(records, 'leavePay'),
    sumCol(records, 'leaveDeduction'),
    sumCol(records, 'arrears'),
    sumCol(records, 'grossPay'),
    sumCol(records, 'fringeBenefits'),
    sumCol(records, 'grossForPaye'),
    sumCol(records, 'nssfEmployee'),
    sumCol(records, 'nssfEmployer'),
    sumCol(records, 'shif'),
    sumCol(records, 'ahlEmployee'),
    sumCol(records, 'ahlEmployer'),
    sumCol(records, 'pensionContributions'),
    sumCol(records, 'pensionRelief'),
    sumCol(records, 'taxableIncome'),
    sumCol(records, 'payeGrossTax'),
    sumCol(records, 'personalRelief'),
    sumCol(records, 'paye'),
    sumCol(records, 'customDeductionsTotal'),
    sumCol(records, 'totalDeductions'),
    sumCol(records, 'netPay'),
    sumCol(records, 'nita'),
  ];
  const widths = [
    6, 12, 28, 14, 14, 14, 12, 14, 12, 12, 12, 12, 14, 14, 14, 14, 14, 12, 12, 12, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 10,
  ];
  return createWorkbook('Payroll Summary', title, headers, data, totals, widths);
}

export function generateKRASchedule(
  records: EmployeeRecord[],
  orgName: string,
  month: number,
  year: number
): Buffer {
  const title = [
    [orgName],
    ['KRA PAYE (P10) Schedule'],
    [`Period: ${MONTH_NAMES[month]} ${year}`],
  ];
  const headers = ['No', 'Employee Name', 'KRA PIN', 'Gross Pay', 'Taxable Income', 'PAYE'];
  const data = records.map((r, i) => [
    i + 1,
    r.employeeName || '',
    r.kraPin || '',
    n(r.grossPay),
    n(r.taxableIncome),
    n(r.paye),
  ]);
  const totals = [
    '', 'TOTAL', '',
    sumCol(records, 'grossPay'),
    sumCol(records, 'taxableIncome'),
    sumCol(records, 'paye'),
  ];
  const widths = [6, 30, 16, 16, 16, 16];
  return createWorkbook('KRA P10', title, headers, data, totals, widths);
}

export function generateNSSFSchedule(
  records: EmployeeRecord[],
  orgName: string,
  month: number,
  year: number
): Buffer {
  const title = [
    [orgName],
    ['NSSF Contribution Schedule'],
    [`Period: ${MONTH_NAMES[month]} ${year}`],
  ];
  const headers = ['No', 'Employee Name', 'NSSF No', 'Employee Contribution', 'Employer Contribution', 'Total'];
  const data = records.map((r, i) => [
    i + 1,
    r.employeeName || '',
    r.nssfNo || '',
    n(r.nssfEmployee),
    n(r.nssfEmployer),
    n(r.nssfEmployee) + n(r.nssfEmployer),
  ]);
  const totals = [
    '', 'TOTAL', '',
    sumCol(records, 'nssfEmployee'),
    sumCol(records, 'nssfEmployer'),
    sumCol(records, 'nssfEmployee') + sumCol(records, 'nssfEmployer'),
  ];
  const widths = [6, 30, 16, 20, 20, 16];
  return createWorkbook('NSSF Schedule', title, headers, data, totals, widths);
}

export function generateSHIFSchedule(
  records: EmployeeRecord[],
  orgName: string,
  month: number,
  year: number
): Buffer {
  const title = [
    [orgName],
    ['SHIF Contribution Schedule'],
    [`Period: ${MONTH_NAMES[month]} ${year}`],
  ];
  const headers = ['No', 'Employee Name', 'NHIF/SHIF No', 'Gross Pay', 'SHIF Amount'];
  const data = records.map((r, i) => [
    i + 1,
    r.employeeName || '',
    r.nhifNo || '',
    n(r.grossPay),
    n(r.shif),
  ]);
  const totals = [
    '', 'TOTAL', '',
    sumCol(records, 'grossPay'),
    sumCol(records, 'shif'),
  ];
  const widths = [6, 30, 16, 16, 16];
  return createWorkbook('SHIF Schedule', title, headers, data, totals, widths);
}

export function generateAHLSchedule(
  records: EmployeeRecord[],
  orgName: string,
  month: number,
  year: number
): Buffer {
  const title = [
    [orgName],
    ['AHL (Affordable Housing Levy) Schedule'],
    [`Period: ${MONTH_NAMES[month]} ${year}`],
  ];
  const headers = ['No', 'Employee Name', 'ID Number', 'Gross Pay', 'Employee AHL', 'Employer AHL', 'Total'];
  const data = records.map((r, i) => [
    i + 1,
    r.employeeName || '',
    r.idNumber || '',
    n(r.grossPay),
    n(r.ahlEmployee),
    n(r.ahlEmployer),
    n(r.ahlEmployee) + n(r.ahlEmployer),
  ]);
  const totals = [
    '', 'TOTAL', '',
    sumCol(records, 'grossPay'),
    sumCol(records, 'ahlEmployee'),
    sumCol(records, 'ahlEmployer'),
    sumCol(records, 'ahlEmployee') + sumCol(records, 'ahlEmployer'),
  ];
  const widths = [6, 30, 16, 16, 16, 16, 16];
  return createWorkbook('AHL Schedule', title, headers, data, totals, widths);
}

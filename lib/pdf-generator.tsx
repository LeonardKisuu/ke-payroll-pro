import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// ── Types ──────────────────────────────────────────────────────────────

export interface PayslipData {
  orgName: string;
  orgLogo?: string;
  orgAddress?: string;
  orgContact?: string;
  primaryColor: string;
  secondaryColor: string;
  employeeName: string;
  employeeNo: string;
  idNumber: string;
  kraPin: string;
  nssfNo: string;
  nhifNo: string;
  department: string;
  designation: string;
  bankName: string;
  bankBranch: string;
  bankAccountNo: string;
  month: number;
  year: number;
  basicSalary: number;
  houseAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
  grossPay: number;
  fringeBenefits: number;
  nssfEmployee: number;
  nssfEmployer: number;
  shif: number;
  ahlEmployee: number;
  ahlEmployer: number;
  pensionRelief: number;
  taxableIncome: number;
  payeGrossTax: number;
  personalRelief: number;
  paye: number;
  customDeductions: Array<{ name: string; amount: number }>;
  totalDeductions: number;
  netPay: number;
  nita: number;
}

export interface ReportData {
  orgName: string;
  primaryColor: string;
  secondaryColor: string;
  month: number;
  year: number;
  type: 'summary' | 'kra' | 'nssf' | 'shif' | 'ahl';
  records: Array<Record<string, string | number | null>>;
}

// ── Constants ──────────────────────────────────────────────────────────

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function fmt(n: number): string {
  return n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtKES(n: number): string {
  return `KES ${fmt(n)}`;
}

// ── Payslip Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#333333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  orgName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  payslipTitle: {
    fontSize: 11,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  orgDetail: {
    fontSize: 7,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  periodText: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
  },

  // Employee Details
  detailsSection: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 4,
    border: '1 solid #E9ECEF',
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  detailsCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 7,
    color: '#6C757D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginTop: 1,
  },

  // Section headers
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 5,
    paddingHorizontal: 8,
    color: '#FFFFFF',
    borderRadius: 3,
    marginBottom: 1,
    marginTop: 8,
  },

  // Table
  tableRow: {
    flexDirection: 'row',
    borderBottom: '0.5 solid #E9ECEF',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  tableRowAlt: {
    backgroundColor: '#F8F9FA',
  },
  tableLabel: {
    flex: 3,
    fontSize: 8.5,
  },
  tableValue: {
    flex: 2,
    fontSize: 8.5,
    textAlign: 'right',
  },
  tableLabelBold: {
    flex: 3,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  tableValueBold: {
    flex: 2,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },

  // Summary box
  summaryBox: {
    flexDirection: 'row',
    marginTop: 12,
    borderRadius: 4,
    overflow: 'hidden',
  },
  summaryCell: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
  },
  netPayValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
  },

  // Employer costs
  employerSection: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 4,
    border: '1 solid #E9ECEF',
  },
  employerTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#6C757D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  employerRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  employerLabel: {
    flex: 3,
    fontSize: 8,
    color: '#6C757D',
  },
  employerValue: {
    flex: 2,
    fontSize: 8,
    textAlign: 'right',
    color: '#6C757D',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 7,
    color: '#ADB5BD',
    borderTop: '0.5 solid #E9ECEF',
    paddingTop: 6,
  },

  // Report styles
  reportPage: {
    padding: 30,
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: '#333333',
  },
  reportHeader: {
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
    alignItems: 'center',
  },
  reportTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  reportSubtitle: {
    fontSize: 10,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  reportOrgName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  reportTableHeader: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottom: '1 solid #333',
  },
  reportTableHeaderCell: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#FFFFFF',
  },
  reportTableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottom: '0.5 solid #E9ECEF',
  },
  reportTableCell: {
    fontSize: 7.5,
  },
  reportTableCellRight: {
    fontSize: 7.5,
    textAlign: 'right',
  },
  reportTotalsRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderTop: '1.5 solid #333',
    marginTop: 2,
  },
  reportTotalCell: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  reportTotalCellRight: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    textAlign: 'right',
  },
  reportFooter: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 7,
    color: '#ADB5BD',
    borderTop: '0.5 solid #E9ECEF',
    paddingTop: 6,
  },
});

// ══════════════════════════════════════════════════════════════════════
// PAYSLIP DOCUMENT
// ══════════════════════════════════════════════════════════════════════

export function PayslipDocument({ data }: { data: PayslipData }) {
  const primaryColor = data.primaryColor || '#1B3A6B';
  const secondaryColor = data.secondaryColor || '#C9A046';
  const period = `${MONTH_NAMES[data.month]} ${data.year}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: primaryColor }]}>
          <View style={styles.headerLeft}>
            <Text style={styles.orgName}>{data.orgName}</Text>
            <Text style={styles.payslipTitle}>PAYSLIP</Text>
            {data.orgAddress && <Text style={styles.orgDetail}>{data.orgAddress}</Text>}
            {data.orgContact && <Text style={styles.orgDetail}>{data.orgContact}</Text>}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.periodText}>{period}</Text>
          </View>
        </View>

        {/* Employee Details */}
        <View style={styles.detailsSection}>
          <View style={styles.detailsRow}>
            <View style={styles.detailsCol}>
              <Text style={styles.detailLabel}>Employee Name</Text>
              <Text style={styles.detailValue}>{data.employeeName}</Text>
            </View>
            <View style={styles.detailsCol}>
              <Text style={styles.detailLabel}>Employee No</Text>
              <Text style={styles.detailValue}>{data.employeeNo}</Text>
            </View>
            <View style={styles.detailsCol}>
              <Text style={styles.detailLabel}>ID Number</Text>
              <Text style={styles.detailValue}>{data.idNumber}</Text>
            </View>
          </View>
          <View style={styles.detailsRow}>
            <View style={styles.detailsCol}>
              <Text style={styles.detailLabel}>KRA PIN</Text>
              <Text style={styles.detailValue}>{data.kraPin || '—'}</Text>
            </View>
            <View style={styles.detailsCol}>
              <Text style={styles.detailLabel}>NSSF No</Text>
              <Text style={styles.detailValue}>{data.nssfNo || '—'}</Text>
            </View>
            <View style={styles.detailsCol}>
              <Text style={styles.detailLabel}>NHIF/SHIF No</Text>
              <Text style={styles.detailValue}>{data.nhifNo || '—'}</Text>
            </View>
          </View>
          <View style={styles.detailsRow}>
            <View style={styles.detailsCol}>
              <Text style={styles.detailLabel}>Department</Text>
              <Text style={styles.detailValue}>{data.department || '—'}</Text>
            </View>
            <View style={styles.detailsCol}>
              <Text style={styles.detailLabel}>Designation</Text>
              <Text style={styles.detailValue}>{data.designation || '—'}</Text>
            </View>
            <View style={styles.detailsCol}>
              <Text style={styles.detailLabel}>Bank</Text>
              <Text style={styles.detailValue}>
                {data.bankName ? `${data.bankName} - ${data.bankAccountNo}` : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Earnings Section */}
        <View style={[styles.sectionTitle, { backgroundColor: primaryColor }]}>
          <Text style={{ color: '#FFFFFF', fontFamily: 'Helvetica-Bold', fontSize: 9 }}>EARNINGS</Text>
        </View>
        <EarningsRow label="Basic Salary" value={data.basicSalary} idx={0} />
        <EarningsRow label="House Allowance" value={data.houseAllowance} idx={1} />
        <EarningsRow label="Transport Allowance" value={data.transportAllowance} idx={2} />
        <EarningsRow label="Other Allowances" value={data.otherAllowances} idx={3} />
        {data.fringeBenefits > 0 && (
          <EarningsRow label="Fringe Benefits (BIK)" value={data.fringeBenefits} idx={4} />
        )}
        <View style={[styles.tableRow, { borderTop: '1 solid #333', borderBottom: '1 solid #333' }]}>
          <Text style={styles.tableLabelBold}>Total Gross Pay</Text>
          <Text style={styles.tableValueBold}>{fmtKES(data.grossPay)}</Text>
        </View>

        {/* Deductions Section */}
        <View style={[styles.sectionTitle, { backgroundColor: primaryColor }]}>
          <Text style={{ color: '#FFFFFF', fontFamily: 'Helvetica-Bold', fontSize: 9 }}>DEDUCTIONS</Text>
        </View>
        <EarningsRow label="NSSF (Employee — 6%)" value={data.nssfEmployee} idx={0} />
        <EarningsRow label="SHIF (2.75%)" value={data.shif} idx={1} />
        <EarningsRow label="AHL (Employee — 1.5%)" value={data.ahlEmployee} idx={2} />
        <EarningsRow label="PAYE (Income Tax)" value={data.paye} idx={3} />
        {data.customDeductions.map((cd, idx) => (
          <EarningsRow key={idx} label={cd.name} value={cd.amount} idx={idx + 4} />
        ))}
        <View style={[styles.tableRow, { borderTop: '1 solid #333', borderBottom: '1 solid #333' }]}>
          <Text style={styles.tableLabelBold}>Total Deductions</Text>
          <Text style={styles.tableValueBold}>{fmtKES(data.totalDeductions)}</Text>
        </View>

        {/* Tax Computation */}
        <View style={[styles.sectionTitle, { backgroundColor: '#6C757D' }]}>
          <Text style={{ color: '#FFFFFF', fontFamily: 'Helvetica-Bold', fontSize: 9 }}>TAX COMPUTATION</Text>
        </View>
        <EarningsRow label="Taxable Income" value={data.taxableIncome} idx={0} />
        <EarningsRow label="PAYE (Gross Tax)" value={data.payeGrossTax} idx={1} />
        <EarningsRow label="Less: Personal Relief" value={data.personalRelief} idx={2} />
        {data.pensionRelief > 0 && (
          <EarningsRow label="Less: Pension Relief" value={data.pensionRelief} idx={3} />
        )}
        <View style={[styles.tableRow, { borderTop: '1 solid #333', borderBottom: 'none' }]}>
          <Text style={styles.tableLabelBold}>Net PAYE Payable</Text>
          <Text style={styles.tableValueBold}>{fmtKES(data.paye)}</Text>
        </View>

        {/* Summary Box */}
        <View style={styles.summaryBox}>
          <View style={[styles.summaryCell, { backgroundColor: '#E9ECEF' }]}>
            <Text style={[styles.summaryLabel, { color: '#6C757D' }]}>Gross Pay</Text>
            <Text style={[styles.summaryValue, { color: '#333' }]}>{fmtKES(data.grossPay)}</Text>
          </View>
          <View style={[styles.summaryCell, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.summaryLabel, { color: '#991B1B' }]}>Total Deductions</Text>
            <Text style={[styles.summaryValue, { color: '#991B1B' }]}>{fmtKES(data.totalDeductions)}</Text>
          </View>
          <View style={[styles.summaryCell, { backgroundColor: primaryColor }]}>
            <Text style={[styles.summaryLabel, { color: '#FFFFFF' }]}>Net Pay</Text>
            <Text style={[styles.netPayValue, { color: secondaryColor }]}>{fmtKES(data.netPay)}</Text>
          </View>
        </View>

        {/* Employer Costs */}
        <View style={styles.employerSection}>
          <Text style={styles.employerTitle}>Employer Statutory Costs</Text>
          <View style={styles.employerRow}>
            <Text style={styles.employerLabel}>NSSF (Employer)</Text>
            <Text style={styles.employerValue}>{fmtKES(data.nssfEmployer)}</Text>
          </View>
          <View style={styles.employerRow}>
            <Text style={styles.employerLabel}>AHL (Employer)</Text>
            <Text style={styles.employerValue}>{fmtKES(data.ahlEmployer)}</Text>
          </View>
          <View style={styles.employerRow}>
            <Text style={styles.employerLabel}>NITA</Text>
            <Text style={styles.employerValue}>{fmtKES(data.nita)}</Text>
          </View>
          <View style={[styles.employerRow, { borderTop: '0.5 solid #CED4DA', paddingTop: 3, marginTop: 2 }]}>
            <Text style={[styles.employerLabel, { fontFamily: 'Helvetica-Bold' }]}>Total Employer Cost</Text>
            <Text style={[styles.employerValue, { fontFamily: 'Helvetica-Bold' }]}>
              {fmtKES(data.nssfEmployer + data.ahlEmployer + data.nita)}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by KE Payroll Pro | Taxwise Africa Consulting LLP | This is a computer-generated document
        </Text>
      </Page>
    </Document>
  );
}

function EarningsRow({ label, value, idx }: { label: string; value: number; idx: number }) {
  return (
    <View style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
      <Text style={styles.tableLabel}>{label}</Text>
      <Text style={styles.tableValue}>{fmtKES(value)}</Text>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════
// REPORT DOCUMENT (Summary / KRA / NSSF / SHIF / AHL)
// ══════════════════════════════════════════════════════════════════════

interface ReportColumn {
  header: string;
  key: string;
  width: number; // flex width
  align: 'left' | 'right';
  format?: 'number';
}

const REPORT_CONFIGS: Record<string, { title: string; columns: ReportColumn[]; totalsKeys: string[] }> = {
  summary: {
    title: 'Payroll Summary Report',
    columns: [
      { header: '#', key: '_idx', width: 3, align: 'left' },
      { header: 'Employee', key: 'employeeName', width: 16, align: 'left' },
      { header: 'Basic', key: 'basicSalary', width: 8, align: 'right', format: 'number' },
      { header: 'Gross', key: 'grossPay', width: 8, align: 'right', format: 'number' },
      { header: 'NSSF', key: 'nssfEmployee', width: 7, align: 'right', format: 'number' },
      { header: 'SHIF', key: 'shif', width: 7, align: 'right', format: 'number' },
      { header: 'AHL', key: 'ahlEmployee', width: 7, align: 'right', format: 'number' },
      { header: 'PAYE', key: 'paye', width: 8, align: 'right', format: 'number' },
      { header: 'Deductions', key: 'totalDeductions', width: 9, align: 'right', format: 'number' },
      { header: 'Net Pay', key: 'netPay', width: 9, align: 'right', format: 'number' },
    ],
    totalsKeys: ['basicSalary', 'grossPay', 'nssfEmployee', 'shif', 'ahlEmployee', 'paye', 'totalDeductions', 'netPay'],
  },
  kra: {
    title: 'KRA PAYE (P10) Schedule',
    columns: [
      { header: '#', key: '_idx', width: 4, align: 'left' },
      { header: 'Employee Name', key: 'employeeName', width: 22, align: 'left' },
      { header: 'KRA PIN', key: 'kraPin', width: 14, align: 'left' },
      { header: 'Gross Pay', key: 'grossPay', width: 14, align: 'right', format: 'number' },
      { header: 'Taxable Income', key: 'taxableIncome', width: 14, align: 'right', format: 'number' },
      { header: 'PAYE', key: 'paye', width: 14, align: 'right', format: 'number' },
    ],
    totalsKeys: ['grossPay', 'taxableIncome', 'paye'],
  },
  nssf: {
    title: 'NSSF Contribution Schedule',
    columns: [
      { header: '#', key: '_idx', width: 4, align: 'left' },
      { header: 'Employee Name', key: 'employeeName', width: 20, align: 'left' },
      { header: 'NSSF No', key: 'nssfNo', width: 14, align: 'left' },
      { header: 'Employee', key: 'nssfEmployee', width: 14, align: 'right', format: 'number' },
      { header: 'Employer', key: 'nssfEmployer', width: 14, align: 'right', format: 'number' },
      { header: 'Total', key: '_nssfTotal', width: 14, align: 'right', format: 'number' },
    ],
    totalsKeys: ['nssfEmployee', 'nssfEmployer', '_nssfTotal'],
  },
  shif: {
    title: 'SHIF Contribution Schedule',
    columns: [
      { header: '#', key: '_idx', width: 5, align: 'left' },
      { header: 'Employee Name', key: 'employeeName', width: 25, align: 'left' },
      { header: 'NHIF/SHIF No', key: 'nhifNo', width: 15, align: 'left' },
      { header: 'Gross Pay', key: 'grossPay', width: 18, align: 'right', format: 'number' },
      { header: 'SHIF Amount', key: 'shif', width: 18, align: 'right', format: 'number' },
    ],
    totalsKeys: ['grossPay', 'shif'],
  },
  ahl: {
    title: 'AHL (Affordable Housing Levy) Schedule',
    columns: [
      { header: '#', key: '_idx', width: 4, align: 'left' },
      { header: 'Employee Name', key: 'employeeName', width: 18, align: 'left' },
      { header: 'ID Number', key: 'idNumber', width: 12, align: 'left' },
      { header: 'Gross Pay', key: 'grossPay', width: 12, align: 'right', format: 'number' },
      { header: 'Employee', key: 'ahlEmployee', width: 12, align: 'right', format: 'number' },
      { header: 'Employer', key: 'ahlEmployer', width: 12, align: 'right', format: 'number' },
      { header: 'Total', key: '_ahlTotal', width: 12, align: 'right', format: 'number' },
    ],
    totalsKeys: ['grossPay', 'ahlEmployee', 'ahlEmployer', '_ahlTotal'],
  },
};

// ══════════════════════════════════════════════════════════════════════
// BULK PAYSLIP DOCUMENT (Multiple payslips, one per page)
// ══════════════════════════════════════════════════════════════════════

export function BulkPayslipDocument({ payslips }: { payslips: PayslipData[] }) {
  return (
    <Document>
      {payslips.map((data, index) => {
        const primaryColor = data.primaryColor || '#1B3A6B';
        const secondaryColor = data.secondaryColor || '#C9A046';
        const period = `${MONTH_NAMES[data.month]} ${data.year}`;

        return (
          <Page key={index} size="A4" style={styles.page}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: primaryColor }]}>
              <View style={styles.headerLeft}>
                <Text style={styles.orgName}>{data.orgName}</Text>
                <Text style={styles.payslipTitle}>PAYSLIP</Text>
                {data.orgAddress && <Text style={styles.orgDetail}>{data.orgAddress}</Text>}
                {data.orgContact && <Text style={styles.orgDetail}>{data.orgContact}</Text>}
              </View>
              <View style={styles.headerRight}>
                <Text style={styles.periodText}>{period}</Text>
              </View>
            </View>

            {/* Employee Details */}
            <View style={styles.detailsSection}>
              <View style={styles.detailsRow}>
                <View style={styles.detailsCol}>
                  <Text style={styles.detailLabel}>Employee Name</Text>
                  <Text style={styles.detailValue}>{data.employeeName}</Text>
                </View>
                <View style={styles.detailsCol}>
                  <Text style={styles.detailLabel}>Employee No</Text>
                  <Text style={styles.detailValue}>{data.employeeNo}</Text>
                </View>
                <View style={styles.detailsCol}>
                  <Text style={styles.detailLabel}>ID Number</Text>
                  <Text style={styles.detailValue}>{data.idNumber}</Text>
                </View>
              </View>
              <View style={styles.detailsRow}>
                <View style={styles.detailsCol}>
                  <Text style={styles.detailLabel}>KRA PIN</Text>
                  <Text style={styles.detailValue}>{data.kraPin || '—'}</Text>
                </View>
                <View style={styles.detailsCol}>
                  <Text style={styles.detailLabel}>NSSF No</Text>
                  <Text style={styles.detailValue}>{data.nssfNo || '—'}</Text>
                </View>
                <View style={styles.detailsCol}>
                  <Text style={styles.detailLabel}>NHIF/SHIF No</Text>
                  <Text style={styles.detailValue}>{data.nhifNo || '—'}</Text>
                </View>
              </View>
              <View style={styles.detailsRow}>
                <View style={styles.detailsCol}>
                  <Text style={styles.detailLabel}>Department</Text>
                  <Text style={styles.detailValue}>{data.department || '—'}</Text>
                </View>
                <View style={styles.detailsCol}>
                  <Text style={styles.detailLabel}>Designation</Text>
                  <Text style={styles.detailValue}>{data.designation || '—'}</Text>
                </View>
                <View style={styles.detailsCol}>
                  <Text style={styles.detailLabel}>Bank</Text>
                  <Text style={styles.detailValue}>
                    {data.bankName ? `${data.bankName} - ${data.bankAccountNo}` : '—'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Earnings Section */}
            <View style={[styles.sectionTitle, { backgroundColor: primaryColor }]}>
              <Text style={{ color: '#FFFFFF', fontFamily: 'Helvetica-Bold', fontSize: 9 }}>EARNINGS</Text>
            </View>
            <EarningsRow label="Basic Salary" value={data.basicSalary} idx={0} />
            <EarningsRow label="House Allowance" value={data.houseAllowance} idx={1} />
            <EarningsRow label="Transport Allowance" value={data.transportAllowance} idx={2} />
            <EarningsRow label="Other Allowances" value={data.otherAllowances} idx={3} />
            {data.fringeBenefits > 0 && (
              <EarningsRow label="Fringe Benefits (BIK)" value={data.fringeBenefits} idx={4} />
            )}
            <View style={[styles.tableRow, { borderTop: '1 solid #333', borderBottom: '1 solid #333' }]}>
              <Text style={styles.tableLabelBold}>Total Gross Pay</Text>
              <Text style={styles.tableValueBold}>{fmtKES(data.grossPay)}</Text>
            </View>

            {/* Deductions Section */}
            <View style={[styles.sectionTitle, { backgroundColor: primaryColor }]}>
              <Text style={{ color: '#FFFFFF', fontFamily: 'Helvetica-Bold', fontSize: 9 }}>DEDUCTIONS</Text>
            </View>
            <EarningsRow label="NSSF (Employee — 6%)" value={data.nssfEmployee} idx={0} />
            <EarningsRow label="SHIF (2.75%)" value={data.shif} idx={1} />
            <EarningsRow label="AHL (Employee — 1.5%)" value={data.ahlEmployee} idx={2} />
            <EarningsRow label="PAYE (Income Tax)" value={data.paye} idx={3} />
            {data.customDeductions.map((cd, idx) => (
              <EarningsRow key={idx} label={cd.name} value={cd.amount} idx={idx + 4} />
            ))}
            <View style={[styles.tableRow, { borderTop: '1 solid #333', borderBottom: '1 solid #333' }]}>
              <Text style={styles.tableLabelBold}>Total Deductions</Text>
              <Text style={styles.tableValueBold}>{fmtKES(data.totalDeductions)}</Text>
            </View>

            {/* Tax Computation */}
            <View style={[styles.sectionTitle, { backgroundColor: '#6C757D' }]}>
              <Text style={{ color: '#FFFFFF', fontFamily: 'Helvetica-Bold', fontSize: 9 }}>TAX COMPUTATION</Text>
            </View>
            <EarningsRow label="Taxable Income" value={data.taxableIncome} idx={0} />
            <EarningsRow label="PAYE (Gross Tax)" value={data.payeGrossTax} idx={1} />
            <EarningsRow label="Less: Personal Relief" value={data.personalRelief} idx={2} />
            {data.pensionRelief > 0 && (
              <EarningsRow label="Less: Pension Relief" value={data.pensionRelief} idx={3} />
            )}
            <View style={[styles.tableRow, { borderTop: '1 solid #333', borderBottom: 'none' }]}>
              <Text style={styles.tableLabelBold}>Net PAYE Payable</Text>
              <Text style={styles.tableValueBold}>{fmtKES(data.paye)}</Text>
            </View>

            {/* Summary Box */}
            <View style={styles.summaryBox}>
              <View style={[styles.summaryCell, { backgroundColor: '#E9ECEF' }]}>
                <Text style={[styles.summaryLabel, { color: '#6C757D' }]}>Gross Pay</Text>
                <Text style={[styles.summaryValue, { color: '#333' }]}>{fmtKES(data.grossPay)}</Text>
              </View>
              <View style={[styles.summaryCell, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.summaryLabel, { color: '#991B1B' }]}>Total Deductions</Text>
                <Text style={[styles.summaryValue, { color: '#991B1B' }]}>{fmtKES(data.totalDeductions)}</Text>
              </View>
              <View style={[styles.summaryCell, { backgroundColor: primaryColor }]}>
                <Text style={[styles.summaryLabel, { color: '#FFFFFF' }]}>Net Pay</Text>
                <Text style={[styles.netPayValue, { color: secondaryColor }]}>{fmtKES(data.netPay)}</Text>
              </View>
            </View>

            {/* Employer Costs */}
            <View style={styles.employerSection}>
              <Text style={styles.employerTitle}>Employer Statutory Costs</Text>
              <View style={styles.employerRow}>
                <Text style={styles.employerLabel}>NSSF (Employer)</Text>
                <Text style={styles.employerValue}>{fmtKES(data.nssfEmployer)}</Text>
              </View>
              <View style={styles.employerRow}>
                <Text style={styles.employerLabel}>AHL (Employer)</Text>
                <Text style={styles.employerValue}>{fmtKES(data.ahlEmployer)}</Text>
              </View>
              <View style={styles.employerRow}>
                <Text style={styles.employerLabel}>NITA</Text>
                <Text style={styles.employerValue}>{fmtKES(data.nita)}</Text>
              </View>
              <View style={[styles.employerRow, { borderTop: '0.5 solid #CED4DA', paddingTop: 3, marginTop: 2 }]}>
                <Text style={[styles.employerLabel, { fontFamily: 'Helvetica-Bold' }]}>Total Employer Cost</Text>
                <Text style={[styles.employerValue, { fontFamily: 'Helvetica-Bold' }]}>
                  {fmtKES(data.nssfEmployer + data.ahlEmployer + data.nita)}
                </Text>
              </View>
            </View>

            {/* Footer */}
            <Text style={styles.footer}>
              Generated by KE Payroll Pro | Taxwise Africa Consulting LLP | This is a computer-generated document
            </Text>
          </Page>
        );
      })}
    </Document>
  );
}

// ══════════════════════════════════════════════════════════════════════
// P9 TAX DEDUCTION CARD (KRA Annual Form)
// ══════════════════════════════════════════════════════════════════════

export interface P9Data {
  orgName: string;
  orgKraPin?: string;
  primaryColor: string;
  secondaryColor: string;
  employeeName: string;
  employeeNo: string;
  kraPin: string;
  idNumber: string;
  year: number;
  monthlyData: Array<{
    month: number;
    basicSalary: number;
    houseAllowance: number;
    transportAllowance: number;
    otherAllowances: number;
    grossPay: number;
    nssfEmployee: number;
    pensionContributions: number;
    pensionRelief: number;
    taxableIncome: number;
    payeGrossTax: number;
    personalRelief: number;
    paye: number;
  }>;
}

const p9Styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 7.5,
    fontFamily: 'Helvetica',
    color: '#333333',
  },
  header: {
    padding: 10,
    borderRadius: 4,
    marginBottom: 12,
    alignItems: 'center',
  },
  title: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 9,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  orgName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  detailsBox: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 4,
    border: '1 solid #E9ECEF',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 6.5,
    color: '#6C757D',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailValue: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    marginTop: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 3,
    borderBottom: '1 solid #333',
  },
  thCell: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3.5,
    paddingHorizontal: 3,
    borderBottom: '0.5 solid #E9ECEF',
  },
  tdCell: {
    fontSize: 7,
    textAlign: 'right',
  },
  tdMonth: {
    fontSize: 7,
    textAlign: 'left',
  },
  totalsRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 3,
    borderTop: '1.5 solid #333',
    marginTop: 1,
  },
  totalCell: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    marginTop: 10,
    marginBottom: 4,
    paddingVertical: 3,
    paddingHorizontal: 6,
    color: '#FFFFFF',
    borderRadius: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 24,
    right: 24,
    textAlign: 'center',
    fontSize: 6.5,
    color: '#ADB5BD',
    borderTop: '0.5 solid #E9ECEF',
    paddingTop: 5,
  },
});

const P9_COLUMNS = [
  { header: 'Month', key: 'month', width: 8, isMonth: true },
  { header: 'Basic\nSalary', key: 'basicSalary', width: 8 },
  { header: 'Housing\nAllow.', key: 'houseAllowance', width: 7 },
  { header: 'Transport\nAllow.', key: 'transportAllowance', width: 7 },
  { header: 'Other\nAllow.', key: 'otherAllowances', width: 7 },
  { header: 'Gross\nPay', key: 'grossPay', width: 8 },
  { header: 'NSSF\n(Employee)', key: 'nssfEmployee', width: 7 },
  { header: 'Pension\nContrib.', key: 'pensionContributions', width: 7 },
  { header: 'Taxable\nIncome', key: 'taxableIncome', width: 8 },
  { header: 'PAYE\n(Gross)', key: 'payeGrossTax', width: 8 },
  { header: 'Personal\nRelief', key: 'personalRelief', width: 7 },
  { header: 'Pension\nRelief', key: 'pensionRelief', width: 7 },
  { header: 'Net\nPAYE', key: 'paye', width: 8 },
];

const P9_TOTAL_KEYS = [
  'basicSalary', 'houseAllowance', 'transportAllowance', 'otherAllowances',
  'grossPay', 'nssfEmployee', 'pensionContributions', 'taxableIncome',
  'payeGrossTax', 'personalRelief', 'pensionRelief', 'paye',
];

export function P9Document({ data }: { data: P9Data }) {
  const primaryColor = data.primaryColor || '#1B3A6B';

  // Calculate totals
  const totals: Record<string, number> = {};
  P9_TOTAL_KEYS.forEach((key) => {
    totals[key] = data.monthlyData.reduce(
      (s, m) => s + ((m as Record<string, unknown>)[key] as number || 0), 0
    );
  });

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={p9Styles.page}>
        {/* Header */}
        <View style={[p9Styles.header, { backgroundColor: primaryColor }]}>
          <Text style={p9Styles.orgName}>{data.orgName}</Text>
          <Text style={p9Styles.title}>P9 — TAX DEDUCTION CARD</Text>
          <Text style={p9Styles.subtitle}>Year of Income: {data.year}</Text>
        </View>

        {/* Employee Details */}
        <View style={p9Styles.detailsBox}>
          <View style={p9Styles.detailRow}>
            <View style={p9Styles.detailCol}>
              <Text style={p9Styles.detailLabel}>Employee Name</Text>
              <Text style={p9Styles.detailValue}>{data.employeeName}</Text>
            </View>
            <View style={p9Styles.detailCol}>
              <Text style={p9Styles.detailLabel}>Employee No</Text>
              <Text style={p9Styles.detailValue}>{data.employeeNo}</Text>
            </View>
            <View style={p9Styles.detailCol}>
              <Text style={p9Styles.detailLabel}>KRA PIN</Text>
              <Text style={p9Styles.detailValue}>{data.kraPin || '—'}</Text>
            </View>
            <View style={p9Styles.detailCol}>
              <Text style={p9Styles.detailLabel}>ID Number</Text>
              <Text style={p9Styles.detailValue}>{data.idNumber || '—'}</Text>
            </View>
            <View style={p9Styles.detailCol}>
              <Text style={p9Styles.detailLabel}>Employer KRA PIN</Text>
              <Text style={p9Styles.detailValue}>{data.orgKraPin || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Section A: Monthly Breakdown */}
        <View style={[p9Styles.sectionTitle, { backgroundColor: primaryColor }]}>
          <Text style={{ color: '#FFFFFF', fontSize: 7.5, fontFamily: 'Helvetica-Bold' }}>
            SECTION A — MONTHLY INCOME AND DEDUCTIONS
          </Text>
        </View>

        {/* Table Header */}
        <View style={[p9Styles.tableHeader, { backgroundColor: primaryColor }]}>
          {P9_COLUMNS.map((col) => (
            <Text key={col.key} style={[p9Styles.thCell, { flex: col.width }]}>
              {col.header}
            </Text>
          ))}
        </View>

        {/* Table Rows */}
        {data.monthlyData.map((row, idx) => (
          <View key={idx} style={[p9Styles.tableRow, idx % 2 === 1 ? { backgroundColor: '#F8F9FA' } : {}]}>
            {P9_COLUMNS.map((col) => {
              if (col.isMonth) {
                return (
                  <Text key={col.key} style={[p9Styles.tdMonth, { flex: col.width }]}>
                    {MONTH_NAMES[row.month]}
                  </Text>
                );
              }
              const val = (row as Record<string, unknown>)[col.key] as number || 0;
              return (
                <Text key={col.key} style={[p9Styles.tdCell, { flex: col.width }]}>
                  {fmt(val)}
                </Text>
              );
            })}
          </View>
        ))}

        {/* Totals Row */}
        <View style={p9Styles.totalsRow}>
          {P9_COLUMNS.map((col, colIdx) => {
            if (col.isMonth) {
              return (
                <Text key={col.key} style={[p9Styles.totalCell, { flex: col.width, textAlign: 'left' }]}>
                  TOTAL
                </Text>
              );
            }
            const val = totals[col.key];
            return (
              <Text key={col.key} style={[p9Styles.totalCell, { flex: col.width }]}>
                {val != null ? fmt(val) : ''}
              </Text>
            );
          })}
        </View>

        {/* Section B: Annual Summary */}
        <View style={[p9Styles.sectionTitle, { backgroundColor: '#6C757D' }]}>
          <Text style={{ color: '#FFFFFF', fontSize: 7.5, fontFamily: 'Helvetica-Bold' }}>
            SECTION B — ANNUAL SUMMARY
          </Text>
        </View>
        <View style={{ padding: 6, backgroundColor: '#F8F9FA', borderRadius: 3, border: '1 solid #E9ECEF' }}>
          <View style={p9Styles.detailRow}>
            <View style={{ flex: 2 }}>
              <Text style={{ fontSize: 7, color: '#6C757D' }}>Total Gross Pay</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', textAlign: 'right' }}>
                {fmtKES(totals.grossPay || 0)}
              </Text>
            </View>
          </View>
          <View style={p9Styles.detailRow}>
            <View style={{ flex: 2 }}>
              <Text style={{ fontSize: 7, color: '#6C757D' }}>Total NSSF Contribution (Employee)</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', textAlign: 'right' }}>
                {fmtKES(totals.nssfEmployee || 0)}
              </Text>
            </View>
          </View>
          <View style={p9Styles.detailRow}>
            <View style={{ flex: 2 }}>
              <Text style={{ fontSize: 7, color: '#6C757D' }}>Total Taxable Income</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', textAlign: 'right' }}>
                {fmtKES(totals.taxableIncome || 0)}
              </Text>
            </View>
          </View>
          <View style={p9Styles.detailRow}>
            <View style={{ flex: 2 }}>
              <Text style={{ fontSize: 7, color: '#6C757D' }}>Total PAYE (Gross Tax)</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', textAlign: 'right' }}>
                {fmtKES(totals.payeGrossTax || 0)}
              </Text>
            </View>
          </View>
          <View style={p9Styles.detailRow}>
            <View style={{ flex: 2 }}>
              <Text style={{ fontSize: 7, color: '#6C757D' }}>Total Personal Relief</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', textAlign: 'right' }}>
                {fmtKES(totals.personalRelief || 0)}
              </Text>
            </View>
          </View>
          <View style={p9Styles.detailRow}>
            <View style={{ flex: 2 }}>
              <Text style={{ fontSize: 7, color: '#6C757D' }}>Total Pension Relief</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', textAlign: 'right' }}>
                {fmtKES(totals.pensionRelief || 0)}
              </Text>
            </View>
          </View>
          <View style={[p9Styles.detailRow, { borderTop: '0.5 solid #CED4DA', paddingTop: 3, marginTop: 2 }]}>
            <View style={{ flex: 2 }}>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1B3A6B' }}>Total Net PAYE Payable</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', textAlign: 'right', color: '#1B3A6B' }}>
                {fmtKES(totals.paye || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={p9Styles.footer}>
          P9 Tax Deduction Card — Generated by KE Payroll Pro | Taxwise Africa Consulting LLP | Year {data.year}
        </Text>
      </Page>
    </Document>
  );
}

// ══════════════════════════════════════════════════════════════════════
// BULK P9 DOCUMENT (Multiple employees, one per page)
// ══════════════════════════════════════════════════════════════════════

export function BulkP9Document({ employees }: { employees: P9Data[] }) {
  return (
    <Document>
      {employees.map((data, empIdx) => {
        const primaryColor = data.primaryColor || '#1B3A6B';

        const totals: Record<string, number> = {};
        P9_TOTAL_KEYS.forEach((key) => {
          totals[key] = data.monthlyData.reduce(
            (s, m) => s + ((m as Record<string, unknown>)[key] as number || 0), 0
          );
        });

        return (
          <Page key={empIdx} size="A4" orientation="landscape" style={p9Styles.page}>
            {/* Header */}
            <View style={[p9Styles.header, { backgroundColor: primaryColor }]}>
              <Text style={p9Styles.orgName}>{data.orgName}</Text>
              <Text style={p9Styles.title}>P9 — TAX DEDUCTION CARD</Text>
              <Text style={p9Styles.subtitle}>Year of Income: {data.year}</Text>
            </View>

            {/* Employee Details */}
            <View style={p9Styles.detailsBox}>
              <View style={p9Styles.detailRow}>
                <View style={p9Styles.detailCol}>
                  <Text style={p9Styles.detailLabel}>Employee Name</Text>
                  <Text style={p9Styles.detailValue}>{data.employeeName}</Text>
                </View>
                <View style={p9Styles.detailCol}>
                  <Text style={p9Styles.detailLabel}>Employee No</Text>
                  <Text style={p9Styles.detailValue}>{data.employeeNo}</Text>
                </View>
                <View style={p9Styles.detailCol}>
                  <Text style={p9Styles.detailLabel}>KRA PIN</Text>
                  <Text style={p9Styles.detailValue}>{data.kraPin || '—'}</Text>
                </View>
                <View style={p9Styles.detailCol}>
                  <Text style={p9Styles.detailLabel}>ID Number</Text>
                  <Text style={p9Styles.detailValue}>{data.idNumber || '—'}</Text>
                </View>
                <View style={p9Styles.detailCol}>
                  <Text style={p9Styles.detailLabel}>Employer KRA PIN</Text>
                  <Text style={p9Styles.detailValue}>{data.orgKraPin || '—'}</Text>
                </View>
              </View>
            </View>

            {/* Section A */}
            <View style={[p9Styles.sectionTitle, { backgroundColor: primaryColor }]}>
              <Text style={{ color: '#FFFFFF', fontSize: 7.5, fontFamily: 'Helvetica-Bold' }}>
                SECTION A — MONTHLY INCOME AND DEDUCTIONS
              </Text>
            </View>
            <View style={[p9Styles.tableHeader, { backgroundColor: primaryColor }]}>
              {P9_COLUMNS.map((col) => (
                <Text key={col.key} style={[p9Styles.thCell, { flex: col.width }]}>
                  {col.header}
                </Text>
              ))}
            </View>
            {data.monthlyData.map((row, idx) => (
              <View key={idx} style={[p9Styles.tableRow, idx % 2 === 1 ? { backgroundColor: '#F8F9FA' } : {}]}>
                {P9_COLUMNS.map((col) => {
                  if (col.isMonth) {
                    return (
                      <Text key={col.key} style={[p9Styles.tdMonth, { flex: col.width }]}>
                        {MONTH_NAMES[row.month]}
                      </Text>
                    );
                  }
                  const val = (row as Record<string, unknown>)[col.key] as number || 0;
                  return (
                    <Text key={col.key} style={[p9Styles.tdCell, { flex: col.width }]}>
                      {fmt(val)}
                    </Text>
                  );
                })}
              </View>
            ))}
            <View style={p9Styles.totalsRow}>
              {P9_COLUMNS.map((col) => {
                if (col.isMonth) {
                  return (
                    <Text key={col.key} style={[p9Styles.totalCell, { flex: col.width, textAlign: 'left' }]}>
                      TOTAL
                    </Text>
                  );
                }
                const val = totals[col.key];
                return (
                  <Text key={col.key} style={[p9Styles.totalCell, { flex: col.width }]}>
                    {val != null ? fmt(val) : ''}
                  </Text>
                );
              })}
            </View>

            {/* Section B */}
            <View style={[p9Styles.sectionTitle, { backgroundColor: '#6C757D' }]}>
              <Text style={{ color: '#FFFFFF', fontSize: 7.5, fontFamily: 'Helvetica-Bold' }}>
                SECTION B — ANNUAL SUMMARY
              </Text>
            </View>
            <View style={{ padding: 6, backgroundColor: '#F8F9FA', borderRadius: 3, border: '1 solid #E9ECEF' }}>
              {[
                ['Total Gross Pay', totals.grossPay],
                ['Total NSSF Contribution (Employee)', totals.nssfEmployee],
                ['Total Taxable Income', totals.taxableIncome],
                ['Total PAYE (Gross Tax)', totals.payeGrossTax],
                ['Total Personal Relief', totals.personalRelief],
                ['Total Pension Relief', totals.pensionRelief],
              ].map(([label, val], i) => (
                <View key={i} style={p9Styles.detailRow}>
                  <View style={{ flex: 2 }}>
                    <Text style={{ fontSize: 7, color: '#6C757D' }}>{label as string}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', textAlign: 'right' }}>
                      {fmtKES((val as number) || 0)}
                    </Text>
                  </View>
                </View>
              ))}
              <View style={[p9Styles.detailRow, { borderTop: '0.5 solid #CED4DA', paddingTop: 3, marginTop: 2 }]}>
                <View style={{ flex: 2 }}>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1B3A6B' }}>Total Net PAYE Payable</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', textAlign: 'right', color: '#1B3A6B' }}>
                    {fmtKES(totals.paye || 0)}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={p9Styles.footer}>
              P9 Tax Deduction Card — Generated by KE Payroll Pro | Taxwise Africa Consulting LLP | Year {data.year}
            </Text>
          </Page>
        );
      })}
    </Document>
  );
}

// ══════════════════════════════════════════════════════════════════════
// REPORT DOCUMENT (Summary / KRA / NSSF / SHIF / AHL)
// ══════════════════════════════════════════════════════════════════════

export function ReportDocument({ data }: { data: ReportData }) {
  const config = REPORT_CONFIGS[data.type];
  if (!config) return null;

  const primaryColor = data.primaryColor || '#1B3A6B';
  const period = `${MONTH_NAMES[data.month]} ${data.year}`;

  // Enrich records with computed fields
  const enriched: Record<string, string | number | null>[] = data.records.map((r, i) => ({
    ...r,
    _idx: i + 1,
    _nssfTotal: (Number(r.nssfEmployee) || 0) + (Number(r.nssfEmployer) || 0),
    _ahlTotal: (Number(r.ahlEmployee) || 0) + (Number(r.ahlEmployer) || 0),
  }));

  // Calculate totals
  const totals: Record<string, number> = {};
  config.totalsKeys.forEach((key) => {
    totals[key] = enriched.reduce((sum, r) => sum + (Number(r[key]) || 0), 0);
  });

  return (
    <Document>
      <Page size="A4" orientation={data.type === 'summary' ? 'landscape' : 'portrait'} style={styles.reportPage}>
        {/* Report Header */}
        <View style={[styles.reportHeader, { backgroundColor: primaryColor }]}>
          <Text style={styles.reportOrgName}>{data.orgName}</Text>
          <Text style={styles.reportTitle}>{config.title}</Text>
          <Text style={styles.reportSubtitle}>Period: {period}</Text>
        </View>

        {/* Table Header */}
        <View style={[styles.reportTableHeader, { backgroundColor: primaryColor }]}>
          {config.columns.map((col) => (
            <Text
              key={col.key}
              style={[
                styles.reportTableHeaderCell,
                { flex: col.width, textAlign: col.align },
              ]}
            >
              {col.header}
            </Text>
          ))}
        </View>

        {/* Table Rows */}
        {enriched.map((row, idx) => (
          <View
            key={idx}
            style={[styles.reportTableRow, idx % 2 === 1 ? { backgroundColor: '#F8F9FA' } : {}]}
          >
            {config.columns.map((col) => {
              const val = row[col.key];
              const display = col.format === 'number' ? fmt(Number(val) || 0) : String(val ?? '');
              return (
                <Text
                  key={col.key}
                  style={[
                    col.align === 'right' ? styles.reportTableCellRight : styles.reportTableCell,
                    { flex: col.width },
                  ]}
                >
                  {display}
                </Text>
              );
            })}
          </View>
        ))}

        {/* Totals Row */}
        <View style={styles.reportTotalsRow}>
          {config.columns.map((col, colIdx) => {
            const isTotal = config.totalsKeys.includes(col.key);
            let display = '';
            if (colIdx === 0) display = '';
            else if (colIdx === 1) display = 'TOTAL';
            else if (isTotal) display = fmt(totals[col.key] || 0);

            return (
              <Text
                key={col.key}
                style={[
                  col.align === 'right' ? styles.reportTotalCellRight : styles.reportTotalCell,
                  { flex: col.width },
                ]}
              >
                {display}
              </Text>
            );
          })}
        </View>

        {/* Record count */}
        <View style={{ marginTop: 10 }}>
          <Text style={{ fontSize: 7, color: '#6C757D' }}>
            Total Records: {enriched.length}
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.reportFooter}>
          Generated by KE Payroll Pro | Taxwise Africa Consulting LLP | {period}
        </Text>
      </Page>
    </Document>
  );
}

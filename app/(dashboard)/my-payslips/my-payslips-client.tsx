'use client';

import { useState } from 'react';
import {
  Download,
  FileText,
  Calendar,
  Banknote,
  TrendingDown,
  Wallet,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface PayslipSummary {
  id: number;
  month: number;
  year: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  basicSalary: number;
  houseAllowance: number;
  commuterAllowance: number;
  carAllowance: number;
  otherAllowances: number;
  bonusPay: number;
  leavePay: number;
  leaveDeduction: number;
  arrears: number;
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
  customDeductionsJson: string | null;
  customDeductionsTotal: number;
  nita: number;
}

interface MyPayslipsClientProps {
  payslips: PayslipSummary[];
  employeeName: string;
  employeeNo: string;
  orgName: string;
}

export function MyPayslipsClient({
  payslips,
  employeeName,
  employeeNo,
  orgName,
}: MyPayslipsClientProps) {
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipSummary | null>(null);

  function downloadPdf(recordId: number) {
    window.open(`/api/payslip/${recordId}`, '_blank');
  }

  function parseCustomDeductions(json: string | null): Array<{ name: string; amount: number }> {
    if (!json) return [];
    try {
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  if (payslips.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">My Payslips</h1>
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p>No payslips found.</p>
          <p className="text-sm mt-2">Payslips will appear here once payroll has been finalised.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Payslips</h1>
        <p className="text-muted-foreground">
          {employeeName} ({employeeNo}) &bull; {orgName}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {payslips.map((p) => (
          <Card
            key={p.id}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedPayslip(p)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#1B3A6B]" />
                  {MONTH_NAMES[p.month]} {p.year}
                </span>
                <Badge variant="secondary">Finalised</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Banknote className="h-3 w-3" /> Gross
                  </p>
                  <p className="text-sm font-semibold">{formatCurrency(p.grossPay)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <TrendingDown className="h-3 w-3" /> Deductions
                  </p>
                  <p className="text-sm font-semibold text-destructive">{formatCurrency(p.totalDeductions)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Wallet className="h-3 w-3" /> Net
                  </p>
                  <p className="text-sm font-bold text-[#1B3A6B]">{formatCurrency(p.netPay)}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadPdf(p.id);
                }}
              >
                <Download className="mr-2 h-3 w-3" />
                Download PDF
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payslip Detail Dialog */}
      <Dialog open={!!selectedPayslip} onOpenChange={(open) => !open && setSelectedPayslip(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedPayslip && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Payslip — {MONTH_NAMES[selectedPayslip.month]} {selectedPayslip.year}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                {/* Earnings */}
                <div>
                  <h3 className="font-semibold text-[#1B3A6B] mb-2">Earnings</h3>
                  <div className="space-y-1">
                    <Row label="Basic Salary" value={selectedPayslip.basicSalary} />
                    <Row label="House Allowance" value={selectedPayslip.houseAllowance} />
                    <Row label="Commuter Allowance" value={selectedPayslip.commuterAllowance} />
                    {selectedPayslip.carAllowance > 0 && (
                      <Row label="Car Allowance" value={selectedPayslip.carAllowance} />
                    )}
                    <Row label="Other Allowances" value={selectedPayslip.otherAllowances} />
                    {selectedPayslip.bonusPay > 0 && (
                      <Row label="Bonus Pay" value={selectedPayslip.bonusPay} />
                    )}
                    {selectedPayslip.leavePay > 0 && (
                      <Row label="Leave Pay" value={selectedPayslip.leavePay} />
                    )}
                    {selectedPayslip.leaveDeduction > 0 && (
                      <Row label="Leave Deduction" value={-selectedPayslip.leaveDeduction} />
                    )}
                    {selectedPayslip.arrears > 0 && (
                      <Row label="Arrears" value={selectedPayslip.arrears} />
                    )}
                    {selectedPayslip.fringeBenefits > 0 && (
                      <Row label="Fringe Benefits" value={selectedPayslip.fringeBenefits} />
                    )}
                    <Separator />
                    <Row label="Gross Pay" value={selectedPayslip.grossPay} bold />
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <h3 className="font-semibold text-[#1B3A6B] mb-2">Deductions</h3>
                  <div className="space-y-1">
                    <Row label="NSSF (Employee)" value={selectedPayslip.nssfEmployee} />
                    <Row label="SHIF" value={selectedPayslip.shif} />
                    <Row label="AHL (Employee)" value={selectedPayslip.ahlEmployee} />
                    <Row label="PAYE" value={selectedPayslip.paye} />
                    {parseCustomDeductions(selectedPayslip.customDeductionsJson).map((cd, i) => (
                      <Row key={i} label={cd.name} value={cd.amount} />
                    ))}
                    <Separator />
                    <Row label="Total Deductions" value={selectedPayslip.totalDeductions} bold />
                  </div>
                </div>

                {/* Tax Computation */}
                <div>
                  <h3 className="font-semibold text-[#1B3A6B] mb-2">Tax Computation</h3>
                  <div className="space-y-1">
                    <Row label="Taxable Income" value={selectedPayslip.taxableIncome} />
                    <Row label="PAYE (Gross Tax)" value={selectedPayslip.payeGrossTax} />
                    <Row label="Personal Relief" value={selectedPayslip.personalRelief} />
                    {selectedPayslip.pensionRelief > 0 && (
                      <Row label="Pension Relief" value={selectedPayslip.pensionRelief} />
                    )}
                    <Row label="Net PAYE" value={selectedPayslip.paye} bold />
                  </div>
                </div>

                {/* Net Pay */}
                <div className="bg-[#1B3A6B] text-white rounded-lg p-4 text-center">
                  <p className="text-sm opacity-80">Net Pay</p>
                  <p className="text-2xl font-bold text-[#C9A046]">
                    {formatCurrency(selectedPayslip.netPay)}
                  </p>
                </div>

                {/* Employer Costs */}
                <div>
                  <h3 className="font-semibold text-muted-foreground mb-2 text-xs uppercase">Employer Costs</h3>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <Row label="NSSF (Employer)" value={selectedPayslip.nssfEmployer} small />
                    <Row label="AHL (Employer)" value={selectedPayslip.ahlEmployer} small />
                    <Row label="NITA" value={selectedPayslip.nita} small />
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => downloadPdf(selectedPayslip.id)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF Payslip
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({
  label,
  value,
  bold = false,
  small = false,
}: {
  label: string;
  value: number;
  bold?: boolean;
  small?: boolean;
}) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold' : ''} ${small ? 'text-xs' : ''}`}>
      <span>{label}</span>
      <span>{formatCurrency(value)}</span>
    </div>
  );
}

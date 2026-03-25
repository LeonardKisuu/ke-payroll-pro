'use client';

import { useState } from 'react';
import { Download, FileText, Loader2, FileDown } from 'lucide-react';
import { toast } from 'sonner';

import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface PayrollRecord {
  id: number;
  employeeId: number;
  employeeNo: string | null;
  employeeName: string | null;
  kraPin?: string | null;
  basicSalary: number | null;
  houseAllowance: number | null;
  transportAllowance: number | null;
  otherAllowances: number | null;
  grossPay: number | null;
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
  totalDeductions: number | null;
  netPay: number | null;
  nita: number | null;
}

interface PayrollRun {
  id: number;
  isFinal: boolean | null;
}

function n(v: number | null | undefined): number {
  return v || 0;
}

function sum(records: PayrollRecord[], key: keyof PayrollRecord): number {
  return records.reduce((s, r) => s + n(r[key] as number | null), 0);
}

interface ReportsClientProps {
  orgId: number;
}

export function ReportsClient({ orgId }: ReportsClientProps) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [run, setRun] = useState<PayrollRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll?month=${month}&year=${year}`);
      if (!res.ok) throw new Error();
      const runs = await res.json();
      if (runs.length === 0) {
        setRecords([]);
        setRun(null);
        setLoaded(true);
        toast.info('No payroll data for this period');
        return;
      }
      const detailRes = await fetch(`/api/payroll/${runs[0].id}`);
      if (!detailRes.ok) throw new Error();
      const detail = await detailRes.json();
      setRun(detail.run);
      setRecords(detail.records);
      setLoaded(true);
    } catch {
      toast.error('Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  }

  function downloadExcel(type: string) {
    window.open(`/api/exports?type=${type}&month=${month}&year=${year}&orgId=${orgId}`, '_blank');
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      {/* Period Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={`${month}`} onValueChange={(v) => setMonth(parseInt(v, 10))}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.slice(1).map((name, i) => (
                    <SelectItem key={i + 1} value={`${i + 1}`}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value, 10) || now.getFullYear())} className="w-28" min={2020} max={2099} />
            </div>
            <Button onClick={loadData} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              Load Report
            </Button>
            {run && (
              <Badge variant={run.isFinal ? 'default' : 'secondary'}>
                {run.isFinal ? 'Finalised' : 'Draft'}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {loaded && records.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>No payroll data for {MONTH_NAMES[month]} {year}</p>
        </div>
      )}

      {records.length > 0 && (
        <Tabs defaultValue="summary">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="summary">Payroll Summary</TabsTrigger>
            <TabsTrigger value="kra">KRA (PAYE)</TabsTrigger>
            <TabsTrigger value="nssf">NSSF</TabsTrigger>
            <TabsTrigger value="shif">SHIF</TabsTrigger>
            <TabsTrigger value="ahl">AHL</TabsTrigger>
            <TabsTrigger value="p9">P9 Tax Card</TabsTrigger>
          </TabsList>

          {/* PAYROLL SUMMARY */}
          <TabsContent value="summary">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Full Payroll Summary — {MONTH_NAMES[month]} {year}</CardTitle>
                <Button variant="outline" size="sm" onClick={() => downloadExcel('summary')}>
                  <Download className="mr-2 h-4 w-4" />Excel
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Emp No</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Basic</TableHead>
                        <TableHead className="text-right">Gross</TableHead>
                        <TableHead className="text-right">NSSF</TableHead>
                        <TableHead className="text-right">SHIF</TableHead>
                        <TableHead className="text-right">AHL</TableHead>
                        <TableHead className="text-right">Taxable</TableHead>
                        <TableHead className="text-right">PAYE</TableHead>
                        <TableHead className="text-right">Ded.</TableHead>
                        <TableHead className="text-right">Net Pay</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.employeeNo}</TableCell>
                          <TableCell>{r.employeeName}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(n(r.basicSalary))}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(n(r.grossPay))}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(n(r.nssfEmployee))}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(n(r.shif))}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(n(r.ahlEmployee))}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(n(r.taxableIncome))}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(n(r.paye))}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(n(r.totalDeductions))}</TableCell>
                          <TableCell className="text-right font-mono font-bold">{formatCurrency(n(r.netPay))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="font-bold">
                        <TableCell colSpan={2}>TOTALS</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(sum(records, 'basicSalary'))}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(sum(records, 'grossPay'))}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(sum(records, 'nssfEmployee'))}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(sum(records, 'shif'))}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(sum(records, 'ahlEmployee'))}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(sum(records, 'taxableIncome'))}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(sum(records, 'paye'))}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(sum(records, 'totalDeductions'))}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(sum(records, 'netPay'))}</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* KRA PAYE */}
          <TabsContent value="kra">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">KRA PAYE (P10) Schedule</CardTitle>
                <Button variant="outline" size="sm" onClick={() => downloadExcel('kra')}>
                  <Download className="mr-2 h-4 w-4" />Excel
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No</TableHead>
                        <TableHead>Employee Name</TableHead>
                        <TableHead>KRA PIN</TableHead>
                        <TableHead className="text-right">Gross Pay</TableHead>
                        <TableHead className="text-right">Taxable Income</TableHead>
                        <TableHead className="text-right">PAYE</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((r, i) => (
                        <TableRow key={r.id}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell>{r.employeeName}</TableCell>
                          <TableCell>—</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(n(r.grossPay))}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(n(r.taxableIncome))}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(n(r.paye))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="font-bold">
                        <TableCell colSpan={3}>TOTAL</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(sum(records, 'grossPay'))}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(sum(records, 'taxableIncome'))}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(sum(records, 'paye'))}</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* NSSF */}
          <TabsContent value="nssf">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">NSSF Contribution Schedule</CardTitle>
                <Button variant="outline" size="sm" onClick={() => downloadExcel('nssf')}>
                  <Download className="mr-2 h-4 w-4" />Excel
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No</TableHead>
                        <TableHead>Employee Name</TableHead>
                        <TableHead>NSSF No</TableHead>
                        <TableHead className="text-right">Employee</TableHead>
                        <TableHead className="text-right">Employer</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((r, i) => (
                        <TableRow key={r.id}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell>{r.employeeName}</TableCell>
                          <TableCell>—</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(n(r.nssfEmployee))}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(n(r.nssfEmployer))}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(n(r.nssfEmployee) + n(r.nssfEmployer))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="font-bold">
                        <TableCell colSpan={3}>TOTAL</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(sum(records, 'nssfEmployee'))}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(sum(records, 'nssfEmployer'))}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(sum(records, 'nssfEmployee') + sum(records, 'nssfEmployer'))}</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SHIF */}
          <TabsContent value="shif">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">SHIF Contribution Schedule</CardTitle>
                <Button variant="outline" size="sm" onClick={() => downloadExcel('shif')}>
                  <Download className="mr-2 h-4 w-4" />Excel
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No</TableHead>
                        <TableHead>Employee Name</TableHead>
                        <TableHead>NHIF/SHIF No</TableHead>
                        <TableHead className="text-right">Gross Pay</TableHead>
                        <TableHead className="text-right">SHIF Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((r, i) => (
                        <TableRow key={r.id}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell>{r.employeeName}</TableCell>
                          <TableCell>—</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(n(r.grossPay))}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(n(r.shif))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="font-bold">
                        <TableCell colSpan={3}>TOTAL</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(sum(records, 'grossPay'))}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(sum(records, 'shif'))}</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AHL */}
          <TabsContent value="ahl">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">AHL (Affordable Housing Levy) Schedule</CardTitle>
                <Button variant="outline" size="sm" onClick={() => downloadExcel('ahl')}>
                  <Download className="mr-2 h-4 w-4" />Excel
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No</TableHead>
                        <TableHead>Employee Name</TableHead>
                        <TableHead>ID Number</TableHead>
                        <TableHead className="text-right">Gross Pay</TableHead>
                        <TableHead className="text-right">Employee</TableHead>
                        <TableHead className="text-right">Employer</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((r, i) => (
                        <TableRow key={r.id}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell>{r.employeeName}</TableCell>
                          <TableCell>—</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(n(r.grossPay))}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(n(r.ahlEmployee))}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(n(r.ahlEmployer))}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(n(r.ahlEmployee) + n(r.ahlEmployer))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="font-bold">
                        <TableCell colSpan={3}>TOTAL</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(sum(records, 'grossPay'))}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(sum(records, 'ahlEmployee'))}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(sum(records, 'ahlEmployer'))}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(sum(records, 'ahlEmployee') + sum(records, 'ahlEmployer'))}</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* P9 TAX DEDUCTION CARD */}
          <TabsContent value="p9">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base">P9 Tax Deduction Card — {year}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Annual KRA P9 form with monthly breakdown of income, deductions, and PAYE.
                    Aggregates all payroll runs for the selected year.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/api/p9?year=${year}&orgId=${orgId}&employeeId=all`, '_blank')}
                  >
                    <FileDown className="mr-2 h-4 w-4" />Download All P9s
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>KRA PIN</TableHead>
                        <TableHead className="text-right">Gross Pay</TableHead>
                        <TableHead className="text-right">NSSF</TableHead>
                        <TableHead className="text-right">Taxable Income</TableHead>
                        <TableHead className="text-right">PAYE</TableHead>
                        <TableHead className="text-center w-16">P9</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((r, i) => (
                        <TableRow key={r.id}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell>{r.employeeName}</TableCell>
                          <TableCell className="font-mono text-xs">{r.kraPin || '—'}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(n(r.grossPay))}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(n(r.nssfEmployee))}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(n(r.taxableIncome))}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(n(r.paye))}</TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title={`Download P9 for ${r.employeeName}`}
                              onClick={() => {
                                // Need to get employeeId from the record — use the record's index data
                                window.open(`/api/p9?year=${year}&orgId=${orgId}&employeeId=${r.employeeId}`, '_blank');
                              }}
                            >
                              <FileDown className="h-4 w-4 text-[#1B3A6B]" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="font-bold">
                        <TableCell colSpan={3}>TOTAL (This Month)</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(sum(records, 'grossPay'))}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(sum(records, 'nssfEmployee'))}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(sum(records, 'taxableIncome'))}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(sum(records, 'paye'))}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

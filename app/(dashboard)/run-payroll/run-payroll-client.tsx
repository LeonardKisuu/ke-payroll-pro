'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Play,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  FileSpreadsheet,
  FileDown,
  FileArchive,
} from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';

import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface PayrollRecord {
  id: number;
  employeeNo: string;
  employeeName: string;
  grossPay: number;
  nssfEmployee: number;
  shif: number;
  ahlEmployee: number;
  paye: number;
  customDeductionsTotal: number;
  totalDeductions: number;
  netPay: number;
  nssfEmployer: number;
  ahlEmployer: number;
  nita: number;
}

interface RunPayrollClientProps {
  orgId: number;
  role: 'admin' | 'accountant' | 'hr';
}

export function RunPayrollClient({ orgId, role }: RunPayrollClientProps) {
  const router = useRouter();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [runId, setRunId] = useState<number | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [csvOverrides, setCsvOverrides] = useState<Record<string, Record<string, number>>[]>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [confirmProcess, setConfirmProcess] = useState(false);

  const handleCsvUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (result) => {
        setCsvOverrides(result.data as Record<string, Record<string, number>>[]);
        toast.success(`Loaded ${result.data.length} override rows from CSV`);
      },
      error: () => {
        toast.error('Failed to parse CSV file');
      },
    });
    e.target.value = '';
  }, []);

  async function handleProcess() {
    setProcessing(true);
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          year,
          orgId,
          overrides: csvOverrides.length > 0 ? csvOverrides : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Failed to process payroll');
        return;
      }

      const data = await res.json();
      setRunId(data.run.id);
      setIsFinal(data.run.isFinal);
      setRecords(data.records.map((r: Record<string, unknown>) => ({
        id: (r.id as number) || 0,
        employeeNo: r.employeeNo as string,
        employeeName: r.employeeName as string,
        grossPay: (r.grossPay as number) || 0,
        nssfEmployee: (r.nssfEmployee as number) || 0,
        shif: (r.shif as number) || 0,
        ahlEmployee: (r.ahlEmployee as number) || 0,
        paye: (r.paye as number) || 0,
        customDeductionsTotal: (r.customDeductionsTotal as number) || 0,
        totalDeductions: (r.totalDeductions as number) || 0,
        netPay: (r.netPay as number) || 0,
        nssfEmployer: (r.nssfEmployer as number) || 0,
        ahlEmployer: (r.ahlEmployer as number) || 0,
        nita: (r.nita as number) || 0,
      })));
      toast.success(`Payroll processed for ${data.records.length} employees`);
    } catch {
      toast.error('An error occurred');
    } finally {
      setProcessing(false);
      setConfirmProcess(false);
    }
  }

  async function handleFinalise() {
    if (!runId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/payroll/finalise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Failed to finalise');
        return;
      }
      setIsFinal(true);
      toast.success('Payroll finalised');
      router.refresh();
    } catch {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleUnfinalise() {
    if (!runId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll/${runId}`, { method: 'PUT' });
      if (!res.ok) throw new Error();
      setIsFinal(false);
      toast.success('Payroll un-finalised');
      router.refresh();
    } catch {
      toast.error('Failed to un-finalise');
    } finally {
      setLoading(false);
    }
  }

  async function loadExistingRun() {
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll?month=${month}&year=${year}`);
      if (!res.ok) throw new Error();
      const runs = await res.json();
      if (runs.length > 0) {
        const run = runs[0];
        const detailRes = await fetch(`/api/payroll/${run.id}`);
        if (!detailRes.ok) throw new Error();
        const detail = await detailRes.json();
        setRunId(detail.run.id);
        setIsFinal(detail.run.isFinal);
        setRecords(detail.records.map((r: Record<string, unknown>) => ({
          id: (r.id as number) || 0,
          employeeNo: r.employeeNo as string,
          employeeName: r.employeeName as string,
          grossPay: (r.grossPay as number) || 0,
          nssfEmployee: (r.nssfEmployee as number) || 0,
          shif: (r.shif as number) || 0,
          ahlEmployee: (r.ahlEmployee as number) || 0,
          paye: (r.paye as number) || 0,
          customDeductionsTotal: (r.customDeductionsTotal as number) || 0,
          totalDeductions: (r.totalDeductions as number) || 0,
          netPay: (r.netPay as number) || 0,
          nssfEmployer: (r.nssfEmployer as number) || 0,
          ahlEmployer: (r.ahlEmployer as number) || 0,
          nita: (r.nita as number) || 0,
        })));
        toast.info(`Loaded existing ${detail.run.isFinal ? 'finalised ' : ''}payroll for ${MONTH_NAMES[month]} ${year}`);
      } else {
        setRunId(null);
        setIsFinal(false);
        setRecords([]);
        toast.info('No existing payroll found for this period');
      }
    } catch {
      toast.error('Failed to load payroll');
    } finally {
      setLoading(false);
    }
  }

  const totals = records.reduce(
    (acc, r) => ({
      grossPay: acc.grossPay + r.grossPay,
      nssfEmployee: acc.nssfEmployee + r.nssfEmployee,
      shif: acc.shif + r.shif,
      ahlEmployee: acc.ahlEmployee + r.ahlEmployee,
      paye: acc.paye + r.paye,
      customDeductionsTotal: acc.customDeductionsTotal + r.customDeductionsTotal,
      totalDeductions: acc.totalDeductions + r.totalDeductions,
      netPay: acc.netPay + r.netPay,
      nssfEmployer: acc.nssfEmployer + r.nssfEmployer,
      ahlEmployer: acc.ahlEmployer + r.ahlEmployer,
      nita: acc.nita + r.nita,
    }),
    { grossPay: 0, nssfEmployee: 0, shif: 0, ahlEmployee: 0, paye: 0, customDeductionsTotal: 0, totalDeductions: 0, netPay: 0, nssfEmployer: 0, ahlEmployer: 0, nita: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Run Payroll</h1>
        {runId && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/api/payslip/bulk?runId=${runId}`, '_blank')}
              title="Download all payslips as a single PDF"
            >
              <FileArchive className="mr-2 h-4 w-4" />Download All Payslips
            </Button>
            {isFinal ? (
              <>
                <Badge className="bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3" />Finalised</Badge>
                {role === 'admin' && (
                  <Button variant="outline" size="sm" onClick={handleUnfinalise} disabled={loading}>
                    <Unlock className="mr-2 h-4 w-4" />Un-finalise
                  </Button>
                )}
              </>
            ) : (
              <Button size="sm" onClick={handleFinalise} disabled={loading}>
                <Lock className="mr-2 h-4 w-4" />Finalise
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
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
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10) || now.getFullYear())}
                className="w-28"
                min={2020}
                max={2099}
              />
            </div>
            <div className="space-y-2">
              <Label>CSV Overrides (optional)</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <label className="cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    {csvFileName || 'Upload CSV'}
                    <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
                  </label>
                </Button>
                {csvFileName && (
                  <Badge variant="secondary">{csvOverrides.length} rows</Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadExistingRun} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                Load Existing
              </Button>
              <Button onClick={() => setConfirmProcess(true)} disabled={processing || isFinal}>
                {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                Process Payroll
              </Button>
            </div>
          </div>
          {isFinal && (
            <div className="mt-4 flex items-center gap-2 text-amber-600 text-sm">
              <AlertTriangle className="h-4 w-4" />
              This payroll is finalised. Un-finalise to re-process.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Totals Cards */}
      {records.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Employees</p>
              <p className="text-xl font-bold">{records.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Gross</p>
              <p className="text-lg font-bold text-[#1B3A6B]">{formatCurrency(totals.grossPay)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total PAYE</p>
              <p className="text-lg font-bold text-orange-600">{formatCurrency(totals.paye)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Net Pay</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(totals.netPay)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">NSSF (Emp+Empr)</p>
              <p className="text-lg font-bold">{formatCurrency(totals.nssfEmployee + totals.nssfEmployer)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Employer Costs</p>
              <p className="text-lg font-bold text-purple-600">{formatCurrency(totals.nssfEmployer + totals.ahlEmployer + totals.nita)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results Table */}
      {records.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Payroll Results — {MONTH_NAMES[month]} {year}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Emp No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Gross Pay</TableHead>
                    <TableHead className="text-right">NSSF</TableHead>
                    <TableHead className="text-right">SHIF</TableHead>
                    <TableHead className="text-right">AHL</TableHead>
                    <TableHead className="text-right">PAYE</TableHead>
                    <TableHead className="text-right">Custom Ded.</TableHead>
                    <TableHead className="text-right">Total Ded.</TableHead>
                    <TableHead className="text-right">Net Pay</TableHead>
                    <TableHead className="text-center w-16">Payslip</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.employeeNo}>
                      <TableCell className="font-medium">{r.employeeNo}</TableCell>
                      <TableCell>{r.employeeName}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(r.grossPay)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(r.nssfEmployee)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(r.shif)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(r.ahlEmployee)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(r.paye)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(r.customDeductionsTotal)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(r.totalDeductions)}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{formatCurrency(r.netPay)}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={`Download payslip for ${r.employeeName}`}
                          onClick={() => window.open(`/api/payslip/${r.id}`, '_blank')}
                        >
                          <FileDown className="h-4 w-4 text-[#1B3A6B]" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-bold">
                    <TableCell colSpan={2}>TOTALS</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(totals.grossPay)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(totals.nssfEmployee)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(totals.shif)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(totals.ahlEmployee)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(totals.paye)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(totals.customDeductionsTotal)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(totals.totalDeductions)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(totals.netPay)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {records.length === 0 && !loading && (
        <div className="text-center py-16 text-muted-foreground">
          <Play className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Select a period and click &quot;Process Payroll&quot; to calculate.</p>
          <p className="text-xs mt-1">Or &quot;Load Existing&quot; to view a previous run.</p>
        </div>
      )}

      {/* Confirm Dialog */}
      <AlertDialog open={confirmProcess} onOpenChange={setConfirmProcess}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Process Payroll</AlertDialogTitle>
            <AlertDialogDescription>
              This will calculate payroll for all active employees for {MONTH_NAMES[month]} {year}.
              {runId && !isFinal && ' This will replace the existing draft payroll for this period.'}
              {csvOverrides.length > 0 && ` ${csvOverrides.length} CSV overrides will be applied.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleProcess}>
              Process Payroll
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

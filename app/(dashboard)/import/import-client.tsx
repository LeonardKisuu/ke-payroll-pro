'use client';

import { useState, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import Fuse from 'fuse.js';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

// ── Constants ──────────────────────────────────────────────────────────────

const EMPLOYEE_TEMPLATE_HEADERS = [
  'employee_no', 'full_name', 'id_number', 'kra_pin', 'nssf_no', 'nhif_no',
  'department', 'designation', 'date_of_joining', 'basic_salary',
  'house_allowance', 'commuter_allowance', 'car_allowance', 'other_allowances',
  'bonus_pay', 'leave_pay', 'leave_deduction', 'arrears',
  'airtime_benefit', 'internet_benefit', 'other_fringe_benefits',
  'bank_name', 'bank_branch', 'bank_account_no', 'bank_code', 'payment_method',
];

const NUMERIC_FIELDS = [
  'basic_salary', 'house_allowance', 'commuter_allowance', 'car_allowance',
  'other_allowances', 'bonus_pay', 'leave_pay', 'leave_deduction', 'arrears',
  'airtime_benefit', 'internet_benefit', 'other_fringe_benefits',
];

const SYSTEM_FIELDS = [
  { value: 'employee_no', label: 'Employee No' },
  { value: 'full_name', label: 'Full Name' },
  { value: 'id_number', label: 'ID Number' },
  { value: 'kra_pin', label: 'KRA PIN' },
  { value: 'nssf_no', label: 'NSSF No' },
  { value: 'nhif_no', label: 'NHIF/SHIF No' },
  { value: 'department', label: 'Department' },
  { value: 'designation', label: 'Designation' },
  { value: 'basic_salary', label: 'Basic Salary' },
  { value: 'house_allowance', label: 'House Allowance' },
  { value: 'commuter_allowance', label: 'Commuter Allowance' },
  { value: 'car_allowance', label: 'Car Allowance' },
  { value: 'other_allowances', label: 'Other Allowances' },
  { value: 'bonus_pay', label: 'Bonus Pay' },
  { value: 'leave_pay', label: 'Leave Pay' },
  { value: 'leave_deduction', label: 'Leave Deduction' },
  { value: 'arrears', label: 'Arrears' },
  { value: 'airtime_benefit', label: 'Airtime Benefit' },
  { value: 'internet_benefit', label: 'Internet Benefit' },
  { value: 'other_fringe_benefits', label: 'Other Fringe Benefits' },
  { value: 'bank_name', label: 'Bank Name' },
  { value: 'bank_branch', label: 'Bank Branch' },
  { value: 'bank_account_no', label: 'Bank Account No' },
  { value: 'bank_code', label: 'Bank Code' },
  { value: 'payment_method', label: 'Payment Method' },
  { value: '', label: '— Skip —' },
];

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ── Types ──────────────────────────────────────────────────────────────

interface ImportResult {
  imported: number;
  updated: number;
  errors: Array<{ row: number; message: string }>;
}

interface OverrideRow {
  employeeNo: string;
  employeeName: string;
  field: string;
  oldValue: string | number;
  newValue: string | number;
}

interface ColumnMapping {
  [sourceColumn: string]: string; // maps source header → system field
}

interface MatchedRow {
  sourceRow: Record<string, string>;
  matchedEmployee: { employee_no: string; full_name: string; id: number } | null;
  confidence: number;
  changes: Array<{ field: string; oldValue: string; newValue: string }>;
}

interface ImportClientProps {
  orgId: number;
  userId: number;
}

// ── Component ──────────────────────────────────────────────────────────────

export function ImportClient({ orgId, userId }: ImportClientProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Import Data</h1>
      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="employees">Import Employees</TabsTrigger>
          <TabsTrigger value="overrides">Monthly Overrides</TabsTrigger>
          <TabsTrigger value="client">Client Changes</TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <EmployeeImportTab orgId={orgId} />
        </TabsContent>
        <TabsContent value="overrides">
          <OverridesTab orgId={orgId} />
        </TabsContent>
        <TabsContent value="client">
          <ClientChangesTab orgId={orgId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Shared: File Drop Zone ─────────────────────────────────────────────

function FileDropZone({
  accept,
  onFile,
  label,
}: {
  accept: string;
  onFile: (file: File) => void;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xs text-muted-foreground mt-1">Drag &amp; drop or click to browse</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// TAB 1: Import Employees
// ══════════════════════════════════════════════════════════════════════

function EmployeeImportTab({ orgId }: { orgId: number }) {
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [validationErrors, setValidationErrors] = useState<Map<number, string[]>>(new Map());
  const [duplicateRows, setDuplicateRows] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  function downloadTemplate() {
    window.open(`/api/import/template?type=employees&orgId=${orgId}`, '_blank');
  }

  function handleFile(file: File) {
    setResult(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Record<string, string>[];
        setParsedRows(rows);
        validateRows(rows);
      },
      error: () => {
        toast.error('Failed to parse CSV file');
      },
    });
  }

  function validateRows(rows: Record<string, string>[]) {
    const errors = new Map<number, string[]>();
    const duplicates = new Set<number>();
    const seenIds = new Map<string, number>();

    rows.forEach((row, idx) => {
      const rowErrors: string[] = [];

      if (!row.employee_no?.trim()) rowErrors.push('Missing employee_no');
      if (!row.full_name?.trim()) rowErrors.push('Missing full_name');
      if (!row.id_number?.trim()) rowErrors.push('Missing id_number');
      if (!row.basic_salary || isNaN(parseFloat(row.basic_salary))) {
        rowErrors.push('Invalid basic_salary');
      }

      // Check for duplicate id_numbers within the file
      const idNum = row.id_number?.trim();
      if (idNum) {
        if (seenIds.has(idNum)) {
          duplicates.add(idx);
          duplicates.add(seenIds.get(idNum)!);
        }
        seenIds.set(idNum, idx);
      }

      if (rowErrors.length > 0) errors.set(idx, rowErrors);
    });

    setValidationErrors(errors);
    setDuplicateRows(duplicates);
  }

  async function handleImport() {
    if (parsedRows.length === 0) return;
    setImporting(true);
    setProgress(10);

    try {
      // Convert CSV rows to employee objects
      const employeesToImport = parsedRows
        .filter((_, idx) => !validationErrors.has(idx))
        .map((row) => {
          const emp: Record<string, string | number> = {};
          EMPLOYEE_TEMPLATE_HEADERS.forEach((header) => {
            if (NUMERIC_FIELDS.includes(header)) {
              emp[header] = parseFloat(row[header] || '0') || 0;
            } else {
              emp[header] = (row[header] || '').trim();
            }
          });
          return emp;
        });

      setProgress(30);

      const res = await fetch('/api/import/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employees: employeesToImport, orgId }),
      });

      setProgress(80);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Import failed');
      }

      const data: ImportResult = await res.json();
      setResult(data);
      setProgress(100);

      if (data.errors.length === 0) {
        toast.success(`Successfully imported ${data.imported} and updated ${data.updated} employees`);
      } else {
        toast.warning(`Import completed with ${data.errors.length} error(s)`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  const validCount = parsedRows.length - validationErrors.size;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Import Employees from CSV
        </CardTitle>
        <CardDescription>
          Download the template, fill in employee data, and upload to bulk import.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="mr-2 h-4 w-4" />
          Download Template CSV
        </Button>

        <FileDropZone accept=".csv" onFile={handleFile} label="Upload employee CSV file" />

        {parsedRows.length > 0 && (
          <>
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="secondary">{parsedRows.length} rows parsed</Badge>
              <Badge variant={validCount === parsedRows.length ? 'default' : 'destructive'}>
                {validCount} valid
              </Badge>
              {validationErrors.size > 0 && (
                <Badge variant="destructive">{validationErrors.size} with errors</Badge>
              )}
              {duplicateRows.size > 0 && (
                <Badge variant="outline">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  {duplicateRows.size} duplicate IDs
                </Badge>
              )}
            </div>

            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Emp No</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>ID Number</TableHead>
                    <TableHead>KRA PIN</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Basic Salary</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row, idx) => {
                    const rowErrs = validationErrors.get(idx);
                    const isDup = duplicateRows.has(idx);
                    return (
                      <TableRow
                        key={idx}
                        className={rowErrs ? 'bg-destructive/5' : isDup ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}
                      >
                        <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                        <TableCell>{row.employee_no}</TableCell>
                        <TableCell>{row.full_name}</TableCell>
                        <TableCell>{row.id_number}</TableCell>
                        <TableCell>{row.kra_pin}</TableCell>
                        <TableCell>{row.department}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(parseFloat(row.basic_salary || '0') || 0)}
                        </TableCell>
                        <TableCell>
                          {rowErrs ? (
                            <span className="text-destructive text-xs flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              {rowErrs.join(', ')}
                            </span>
                          ) : isDup ? (
                            <span className="text-yellow-600 text-xs flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Update (exists)
                            </span>
                          ) : (
                            <span className="text-green-600 text-xs flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              New
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>

            {importing && <Progress value={progress} className="h-2" />}

            <Button
              onClick={handleImport}
              disabled={importing || validCount === 0}
              className="w-full"
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import {validCount} Employee(s)
                </>
              )}
            </Button>
          </>
        )}

        {result && (
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">Import Results</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">{result.imported}</p>
                  <p className="text-xs text-muted-foreground">New Employees</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{result.updated}</p>
                  <p className="text-xs text-muted-foreground">Updated</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{result.errors.length}</p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="mt-4 space-y-1">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-sm text-destructive">
                      Row {err.row}: {err.message}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════
// TAB 2: Monthly Deductions & Overrides
// ══════════════════════════════════════════════════════════════════════

function OverridesTab({ orgId }: { orgId: number }) {
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<{ applied: number; errors: Array<{ row: number; message: string }> } | null>(null);

  function downloadPrefilled() {
    window.open(`/api/import/template?type=overrides&orgId=${orgId}`, '_blank');
  }

  function handleFile(file: File) {
    setResult(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Record<string, string>[];
        setParsedRows(rows);
        computeDiffs(rows);
      },
      error: () => toast.error('Failed to parse CSV'),
    });
  }

  async function computeDiffs(rows: Record<string, string>[]) {
    // Fetch current employee data to diff against
    try {
      const res = await fetch(`/api/import/template?type=overrides_data&orgId=${orgId}`);
      if (!res.ok) throw new Error('Failed to fetch current data');
      const current: Record<string, string>[] = await res.json();

      const currentMap = new Map<string, Record<string, string>>();
      current.forEach((emp) => {
        currentMap.set(emp.employee_no, emp);
      });

      const diffs: OverrideRow[] = [];
      const overrideFields = [
        'basic_salary', 'house_allowance', 'commuter_allowance', 'car_allowance',
        'other_allowances', 'bonus_pay', 'leave_pay', 'leave_deduction', 'arrears',
        'airtime_benefit', 'internet_benefit', 'other_fringe_benefits',
      ];

      rows.forEach((row) => {
        const empNo = row.employee_no?.trim();
        if (!empNo) return;
        const currentEmp = currentMap.get(empNo);
        if (!currentEmp) return;

        overrideFields.forEach((field) => {
          const newVal = row[field]?.trim();
          const oldVal = currentEmp[field]?.trim() || '0';
          if (newVal && newVal !== oldVal) {
            diffs.push({
              employeeNo: empNo,
              employeeName: currentEmp.full_name || row.full_name || '',
              field,
              oldValue: parseFloat(oldVal) || 0,
              newValue: parseFloat(newVal) || 0,
            });
          }
        });
      });

      setOverrides(diffs);
      if (diffs.length === 0) {
        toast.info('No changes detected between uploaded file and current data');
      }
    } catch {
      // Fall back to showing all rows as changes without diff
      const diffs: OverrideRow[] = [];
      const overrideFields = [
        'basic_salary', 'house_allowance', 'commuter_allowance', 'car_allowance',
        'other_allowances', 'bonus_pay', 'leave_pay', 'leave_deduction', 'arrears',
        'airtime_benefit', 'internet_benefit', 'other_fringe_benefits',
      ];

      rows.forEach((row) => {
        overrideFields.forEach((field) => {
          const val = row[field]?.trim();
          if (val && parseFloat(val) > 0) {
            diffs.push({
              employeeNo: row.employee_no || '',
              employeeName: row.full_name || '',
              field,
              oldValue: '—',
              newValue: parseFloat(val) || 0,
            });
          }
        });
      });

      setOverrides(diffs);
    }
  }

  async function handleApply() {
    if (overrides.length === 0) return;
    setApplying(true);

    try {
      const payload = overrides.map((o) => ({
        employee_no: o.employeeNo,
        field: o.field,
        value: o.newValue,
      }));

      const res = await fetch('/api/import/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides: payload, orgId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Apply failed');
      }

      const data = await res.json();
      setResult(data);
      toast.success(`Applied ${data.applied} override(s) successfully`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to apply overrides');
    } finally {
      setApplying(false);
    }
  }

  const fieldLabel = (field: string) => {
    return SYSTEM_FIELDS.find((f) => f.value === field)?.label || field;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Deductions &amp; Overrides</CardTitle>
        <CardDescription>
          Download the pre-filled template with current employee values, modify salary/allowance figures, and re-upload to apply changes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button variant="outline" onClick={downloadPrefilled}>
          <Download className="mr-2 h-4 w-4" />
          Download Pre-filled Template
        </Button>

        <FileDropZone accept=".csv" onFile={handleFile} label="Upload modified CSV file" />

        {overrides.length > 0 && (
          <>
            <Badge variant="secondary">{overrides.length} change(s) detected</Badge>
            <ScrollArea className="h-[350px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead className="text-right">Old Value</TableHead>
                    <TableHead className="text-center">→</TableHead>
                    <TableHead className="text-right">New Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overrides.map((o, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{o.employeeName}</p>
                          <p className="text-xs text-muted-foreground">{o.employeeNo}</p>
                        </div>
                      </TableCell>
                      <TableCell>{fieldLabel(o.field)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {typeof o.oldValue === 'number' ? formatCurrency(o.oldValue) : o.oldValue}
                      </TableCell>
                      <TableCell className="text-center">
                        <ArrowRight className="h-4 w-4 mx-auto text-muted-foreground" />
                      </TableCell>
                      <TableCell className="text-right font-medium text-primary">
                        {typeof o.newValue === 'number' ? formatCurrency(o.newValue) : o.newValue}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <Button onClick={handleApply} disabled={applying} className="w-full">
              {applying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                `Apply ${overrides.length} Change(s)`
              )}
            </Button>
          </>
        )}

        {result && (
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <p className="text-sm">
                <span className="font-semibold text-green-600">{result.applied}</span> override(s) applied.
                {result.errors.length > 0 && (
                  <span className="text-destructive ml-2">{result.errors.length} error(s).</span>
                )}
              </p>
              {result.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-destructive">Row {err.row}: {err.message}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════
// TAB 3: Client Changes File
// ══════════════════════════════════════════════════════════════════════

function ClientChangesTab({ orgId }: { orgId: number }) {
  const [sourceHeaders, setSourceHeaders] = useState<string[]>([]);
  const [sourceRows, setSourceRows] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [matchedRows, setMatchedRows] = useState<MatchedRow[]>([]);
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'done'>('upload');
  const [applying, setApplying] = useState(false);
  const [employees, setEmployees] = useState<Array<{ employee_no: string; full_name: string; id: number }>>([]);
  const [result, setResult] = useState<{ applied: number; errors: Array<{ row: number; message: string }> } | null>(null);

  function handleFile(file: File) {
    setResult(null);
    setStep('upload');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Record<string, string>[];
        if (rows.length === 0) {
          toast.error('No data rows found');
          return;
        }
        const headers = Object.keys(rows[0]);
        setSourceHeaders(headers);
        setSourceRows(rows);

        // Auto-map columns by fuzzy matching header names
        const autoMap: ColumnMapping = {};
        headers.forEach((h) => {
          const normalized = h.toLowerCase().replace(/[^a-z0-9]/g, '_');
          const match = SYSTEM_FIELDS.find(
            (f) => f.value && (f.value === normalized || f.label.toLowerCase().replace(/[^a-z0-9]/g, '_') === normalized)
          );
          if (match) autoMap[h] = match.value;
        });
        setColumnMapping(autoMap);
        setStep('map');

        // Fetch employees for fuzzy matching
        fetchEmployees();
      },
      error: () => toast.error('Failed to parse file'),
    });
  }

  async function fetchEmployees() {
    try {
      const res = await fetch(`/api/import/template?type=overrides_data&orgId=${orgId}`);
      if (!res.ok) return;
      const data: Record<string, string>[] = await res.json();
      setEmployees(
        data.map((e) => ({
          employee_no: e.employee_no,
          full_name: e.full_name,
          id: parseInt(e.id || '0', 10),
        }))
      );
    } catch {
      // Employees couldn't be loaded
    }
  }

  function updateMapping(sourceCol: string, systemField: string) {
    setColumnMapping((prev) => ({
      ...prev,
      [sourceCol]: systemField,
    }));
  }

  function processMatching() {
    // Find the source column mapped to employee name or employee no
    const nameCol = Object.entries(columnMapping).find(([, v]) => v === 'full_name')?.[0];
    const noCol = Object.entries(columnMapping).find(([, v]) => v === 'employee_no')?.[0];

    const fuse = new Fuse(employees, {
      keys: ['full_name', 'employee_no'],
      threshold: 0.4,
      includeScore: true,
    });

    const matched: MatchedRow[] = sourceRows.map((row) => {
      let matchedEmp: MatchedRow['matchedEmployee'] = null;
      let confidence = 0;

      // Try exact match on employee_no first
      if (noCol && row[noCol]) {
        const exact = employees.find(
          (e) => e.employee_no.toLowerCase() === row[noCol].trim().toLowerCase()
        );
        if (exact) {
          matchedEmp = exact;
          confidence = 1;
        }
      }

      // Fall back to fuzzy name match
      if (!matchedEmp && nameCol && row[nameCol]) {
        const results = fuse.search(row[nameCol].trim());
        if (results.length > 0) {
          matchedEmp = results[0].item;
          confidence = 1 - (results[0].score || 0);
        }
      }

      // Compute changes
      const changes: MatchedRow['changes'] = [];
      if (matchedEmp) {
        Object.entries(columnMapping).forEach(([srcCol, sysField]) => {
          if (!sysField || sysField === 'full_name' || sysField === 'employee_no') return;
          const newVal = row[srcCol]?.trim();
          if (newVal) {
            changes.push({ field: sysField, oldValue: '—', newValue: newVal });
          }
        });
      }

      return { sourceRow: row, matchedEmployee: matchedEmp, confidence, changes };
    });

    setMatchedRows(matched);
    setStep('preview');
  }

  async function applyChanges() {
    setApplying(true);
    try {
      const validRows = matchedRows.filter((r) => r.matchedEmployee && r.changes.length > 0);
      const overridesPayload = validRows.flatMap((r) =>
        r.changes.map((c) => ({
          employee_no: r.matchedEmployee!.employee_no,
          field: c.field,
          value: NUMERIC_FIELDS.includes(c.field)
            ? parseFloat(c.newValue) || 0
            : c.newValue,
        }))
      );

      const res = await fetch('/api/import/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides: overridesPayload, orgId }),
      });

      if (!res.ok) throw new Error('Apply failed');

      const data = await res.json();
      setResult(data);
      setStep('done');
      toast.success(`Applied ${data.applied} change(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to apply');
    } finally {
      setApplying(false);
    }
  }

  const fieldLabel = (field: string) =>
    SYSTEM_FIELDS.find((f) => f.value === field)?.label || field;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Changes File</CardTitle>
        <CardDescription>
          Upload an arbitrary CSV/Excel file from a client. Map columns to system fields and apply changes with fuzzy employee name matching.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FileDropZone accept=".csv,.xlsx,.xls" onFile={handleFile} label="Upload client file (CSV or Excel)" />

        {/* Step: Column Mapping */}
        {step === 'map' && sourceHeaders.length > 0 && (
          <>
            <h3 className="font-semibold">Map Source Columns to System Fields</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sourceHeaders.map((header) => (
                <div key={header} className="flex items-center gap-2">
                  <Label className="w-40 truncate text-sm text-muted-foreground">{header}</Label>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Select
                    value={columnMapping[header] ?? ''}
                    onValueChange={(v) => updateMapping(header, v)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="— Skip —" />
                    </SelectTrigger>
                    <SelectContent>
                      {SYSTEM_FIELDS.map((f) => (
                        <SelectItem key={f.value || '__skip'} value={f.value || '__skip'}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <Button onClick={processMatching} className="w-full">
              Match Employees &amp; Preview Changes
            </Button>
          </>
        )}

        {/* Step: Preview Matched Results */}
        {step === 'preview' && matchedRows.length > 0 && (
          <>
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="default">
                {matchedRows.filter((r) => r.matchedEmployee).length} matched
              </Badge>
              <Badge variant="destructive">
                {matchedRows.filter((r) => !r.matchedEmployee).length} unmatched
              </Badge>
            </div>

            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source Name</TableHead>
                    <TableHead>Matched Employee</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Changes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matchedRows.map((row, idx) => {
                    const nameCol = Object.entries(columnMapping).find(([, v]) => v === 'full_name')?.[0];
                    const sourceName = nameCol ? row.sourceRow[nameCol] : `Row ${idx + 1}`;
                    return (
                      <TableRow
                        key={idx}
                        className={!row.matchedEmployee ? 'bg-destructive/5' : ''}
                      >
                        <TableCell>{sourceName}</TableCell>
                        <TableCell>
                          {row.matchedEmployee ? (
                            <div>
                              <p className="font-medium">{row.matchedEmployee.full_name}</p>
                              <p className="text-xs text-muted-foreground">{row.matchedEmployee.employee_no}</p>
                            </div>
                          ) : (
                            <span className="text-destructive text-sm">No match</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.matchedEmployee && (
                            <Badge
                              variant={row.confidence >= 0.8 ? 'default' : row.confidence >= 0.5 ? 'secondary' : 'destructive'}
                            >
                              {Math.round(row.confidence * 100)}%
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {row.changes.map((c, ci) => (
                              <p key={ci} className="text-xs">
                                <span className="text-muted-foreground">{fieldLabel(c.field)}:</span>{' '}
                                <span className="font-medium">{c.newValue}</span>
                              </p>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>

            <Button onClick={applyChanges} disabled={applying} className="w-full">
              {applying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                `Apply Changes (${matchedRows.filter((r) => r.matchedEmployee && r.changes.length > 0).length} employees)`
              )}
            </Button>
          </>
        )}

        {step === 'done' && result && (
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <p className="text-sm">
                <span className="font-semibold text-green-600">{result.applied}</span> change(s) applied successfully.
                {result.errors.length > 0 && (
                  <span className="text-destructive ml-2">{result.errors.length} error(s).</span>
                )}
              </p>
              {result.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-destructive">Row {err.row}: {err.message}</p>
                  ))}
                </div>
              )}
              <Button variant="outline" className="mt-4" onClick={() => { setStep('upload'); setResult(null); setSourceHeaders([]); setSourceRows([]); setMatchedRows([]); }}>
                Upload Another File
              </Button>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

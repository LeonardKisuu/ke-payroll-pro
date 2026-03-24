'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const employeeSchema = z.object({
  employeeNo: z.string().min(1, 'Employee number is required'),
  fullName: z.string().min(1, 'Full name is required'),
  idNumber: z.string().min(1, 'ID number is required'),
  kraPin: z.string().optional(),
  nssfNo: z.string().optional(),
  nhifNo: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  dateOfJoining: z.string().optional(),
  basicSalary: z.coerce.number().min(0, 'Must be 0 or more'),
  houseAllowance: z.coerce.number().min(0).default(0),
  transportAllowance: z.coerce.number().min(0).default(0),
  otherAllowances: z.coerce.number().min(0).default(0),
  airtimeBenefit: z.coerce.number().min(0).default(0),
  internetBenefit: z.coerce.number().min(0).default(0),
  otherFringeBenefits: z.coerce.number().min(0).default(0),
  bankName: z.string().optional(),
  bankBranch: z.string().optional(),
  bankAccountNo: z.string().optional(),
  bankCode: z.string().optional(),
  paymentMethod: z.string().default('bank_transfer'),
  isActive: z.boolean().default(true),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface OrgDeduction {
  id: number;
  name: string;
  deductionType: string | null;
  isPensionContribution: boolean | null;
  isEmployerCost: boolean | null;
  isActive: boolean | null;
}

interface DeductionAssignment {
  deductionId: number;
  amount: number;
  isActive: boolean;
}

interface EmployeeFormProps {
  employee?: {
    id: number;
    employeeNo: string;
    fullName: string;
    idNumber: string;
    kraPin: string | null;
    nssfNo: string | null;
    nhifNo: string | null;
    department: string | null;
    designation: string | null;
    dateOfJoining: string | null;
    basicSalary: number;
    houseAllowance: number | null;
    transportAllowance: number | null;
    otherAllowances: number | null;
    airtimeBenefit: number | null;
    internetBenefit: number | null;
    otherFringeBenefits: number | null;
    bankName: string | null;
    bankBranch: string | null;
    bankAccountNo: string | null;
    bankCode: string | null;
    paymentMethod: string | null;
    isActive: boolean | null;
    customDeductions?: Array<{
      deductionId: number;
      amount: number;
      isActive: boolean | null;
    }>;
  };
  orgDeductions: OrgDeduction[];
  isNew: boolean;
}

export function EmployeeForm({ employee, orgDeductions, isNew }: EmployeeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [deductionAssignments, setDeductionAssignments] = useState<DeductionAssignment[]>(() => {
    if (employee?.customDeductions) {
      return employee.customDeductions.map((d) => ({
        deductionId: d.deductionId,
        amount: d.amount,
        isActive: d.isActive ?? true,
      }));
    }
    return [];
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employeeNo: employee?.employeeNo || '',
      fullName: employee?.fullName || '',
      idNumber: employee?.idNumber || '',
      kraPin: employee?.kraPin || '',
      nssfNo: employee?.nssfNo || '',
      nhifNo: employee?.nhifNo || '',
      department: employee?.department || '',
      designation: employee?.designation || '',
      dateOfJoining: employee?.dateOfJoining || '',
      basicSalary: employee?.basicSalary || 0,
      houseAllowance: employee?.houseAllowance || 0,
      transportAllowance: employee?.transportAllowance || 0,
      otherAllowances: employee?.otherAllowances || 0,
      airtimeBenefit: employee?.airtimeBenefit || 0,
      internetBenefit: employee?.internetBenefit || 0,
      otherFringeBenefits: employee?.otherFringeBenefits || 0,
      bankName: employee?.bankName || '',
      bankBranch: employee?.bankBranch || '',
      bankAccountNo: employee?.bankAccountNo || '',
      bankCode: employee?.bankCode || '',
      paymentMethod: employee?.paymentMethod || 'bank_transfer',
      isActive: employee?.isActive ?? true,
    },
  });

  const basicSalary = watch('basicSalary');
  const houseAllowance = watch('houseAllowance');
  const transportAllowance = watch('transportAllowance');
  const otherAllowances = watch('otherAllowances');
  const grossPay = (basicSalary || 0) + (houseAllowance || 0) + (transportAllowance || 0) + (otherAllowances || 0);

  function toggleDeduction(dedId: number) {
    setDeductionAssignments((prev) => {
      const exists = prev.find((d) => d.deductionId === dedId);
      if (exists) {
        return prev.filter((d) => d.deductionId !== dedId);
      }
      return [...prev, { deductionId: dedId, amount: 0, isActive: true }];
    });
  }

  function updateDeductionAmount(dedId: number, amount: number) {
    setDeductionAssignments((prev) =>
      prev.map((d) => (d.deductionId === dedId ? { ...d, amount } : d))
    );
  }

  async function onSubmit(data: EmployeeFormValues) {
    setLoading(true);
    try {
      const payload = {
        ...data,
        customDeductions: deductionAssignments.filter((d) => d.amount > 0),
      };

      const url = isNew ? '/api/employees' : `/api/employees/${employee!.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Failed to save employee');
        return;
      }

      toast.success(isNew ? 'Employee created' : 'Employee updated');
      router.push('/employees');
      router.refresh();
    } catch {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!employee) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Employee deactivated');
      router.push('/employees');
      router.refresh();
    } catch {
      toast.error('Failed to deactivate employee');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isNew ? 'Add Employee' : `Edit: ${employee?.fullName}`}
        </h1>
        <div className="flex items-center gap-2">
          {!isNew && employee?.isActive && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm" disabled={loading}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Deactivate
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deactivate Employee</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to deactivate {employee?.fullName}? They will no longer appear in payroll runs.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Deactivate</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isNew ? 'Create Employee' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employeeNo">Employee No *</Label>
                <Input id="employeeNo" {...register('employeeNo')} />
                {errors.employeeNo && <p className="text-sm text-destructive">{errors.employeeNo.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input id="fullName" {...register('fullName')} />
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="idNumber">ID Number *</Label>
                <Input id="idNumber" {...register('idNumber')} />
                {errors.idNumber && <p className="text-sm text-destructive">{errors.idNumber.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="kraPin">KRA PIN</Label>
                <Input id="kraPin" {...register('kraPin')} placeholder="e.g. A001234567X" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nssfNo">NSSF No</Label>
                <Input id="nssfNo" {...register('nssfNo')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nhifNo">NHIF/SHIF No</Label>
                <Input id="nhifNo" {...register('nhifNo')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Employment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input id="department" {...register('department')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="designation">Designation</Label>
                <Input id="designation" {...register('designation')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfJoining">Date of Joining</Label>
              <Input id="dateOfJoining" type="date" {...register('dateOfJoining')} />
            </div>
            {!isNew && (
              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="isActive">Active Status</Label>
                <Switch
                  id="isActive"
                  checked={watch('isActive')}
                  onCheckedChange={(checked) => setValue('isActive', checked)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Earnings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Earnings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="basicSalary">Basic Salary (KES) *</Label>
                <Input id="basicSalary" type="number" step="0.01" min="0" {...register('basicSalary')} />
                {errors.basicSalary && <p className="text-sm text-destructive">{errors.basicSalary.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="houseAllowance">House Allowance (KES)</Label>
                <Input id="houseAllowance" type="number" step="0.01" min="0" {...register('houseAllowance')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transportAllowance">Transport Allowance (KES)</Label>
                <Input id="transportAllowance" type="number" step="0.01" min="0" {...register('transportAllowance')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otherAllowances">Other Allowances (KES)</Label>
                <Input id="otherAllowances" type="number" step="0.01" min="0" {...register('otherAllowances')} />
              </div>
            </div>
            <Separator />
            <div className="flex justify-between items-center pt-1">
              <span className="text-sm font-medium text-muted-foreground">Gross Cash Pay</span>
              <span className="text-lg font-bold text-[#1B3A6B]">{formatCurrency(grossPay)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Fringe Benefits */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fringe Benefits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="airtimeBenefit">Airtime (KES)</Label>
                <Input id="airtimeBenefit" type="number" step="0.01" min="0" {...register('airtimeBenefit')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="internetBenefit">Internet (KES)</Label>
                <Input id="internetBenefit" type="number" step="0.01" min="0" {...register('internetBenefit')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="otherFringeBenefits">Other Fringe Benefits (KES)</Label>
              <Input id="otherFringeBenefits" type="number" step="0.01" min="0" {...register('otherFringeBenefits')} />
            </div>
            <p className="text-xs text-muted-foreground">
              Fringe benefits are added to PAYE gross income but not deducted from net pay.
            </p>
          </CardContent>
        </Card>

        {/* Banking Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Banking Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input id="bankName" {...register('bankName')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankBranch">Branch</Label>
                <Input id="bankBranch" {...register('bankBranch')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankAccountNo">Account Number</Label>
                <Input id="bankAccountNo" {...register('bankAccountNo')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankCode">Bank Code</Label>
                <Input id="bankCode" {...register('bankCode')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={watch('paymentMethod')}
                onValueChange={(value) => setValue('paymentMethod', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Custom Deductions Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Custom Deductions</CardTitle>
          </CardHeader>
          <CardContent>
            {orgDeductions.filter((d) => d.isActive).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No custom deduction types configured for this organisation.
              </p>
            ) : (
              <div className="space-y-3">
                {orgDeductions
                  .filter((d) => d.isActive)
                  .map((ded) => {
                    const assignment = deductionAssignments.find((a) => a.deductionId === ded.id);
                    const isAssigned = !!assignment;
                    return (
                      <div
                        key={ded.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                      >
                        <Switch
                          checked={isAssigned}
                          onCheckedChange={() => toggleDeduction(ded.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{ded.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {ded.deductionType === 'percent' ? 'Percentage' : 'Fixed amount'}
                            {ded.isPensionContribution && ' · Pension'}
                            {ded.isEmployerCost && ' · Employer cost'}
                          </p>
                        </div>
                        {isAssigned && (
                          <div className="w-32">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder={ded.deductionType === 'percent' ? '%' : 'KES'}
                              value={assignment?.amount || ''}
                              onChange={(e) =>
                                updateDeductionAmount(ded.id, Number(e.target.value) || 0)
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Calculator, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import type { CustomDeduction } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';

const deductionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  deductionType: z.enum(['fixed', 'percent']),
  isPensionContribution: z.boolean().default(false),
  isEmployerCost: z.boolean().default(false),
});

type DeductionFormValues = z.infer<typeof deductionSchema>;

interface CustomDeductionsClientProps {
  deductions: CustomDeduction[];
  role: 'admin' | 'accountant' | 'hr';
}

export function CustomDeductionsClient({ deductions, role }: CustomDeductionsClientProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomDeduction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomDeduction | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DeductionFormValues>({
    resolver: zodResolver(deductionSchema),
    defaultValues: {
      name: '',
      description: '',
      deductionType: 'fixed',
      isPensionContribution: false,
      isEmployerCost: false,
    },
  });

  function openCreate() {
    setEditing(null);
    reset({
      name: '',
      description: '',
      deductionType: 'fixed',
      isPensionContribution: false,
      isEmployerCost: false,
    });
    setDialogOpen(true);
  }

  function openEdit(ded: CustomDeduction) {
    setEditing(ded);
    reset({
      name: ded.name,
      description: ded.description || '',
      deductionType: ded.deductionType as 'fixed' | 'percent',
      isPensionContribution: ded.isPensionContribution || false,
      isEmployerCost: ded.isEmployerCost || false,
    });
    setDialogOpen(true);
  }

  async function onSubmit(data: DeductionFormValues) {
    setLoading(true);
    try {
      const url = editing ? `/api/custom-deductions/${editing.id}` : '/api/custom-deductions';
      const method = editing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Failed to save');
        return;
      }

      toast.success(editing ? 'Deduction updated' : 'Deduction created');
      setDialogOpen(false);
      router.refresh();
    } catch {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(ded: CustomDeduction) {
    setLoading(true);
    try {
      const res = await fetch(`/api/custom-deductions/${ded.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success(`${ded.name} deactivated`);
      setDeleteTarget(null);
      router.refresh();
    } catch {
      toast.error('Failed to deactivate');
    } finally {
      setLoading(false);
    }
  }

  const canEdit = role === 'admin' || role === 'accountant';
  const activeCount = deductions.filter((d) => d.isActive).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Custom Deductions</h1>
          <Badge variant="secondary" className="text-sm">
            {activeCount} active
          </Badge>
        </div>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Deduction Type
          </Button>
        )}
      </div>

      {deductions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Calculator className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No custom deduction types defined</p>
          <p className="text-xs mt-1">
            Custom deductions let you define SACCO, loan, or pension contributions per employee.
          </p>
          {canEdit && (
            <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Deduction Type
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Pension</TableHead>
                <TableHead>Employer Cost</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="w-24">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {deductions.map((ded) => (
                <TableRow key={ded.id}>
                  <TableCell className="font-medium">{ded.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {ded.description || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {ded.deductionType === 'percent' ? 'Percentage' : 'Fixed'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {ded.isPensionContribution ? (
                      <Badge variant="default" className="bg-blue-600">Yes</Badge>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {ded.isEmployerCost ? (
                      <Badge variant="default" className="bg-purple-600">Yes</Badge>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ded.isActive ? 'default' : 'secondary'}>
                      {ded.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(ded)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {ded.isActive && role === 'admin' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(ded)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Deduction Type' : 'New Deduction Type'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update the deduction type details.'
                : 'Define a new custom deduction type for your organisation.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ded-name">Name *</Label>
              <Input id="ded-name" {...register('name')} placeholder="e.g. SACCO Contribution" />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ded-description">Description</Label>
              <Input id="ded-description" {...register('description')} placeholder="Optional description" />
            </div>

            <div className="space-y-2">
              <Label>Deduction Type</Label>
              <Select
                value={watch('deductionType')}
                onValueChange={(v) => setValue('deductionType', v as 'fixed' | 'percent')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Amount (KES)</SelectItem>
                  <SelectItem value="percent">Percentage of Gross</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="ded-pension">Pension Contribution</Label>
                <p className="text-xs text-muted-foreground">Qualifies for pension tax relief</p>
              </div>
              <Switch
                id="ded-pension"
                checked={watch('isPensionContribution')}
                onCheckedChange={(v) => setValue('isPensionContribution', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="ded-employer">Employer Cost</Label>
                <p className="text-xs text-muted-foreground">Not deducted from employee net pay</p>
              </div>
              <Switch
                id="ded-employer"
                checked={watch('isEmployerCost')}
                onCheckedChange={(v) => setValue('isEmployerCost', v)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Deduction Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate &quot;{deleteTarget?.name}&quot;? It will no longer be available for assignment to employees.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && handleDelete(deleteTarget)}>
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

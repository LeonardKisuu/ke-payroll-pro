'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Plus, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';

import { formatCurrency } from '@/lib/utils';
import type { Employee } from '@/types';
import { DataTable, SortableHeader } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

interface EmployeesClientProps {
  employees: Employee[];
  role: 'admin' | 'accountant' | 'hr';
}

export function EmployeesClient({ employees, role }: EmployeesClientProps) {
  const router = useRouter();
  const [toggleTarget, setToggleTarget] = useState<Employee | null>(null);

  async function handleToggleActive(emp: Employee) {
    try {
      if (emp.isActive) {
        const res = await fetch(`/api/employees/${emp.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        toast.success(`${emp.fullName} deactivated`);
      } else {
        const res = await fetch(`/api/employees/${emp.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...emp, isActive: true }),
        });
        if (!res.ok) throw new Error();
        toast.success(`${emp.fullName} reactivated`);
      }
      setToggleTarget(null);
      router.refresh();
    } catch {
      toast.error('Failed to update employee status');
    }
  }

  const columns: ColumnDef<Employee>[] = [
    {
      accessorKey: 'employeeNo',
      header: ({ column }) => <SortableHeader column={column}>Emp No</SortableHeader>,
      cell: ({ row }) => (
        <Link href={`/employees/${row.original.id}`} className="font-medium text-primary hover:underline">
          {row.getValue('employeeNo')}
        </Link>
      ),
    },
    {
      accessorKey: 'fullName',
      header: ({ column }) => <SortableHeader column={column}>Full Name</SortableHeader>,
    },
    {
      accessorKey: 'idNumber',
      header: 'ID Number',
    },
    {
      accessorKey: 'kraPin',
      header: 'KRA PIN',
      cell: ({ row }) => row.getValue('kraPin') || '—',
    },
    {
      accessorKey: 'department',
      header: ({ column }) => <SortableHeader column={column}>Department</SortableHeader>,
      cell: ({ row }) => row.getValue('department') || '—',
    },
    {
      accessorKey: 'designation',
      header: 'Designation',
      cell: ({ row }) => row.getValue('designation') || '—',
    },
    {
      accessorKey: 'basicSalary',
      header: ({ column }) => <SortableHeader column={column}>Basic Salary</SortableHeader>,
      cell: ({ row }) => (
        <span className="font-mono text-right block">
          {formatCurrency(row.getValue('basicSalary') as number)}
        </span>
      ),
    },
    {
      id: 'grossPay',
      header: 'Gross Pay',
      cell: ({ row }) => {
        const emp = row.original;
        const gross =
          (emp.basicSalary || 0) +
          (emp.houseAllowance || 0) +
          (emp.transportAllowance || 0) +
          (emp.otherAllowances || 0);
        return <span className="font-mono text-right block">{formatCurrency(gross)}</span>;
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.getValue('isActive') ? 'default' : 'secondary'}>
          {row.getValue('isActive') ? 'Active' : 'Inactive'}
        </Badge>
      ),
      filterFn: (row, id, value) => {
        if (value === 'all') return true;
        return row.getValue(id) === (value === 'true');
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const emp = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/employees/${emp.id}`}>Edit</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setToggleTarget(emp)}>
                {emp.isActive ? (
                  <>
                    <UserX className="mr-2 h-4 w-4" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Reactivate
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const activeCount = employees.filter((e) => e.isActive).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Employees</h1>
          <Badge variant="secondary" className="text-sm">
            {activeCount} active
          </Badge>
        </div>
        {(role === 'admin' || role === 'accountant') && (
          <Button asChild>
            <Link href="/employees/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Link>
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={employees}
        searchPlaceholder="Search by name, employee no, ID, KRA PIN..."
      />

      <AlertDialog open={!!toggleTarget} onOpenChange={(open) => !open && setToggleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.isActive ? 'Deactivate' : 'Reactivate'} Employee
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.isActive
                ? `Are you sure you want to deactivate ${toggleTarget?.fullName}? They will no longer appear in payroll runs.`
                : `Reactivate ${toggleTarget?.fullName}? They will be included in future payroll runs.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => toggleTarget && handleToggleActive(toggleTarget)}>
              {toggleTarget?.isActive ? 'Deactivate' : 'Reactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

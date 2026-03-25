'use client';

import { useState } from 'react';
import {
  Download,
  Building2,
  FileSpreadsheet,
  Receipt,
  Shield,
  Heart,
  Home,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const EXPORT_TYPES = [
  {
    type: 'bank',
    label: 'Bank Payment Schedule',
    description: 'Net pay details with bank account information for each employee',
    icon: Building2,
  },
  {
    type: 'summary',
    label: 'Full Payroll Summary',
    description: 'Complete breakdown of all earnings, deductions, and statutory contributions',
    icon: FileSpreadsheet,
  },
  {
    type: 'kra',
    label: 'KRA P10 Schedule',
    description: 'PAYE remittance schedule for Kenya Revenue Authority filing',
    icon: Receipt,
  },
  {
    type: 'nssf',
    label: 'NSSF Schedule',
    description: 'Employee and employer NSSF contributions for remittance',
    icon: Shield,
  },
  {
    type: 'shif',
    label: 'SHIF Schedule',
    description: 'Social Health Insurance Fund contribution schedule',
    icon: Heart,
  },
  {
    type: 'ahl',
    label: 'AHL Schedule',
    description: 'Affordable Housing Levy employee and employer contributions',
    icon: Home,
  },
] as const;

interface ExportsClientProps {
  orgId: number;
}

export function ExportsClient({ orgId }: ExportsClientProps) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  function handleDownload(type: string) {
    window.open(
      `/api/exports?type=${type}&month=${month}&year=${year}&orgId=${orgId}`,
      '_blank'
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Export Reports</h1>

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
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10) || now.getFullYear())}
                className="w-28"
                min={2020}
                max={2099}
              />
            </div>
            <p className="text-sm text-muted-foreground pb-2">
              Select the payroll period, then click any export button below.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Export Buttons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {EXPORT_TYPES.map(({ type, label, description, icon: Icon }) => (
          <Card key={type} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Icon className="h-5 w-5 text-[#1B3A6B]" />
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{description}</p>
              <Button
                onClick={() => handleDownload(type)}
                className="w-full"
                variant="outline"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Excel
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

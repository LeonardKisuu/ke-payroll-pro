import { requireSession } from '@/lib/session-helpers';
import { db } from '@/lib/db';
import { employees, payrollRuns, payrollRecords, organisations } from '@/drizzle/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  DollarSign,
  Receipt,
  Wallet,
  Building2,
  Clock,
} from 'lucide-react';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default async function DashboardPage() {
  const session = await requireSession();
  const orgId = session.orgId;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Fetch data in parallel
  const [
    activeEmployees,
    currentMonthRecords,
    recentRuns,
    currentOrg,
    pendingRunsCount,
  ] = await Promise.all([
    orgId
      ? db.select({ count: sql<number>`count(*)` })
          .from(employees)
          .where(and(eq(employees.orgId, orgId), eq(employees.isActive, true)))
      : Promise.resolve([{ count: 0 }]),

    orgId
      ? db.select({
          totalGross: sql<number>`coalesce(sum(${payrollRecords.grossPay}), 0)`,
          totalPaye: sql<number>`coalesce(sum(${payrollRecords.paye}), 0)`,
          totalNet: sql<number>`coalesce(sum(${payrollRecords.netPay}), 0)`,
          totalNssfEmployer: sql<number>`coalesce(sum(${payrollRecords.nssfEmployer}), 0)`,
          totalAhlEmployer: sql<number>`coalesce(sum(${payrollRecords.ahlEmployer}), 0)`,
          totalNita: sql<number>`coalesce(sum(${payrollRecords.nita}), 0)`,
        })
          .from(payrollRecords)
          .innerJoin(payrollRuns, eq(payrollRecords.runId, payrollRuns.id))
          .where(
            and(
              eq(payrollRecords.orgId, orgId),
              eq(payrollRuns.month, currentMonth),
              eq(payrollRuns.year, currentYear)
            )
          )
      : Promise.resolve([{
          totalGross: 0, totalPaye: 0, totalNet: 0,
          totalNssfEmployer: 0, totalAhlEmployer: 0, totalNita: 0,
        }]),

    orgId
      ? db.select()
          .from(payrollRuns)
          .where(eq(payrollRuns.orgId, orgId))
          .orderBy(desc(payrollRuns.year), desc(payrollRuns.month))
          .limit(5)
      : Promise.resolve([]),

    orgId
      ? db.query.organisations.findFirst({ where: eq(organisations.id, orgId) })
      : Promise.resolve(null),

    orgId
      ? db.select({ count: sql<number>`count(*)` })
          .from(payrollRuns)
          .where(and(eq(payrollRuns.orgId, orgId), eq(payrollRuns.isFinal, false)))
      : Promise.resolve([{ count: 0 }]),
  ]);

  const employeeCount = activeEmployees[0]?.count || 0;
  const monthData = currentMonthRecords[0] || {
    totalGross: 0, totalPaye: 0, totalNet: 0,
    totalNssfEmployer: 0, totalAhlEmployer: 0, totalNita: 0,
  };
  const employerCosts = (monthData.totalNssfEmployer || 0) + (monthData.totalAhlEmployer || 0) + (monthData.totalNita || 0);
  const pendingCount = pendingRunsCount[0]?.count || 0;

  const kpiCards = [
    {
      title: 'Total Employees',
      value: employeeCount.toString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      title: 'Total Gross Pay',
      value: formatCurrency(monthData.totalGross || 0),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950',
    },
    {
      title: 'Total PAYE',
      value: formatCurrency(monthData.totalPaye || 0),
      icon: Receipt,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
    },
    {
      title: 'Total Net Pay',
      value: formatCurrency(monthData.totalNet || 0),
      icon: Wallet,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950',
    },
    {
      title: 'Employer Costs',
      value: formatCurrency(employerCosts),
      icon: Building2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
      subtitle: 'NSSF + AHL + NITA',
    },
    {
      title: 'Pending Payrolls',
      value: pendingCount.toString(),
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome, {session.fullName || session.username}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {currentOrg ? currentOrg.name : 'No organisation selected'} &middot;{' '}
          {now.toLocaleDateString('en-KE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{kpi.title}</p>
                  <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                  {kpi.subtitle && (
                    <p className="text-xs text-muted-foreground">{kpi.subtitle}</p>
                  )}
                </div>
                <div className={`p-2.5 rounded-lg ${kpi.bgColor}`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Payroll Runs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Recent Payroll Runs</CardTitle>
        </CardHeader>
        <CardContent>
          {recentRuns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No payroll runs yet</p>
              <p className="text-xs">Run your first payroll to see results here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Run Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium">
                      {MONTH_NAMES[run.month]} {run.year}
                    </TableCell>
                    <TableCell>
                      <Badge variant={run.isFinal ? 'default' : 'secondary'}>
                        {run.isFinal ? 'Final' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {run.runAt
                        ? new Date(run.runAt).toLocaleDateString('en-KE', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

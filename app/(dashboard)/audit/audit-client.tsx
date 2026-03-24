'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

interface AuditEntry {
  id: number;
  userId: number | null;
  action: string;
  entity: string;
  entityId: number | null;
  details: string | null;
  orgId: number | null;
  createdAt: string | null;
  userName?: string;
}

const PAGE_SIZE = 25;

const ACTION_COLORS: Record<string, string> = {
  create: 'default',
  update: 'secondary',
  delete: 'destructive',
  deactivate: 'destructive',
  reactivate: 'default',
  import_create: 'default',
  import_update: 'secondary',
  override_apply: 'secondary',
  password_reset: 'outline',
};

export function AuditClient({ orgId }: { orgId: number | null }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (orgId) params.set('orgId', String(orgId));
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entity', entityFilter);
      if (searchTerm) params.set('search', searchTerm);
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));

      const res = await fetch(`/api/audit?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setEntries(data.entries || []);
      setTotalCount(data.total || 0);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, dateFrom, dateTo, actionFilter, entityFilter, searchTerm, page]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  function applyFilters() {
    setPage(1);
    fetchAudit();
  }

  function clearFilters() {
    setDateFrom('');
    setDateTo('');
    setActionFilter('');
    setEntityFilter('');
    setSearchTerm('');
    setPage(1);
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function formatDate(iso: string | null) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Trail</h1>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs">From Date</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">To Date</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Action</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger><SelectValue placeholder="All actions" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="deactivate">Deactivate</SelectItem>
                  <SelectItem value="reactivate">Reactivate</SelectItem>
                  <SelectItem value="import_create">Import Create</SelectItem>
                  <SelectItem value="import_update">Import Update</SelectItem>
                  <SelectItem value="override_apply">Override Apply</SelectItem>
                  <SelectItem value="password_reset">Password Reset</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Entity</Label>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger><SelectValue placeholder="All entities" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All entities</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="payroll_run">Payroll Run</SelectItem>
                  <SelectItem value="organisation">Organisation</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="custom_deduction">Custom Deduction</SelectItem>
                  <SelectItem value="statutory_rates">Statutory Rates</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Search Details</Label>
              <div className="flex gap-1">
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                />
                <Button size="sm" variant="outline" onClick={applyFilters}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <Button variant="ghost" size="sm" onClick={clearFilters}>Clear Filters</Button>
            <Badge variant="secondary">{totalCount} record(s)</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead className="w-20">ID</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No audit entries found.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(entry.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.userName || `User #${entry.userId}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={(ACTION_COLORS[entry.action] as 'default' | 'secondary' | 'destructive' | 'outline') || 'secondary'}>
                          {entry.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {entry.entity.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {entry.entityId || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {entry.details || '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

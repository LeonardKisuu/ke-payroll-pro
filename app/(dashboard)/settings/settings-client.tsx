'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Palette,
  Pencil,
  Plus,
  Loader2,
  KeyRound,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
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
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

interface User {
  id: number;
  username: string;
  passwordHash: string;
  fullName: string | null;
  email: string | null;
  role: string;
  orgId: number | null;
  employeeId: number | null;
  isActive: boolean | null;
  createdAt: string | null;
}

interface Org {
  id: number;
  name: string;
  kraPin: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  address: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  isActive: boolean | null;
  createdAt: string | null;
}

interface StatutoryRate {
  id: number;
  rateType: string;
  rateKey: string;
  rateValue: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  description: string | null;
}

interface SettingsClientProps {
  users: User[];
  organisations: Org[];
  currentOrgId: number | null;
}

// ── PAYE bands display ────────────────────────────────────────────
const DEFAULT_PAYE_BANDS = [
  { min: 0, max: 24000, rate: 10 },
  { min: 24001, max: 32333, rate: 25 },
  { min: 32334, max: 500000, rate: 30 },
  { min: 500001, max: 800000, rate: 32.5 },
  { min: 800001, max: Infinity, rate: 35 },
];

const DEFAULT_RATES = {
  nssf_tier1_limit: 9000,
  nssf_tier2_limit: 108000,
  nssf_rate: 6,
  shif_rate: 2.75,
  shif_minimum: 300,
  ahl_rate: 1.5,
  personal_relief: 2400,
  pension_relief_cap: 30000,
  nita: 50,
};

export function SettingsClient({ users: initialUsers, organisations, currentOrgId }: SettingsClientProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Tabs defaultValue="rates" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rates" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Statutory Rates
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rates">
          <StatutoryRatesTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab initialUsers={initialUsers} organisations={organisations} />
        </TabsContent>
        <TabsContent value="branding">
          <BrandingTab organisations={organisations} currentOrgId={currentOrgId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// STATUTORY RATES TAB
// ══════════════════════════════════════════════════════════════════════

function StatutoryRatesTab() {
  const [rates, setRates] = useState<Record<string, number>>(DEFAULT_RATES);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editRates, setEditRates] = useState(DEFAULT_RATES);

  useEffect(() => {
    fetch('/api/settings/rates')
      .then((r) => r.json())
      .then((data) => {
        if (data.rates && Object.keys(data.rates).length > 0) {
          setRates(data.rates);
          setEditRates(data.rates);
        }
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rates: editRates, effectiveFrom: new Date().toISOString().split('T')[0] }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setRates(editRates);
      setEditing(false);
      toast.success('Statutory rates updated');
    } catch {
      toast.error('Failed to save rates');
    } finally {
      setSaving(false);
    }
  }

  function RateCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-[#1B3A6B] uppercase tracking-wide">{title}</CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    );
  }

  function RateRow({ label, value, suffix = '' }: { label: string; value: number | string; suffix?: string }) {
    return (
      <div className="flex justify-between py-1 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}{suffix}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Kenya 2026 Statutory Rates</h2>
          <p className="text-sm text-muted-foreground">Finance Act 2023/2024, NSSF Act 2013 Year 4</p>
        </div>
        {!editing ? (
          <Button variant="outline" onClick={() => { setEditRates({ ...rates } as typeof DEFAULT_RATES); setEditing(true); }}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Rates
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        )}
      </div>

      {!editing ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <RateCard title="PAYE Tax Bands (Monthly)">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Band (KES)</TableHead>
                  <TableHead className="text-xs text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DEFAULT_PAYE_BANDS.map((b, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs py-1">
                      {formatCurrency(b.min)} — {b.max === Infinity ? '∞' : formatCurrency(b.max)}
                    </TableCell>
                    <TableCell className="text-xs text-right py-1">{b.rate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </RateCard>

          <RateCard title="NSSF (Act 2013 Year 4)">
            <RateRow label="Rate" value={rates.nssf_rate} suffix="%" />
            <RateRow label="Tier I Limit" value={formatCurrency(rates.nssf_tier1_limit)} />
            <RateRow label="Tier II Limit" value={formatCurrency(rates.nssf_tier2_limit)} />
          </RateCard>

          <RateCard title="SHIF">
            <RateRow label="Rate" value={rates.shif_rate} suffix="%" />
            <RateRow label="Minimum" value={formatCurrency(rates.shif_minimum)} />
          </RateCard>

          <RateCard title="AHL (Housing Levy)">
            <RateRow label="Employee Rate" value={rates.ahl_rate} suffix="%" />
            <RateRow label="Employer Rate" value={rates.ahl_rate} suffix="%" />
          </RateCard>

          <RateCard title="Tax Reliefs">
            <RateRow label="Personal Relief" value={formatCurrency(rates.personal_relief)} suffix="/month" />
            <RateRow label="Pension Relief Cap" value={formatCurrency(rates.pension_relief_cap)} suffix="/month" />
          </RateCard>

          <RateCard title="Other">
            <RateRow label="NITA Levy" value={formatCurrency(rates.nita)} suffix="/month" />
          </RateCard>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">NSSF</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Rate (%)</Label>
                <Input type="number" step="0.01" value={editRates.nssf_rate} onChange={(e) => setEditRates((p) => ({ ...p, nssf_rate: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label>Tier I Limit (KES)</Label>
                <Input type="number" value={editRates.nssf_tier1_limit} onChange={(e) => setEditRates((p) => ({ ...p, nssf_tier1_limit: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label>Tier II Limit (KES)</Label>
                <Input type="number" value={editRates.nssf_tier2_limit} onChange={(e) => setEditRates((p) => ({ ...p, nssf_tier2_limit: parseFloat(e.target.value) || 0 }))} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">SHIF</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Rate (%)</Label>
                <Input type="number" step="0.01" value={editRates.shif_rate} onChange={(e) => setEditRates((p) => ({ ...p, shif_rate: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label>Minimum (KES)</Label>
                <Input type="number" value={editRates.shif_minimum} onChange={(e) => setEditRates((p) => ({ ...p, shif_minimum: parseFloat(e.target.value) || 0 }))} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">AHL</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Rate (%)</Label>
                <Input type="number" step="0.01" value={editRates.ahl_rate} onChange={(e) => setEditRates((p) => ({ ...p, ahl_rate: parseFloat(e.target.value) || 0 }))} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Tax Reliefs &amp; Other</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Personal Relief (KES/month)</Label>
                <Input type="number" value={editRates.personal_relief} onChange={(e) => setEditRates((p) => ({ ...p, personal_relief: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label>Pension Relief Cap (KES/month)</Label>
                <Input type="number" value={editRates.pension_relief_cap} onChange={(e) => setEditRates((p) => ({ ...p, pension_relief_cap: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label>NITA (KES/month)</Label>
                <Input type="number" value={editRates.nita} onChange={(e) => setEditRates((p) => ({ ...p, nita: parseFloat(e.target.value) || 0 }))} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// USERS TAB
// ══════════════════════════════════════════════════════════════════════

interface UserForm {
  username: string;
  password: string;
  fullName: string;
  email: string;
  role: string;
  orgId: string;
  employeeId: string;
}

const emptyUserForm: UserForm = {
  username: '',
  password: '',
  fullName: '',
  email: '',
  role: 'hr',
  orgId: '',
  employeeId: '',
};

function UsersTab({ initialUsers, organisations }: { initialUsers: User[]; organisations: Org[] }) {
  const [usersList, setUsersList] = useState(initialUsers);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<UserForm>(emptyUserForm);
  const [saving, setSaving] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<User | null>(null);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  function openCreate() {
    setEditingId(null);
    setForm(emptyUserForm);
    setDialogOpen(true);
  }

  function openEdit(user: User) {
    setEditingId(user.id);
    setForm({
      username: user.username,
      password: '',
      fullName: user.fullName || '',
      email: user.email || '',
      role: user.role,
      orgId: user.orgId ? String(user.orgId) : '',
      employeeId: user.employeeId ? String(user.employeeId) : '',
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!editingId && !form.username.trim()) {
      toast.error('Username is required');
      return;
    }
    if (!editingId && !form.password) {
      toast.error('Password is required for new users');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        orgId: form.orgId ? parseInt(form.orgId, 10) : null,
        employeeId: form.employeeId ? parseInt(form.employeeId, 10) : null,
      };

      if (editingId) {
        const res = await fetch(`/api/users/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed');
        }
        const updated = await res.json();
        setUsersList((prev) => prev.map((u) => (u.id === editingId ? { ...u, ...updated } : u)));
        toast.success('User updated');
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed');
        }
        const created = await res.json();
        setUsersList((prev) => [...prev, created]);
        toast.success('User created');
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle() {
    if (!toggleTarget) return;
    try {
      const res = await fetch(`/api/users/${toggleTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed');
      setUsersList((prev) =>
        prev.map((u) =>
          u.id === toggleTarget.id ? { ...u, isActive: !toggleTarget.isActive } : u
        )
      );
      toast.success(toggleTarget.isActive ? 'User deactivated' : 'User reactivated');
    } catch {
      toast.error('Operation failed');
    } finally {
      setToggleTarget(null);
    }
  }

  async function handleResetPassword() {
    if (!resetTarget || !newPassword) return;
    try {
      const res = await fetch(`/api/users/${resetTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Password reset successfully');
    } catch {
      toast.error('Failed to reset password');
    } finally {
      setResetTarget(null);
      setNewPassword('');
    }
  }

  const orgName = (orgId: number | null) => {
    if (!orgId) return '—';
    return organisations.find((o) => o.id === orgId)?.name || `Org #${orgId}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">User Management</h2>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersList.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-mono text-sm">{user.username}</TableCell>
                  <TableCell>{user.fullName || '—'}</TableCell>
                  <TableCell className="text-sm">{user.email || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : user.role === 'accountant' ? 'secondary' : 'outline'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{orgName(user.orgId)}</TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'default' : 'secondary'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setResetTarget(user); setNewPassword(''); }}>
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setToggleTarget(user)}
                        className="text-xs"
                      >
                        {user.isActive ? 'Deactivate' : 'Reactivate'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit User' : 'Add User'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Username *</Label>
              <Input
                value={form.username}
                onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                disabled={!!editingId}
              />
            </div>
            {!editingId && (
              <div>
                <Label>Password *</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Full Name</Label>
                <Input
                  value={form.fullName}
                  onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="accountant">Accountant</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Organisation</Label>
              <Select value={form.orgId} onValueChange={(v) => setForm((p) => ({ ...p, orgId: v }))}>
                <SelectTrigger><SelectValue placeholder="No restriction" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No restriction</SelectItem>
                  {organisations.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.role === 'hr' && (
              <div>
                <Label>Linked Employee ID (for HR self-service)</Label>
                <Input
                  type="number"
                  value={form.employeeId}
                  onChange={(e) => setForm((p) => ({ ...p, employeeId: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Confirmation */}
      <AlertDialog open={!!toggleTarget} onOpenChange={(open) => !open && setToggleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.isActive ? 'Deactivate' : 'Reactivate'} User?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.isActive
                ? `"${toggleTarget.username}" will no longer be able to log in.`
                : `"${toggleTarget?.username}" will be able to log in again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggle}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password Reset Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password for {resetTarget?.username}</DialogTitle>
          </DialogHeader>
          <div>
            <Label>New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={!newPassword}>Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// BRANDING TAB
// ══════════════════════════════════════════════════════════════════════

function BrandingTab({ organisations, currentOrgId }: { organisations: Org[]; currentOrgId: number | null }) {
  const currentOrg = organisations.find((o) => o.id === currentOrgId) || organisations[0];
  const [logoUrl, setLogoUrl] = useState(currentOrg?.logoUrl || '');
  const [primary, setPrimary] = useState(currentOrg?.primaryColor || '#1B3A6B');
  const [secondary, setSecondary] = useState(currentOrg?.secondaryColor || '#C9A046');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!currentOrg) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/organisations/${currentOrg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoUrl, primaryColor: primary, secondaryColor: secondary }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Branding updated');
    } catch {
      toast.error('Failed to update branding');
    } finally {
      setSaving(false);
    }
  }

  if (!currentOrg) {
    return <p className="text-muted-foreground py-8 text-center">Select an organisation first.</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Branding — {currentOrg.name}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Brand Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Logo URL</Label>
              <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" />
            </div>
            <div>
              <Label>Primary Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="w-10 h-10 rounded border cursor-pointer" />
                <Input value={primary} onChange={(e) => setPrimary(e.target.value)} className="font-mono" />
              </div>
            </div>
            <div>
              <Label>Secondary Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} className="w-10 h-10 rounded border cursor-pointer" />
                <Input value={secondary} onChange={(e) => setSecondary(e.target.value)} className="font-mono" />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Branding
            </Button>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-sm">Preview</CardTitle>
            <CardDescription>How the payslip header will look</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-6 text-white" style={{ backgroundColor: primary }}>
              <p className="text-lg font-bold">{currentOrg.name}</p>
              <p className="text-sm opacity-90">PAYSLIP</p>
              <p className="text-xs opacity-75 mt-1">March 2026</p>
            </div>
            <div className="p-3 text-white text-sm font-semibold text-center" style={{ backgroundColor: secondary }}>
              Net Pay: KES 85,000.00
            </div>
            <div className="p-4 text-center text-xs text-muted-foreground">
              Generated by KE Payroll Pro | Taxwise Africa Consulting LLP
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

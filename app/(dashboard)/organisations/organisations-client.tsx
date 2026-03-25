'use client';

import { useState } from 'react';
import {
  Plus,
  Pencil,
  Building2,
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

interface Organisation {
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

interface OrgForm {
  name: string;
  kraPin: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
}

const emptyForm: OrgForm = {
  name: '',
  kraPin: '',
  logoUrl: '',
  primaryColor: '#1B3A6B',
  secondaryColor: '#C9A046',
  address: '',
  contactEmail: '',
  contactPhone: '',
};

export function OrganisationsClient({ organisations: initial }: { organisations: Organisation[] }) {
  const [orgs, setOrgs] = useState(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<OrgForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<Organisation | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(org: Organisation) {
    setEditingId(org.id);
    setForm({
      name: org.name,
      kraPin: org.kraPin || '',
      logoUrl: org.logoUrl || '',
      primaryColor: org.primaryColor || '#1B3A6B',
      secondaryColor: org.secondaryColor || '#C9A046',
      address: org.address || '',
      contactEmail: org.contactEmail || '',
      contactPhone: org.contactPhone || '',
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Organisation name is required');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/organisations/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error('Failed to update');
        const updated = await res.json();
        setOrgs((prev) => prev.map((o) => (o.id === editingId ? { ...o, ...updated } : o)));
        toast.success('Organisation updated');
      } else {
        const res = await fetch('/api/organisations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error('Failed to create');
        const created = await res.json();
        setOrgs((prev) => [...prev, created]);
        toast.success('Organisation created');
      }
      setDialogOpen(false);
    } catch {
      toast.error('Operation failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle() {
    if (!toggleTarget) return;
    try {
      const res = await fetch(`/api/organisations/${toggleTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !toggleTarget.isActive }),
      });
      if (!res.ok) throw new Error('Failed');
      setOrgs((prev) =>
        prev.map((o) =>
          o.id === toggleTarget.id ? { ...o, isActive: !toggleTarget.isActive } : o
        )
      );
      toast.success(toggleTarget.isActive ? 'Organisation deactivated' : 'Organisation reactivated');
    } catch {
      toast.error('Operation failed');
    } finally {
      setToggleTarget(null);
    }
  }

  function updateForm(field: keyof OrgForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Organisations</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Organisation
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>KRA PIN</TableHead>
                <TableHead>Colors</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{org.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{org.kraPin || '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span
                        className="inline-block w-5 h-5 rounded-full border"
                        style={{ backgroundColor: org.primaryColor || '#1B3A6B' }}
                        title={`Primary: ${org.primaryColor}`}
                      />
                      <span
                        className="inline-block w-5 h-5 rounded-full border"
                        style={{ backgroundColor: org.secondaryColor || '#C9A046' }}
                        title={`Secondary: ${org.secondaryColor}`}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {org.contactEmail && <p>{org.contactEmail}</p>}
                      {org.contactPhone && <p className="text-muted-foreground">{org.contactPhone}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={org.isActive ? 'default' : 'secondary'}>
                      {org.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(org)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setToggleTarget(org)}
                    >
                      {org.isActive ? 'Deactivate' : 'Reactivate'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {orgs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No organisations yet. Click &quot;Add Organisation&quot; to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Organisation' : 'Add Organisation'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Organisation Name *</Label>
              <Input value={form.name} onChange={(e) => updateForm('name', e.target.value)} />
            </div>
            <div>
              <Label>KRA PIN</Label>
              <Input value={form.kraPin} onChange={(e) => updateForm('kraPin', e.target.value)} placeholder="P000000000X" />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => updateForm('address', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contact Email</Label>
                <Input type="email" value={form.contactEmail} onChange={(e) => updateForm('contactEmail', e.target.value)} />
              </div>
              <div>
                <Label>Contact Phone</Label>
                <Input value={form.contactPhone} onChange={(e) => updateForm('contactPhone', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Logo URL</Label>
              <Input value={form.logoUrl} onChange={(e) => updateForm('logoUrl', e.target.value)} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Primary Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.primaryColor}
                    onChange={(e) => updateForm('primaryColor', e.target.value)}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <Input value={form.primaryColor} onChange={(e) => updateForm('primaryColor', e.target.value)} className="font-mono" />
                </div>
              </div>
              <div>
                <Label>Secondary Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.secondaryColor}
                    onChange={(e) => updateForm('secondaryColor', e.target.value)}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <Input value={form.secondaryColor} onChange={(e) => updateForm('secondaryColor', e.target.value)} className="font-mono" />
                </div>
              </div>
            </div>

            {/* Preview */}
            <Card className="overflow-hidden">
              <div className="p-3 text-white text-sm font-semibold" style={{ backgroundColor: form.primaryColor }}>
                {form.name || 'Organisation Name'}
              </div>
              <div className="p-2 text-white text-xs" style={{ backgroundColor: form.secondaryColor }}>
                Preview accent bar
              </div>
            </Card>
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
              {toggleTarget?.isActive ? 'Deactivate' : 'Reactivate'} Organisation?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.isActive
                ? `This will deactivate "${toggleTarget.name}". Users will no longer be able to select this organisation.`
                : `This will reactivate "${toggleTarget?.name}".`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggle}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

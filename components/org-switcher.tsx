'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Check, ChevronsUpDown, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import type { Organisation } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

interface OrgSwitcherProps {
  organisations: Organisation[];
  currentOrg: Organisation | null;
  collapsed?: boolean;
  isAdmin?: boolean;
}

export function OrgSwitcher({ organisations, currentOrg, collapsed, isAdmin }: OrgSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [switching, setSwitching] = useState(false);

  const filtered = organisations.filter((org) =>
    org.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSelect(orgId: number) {
    if (orgId === currentOrg?.id) {
      setOpen(false);
      return;
    }

    setSwitching(true);
    try {
      const res = await fetch('/api/auth/org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId }),
      });

      if (!res.ok) throw new Error('Failed to switch');

      toast.success('Organisation switched');
      setOpen(false);
      router.refresh();
    } catch {
      toast.error('Failed to switch organisation');
    } finally {
      setSwitching(false);
    }
  }

  if (collapsed) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="flex items-center justify-center w-full h-10 rounded-lg bg-white/10 hover:bg-white/15 transition-colors">
            {currentOrg ? (
              <div
                className="h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: currentOrg.primaryColor || '#1B3A6B' }}
              >
                {currentOrg.name.charAt(0)}
              </div>
            ) : (
              <Building2 className="h-5 w-5 text-white/60" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent side="right" align="start" className="w-64 p-0">
          <OrgList
            organisations={filtered}
            currentOrg={currentOrg}
            search={search}
            onSearchChange={setSearch}
            onSelect={handleSelect}
            switching={switching}
            isAdmin={isAdmin}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-3 w-full rounded-lg bg-white/10 hover:bg-white/15 px-3 py-2.5 transition-colors">
          {currentOrg ? (
            <div
              className="h-8 w-8 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: currentOrg.secondaryColor || '#C9A046' }}
            >
              {currentOrg.name.slice(0, 2).toUpperCase()}
            </div>
          ) : (
            <div className="h-8 w-8 rounded-md bg-white/20 flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4 text-white/60" />
            </div>
          )}
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {currentOrg?.name || 'Select Organisation'}
            </p>
            {currentOrg?.kraPin && (
              <p className="text-[10px] text-white/50 truncate">{currentOrg.kraPin}</p>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 text-white/40 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-64 p-0">
        <OrgList
          organisations={filtered}
          currentOrg={currentOrg}
          search={search}
          onSearchChange={setSearch}
          onSelect={handleSelect}
          switching={switching}
          isAdmin={isAdmin}
        />
      </PopoverContent>
    </Popover>
  );
}

function OrgList({
  organisations,
  currentOrg,
  search,
  onSearchChange,
  onSelect,
  switching,
  isAdmin,
}: {
  organisations: Organisation[];
  currentOrg: Organisation | null;
  search: string;
  onSearchChange: (v: string) => void;
  onSelect: (id: number) => void;
  switching: boolean;
  isAdmin?: boolean;
}) {
  return (
    <div>
      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search organisations..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>
      <Separator />
      <div className="max-h-60 overflow-y-auto p-1">
        {organisations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No organisations found</p>
        ) : (
          organisations.map((org) => (
            <button
              key={org.id}
              onClick={() => onSelect(org.id)}
              disabled={switching}
              className={cn(
                'flex items-center gap-3 w-full rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent',
                currentOrg?.id === org.id && 'bg-accent'
              )}
            >
              <div
                className="h-7 w-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ backgroundColor: org.secondaryColor || '#C9A046' }}
              >
                {org.name.slice(0, 2).toUpperCase()}
              </div>
              <span className="flex-1 text-left truncate">{org.name}</span>
              {currentOrg?.id === org.id && (
                <Check className="h-4 w-4 text-[#C9A046] shrink-0" />
              )}
            </button>
          ))
        )}
      </div>
      {isAdmin && (
        <>
          <Separator />
          <div className="p-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-sm"
              asChild
            >
              <a href="/organisations">
                <Plus className="h-4 w-4" />
                Add Organisation
              </a>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

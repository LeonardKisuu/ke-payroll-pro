'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Calculator,
  Play,
  FileText,
  Download,
  Upload,
  Building2,
  Receipt,
  Shield,
  Settings,
  Menu,
  LogOut,
  Moon,
  Sun,
  ChevronLeft,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import type { SessionPayload } from '@/lib/auth';
import type { Organisation } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { OrgSwitcher } from '@/components/org-switcher';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: Array<'admin' | 'accountant' | 'hr'>;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'accountant', 'hr'] },
  { label: 'Employees', href: '/employees', icon: Users, roles: ['admin', 'accountant'] },
  { label: 'Custom Deductions', href: '/custom-deductions', icon: Calculator, roles: ['admin', 'accountant'] },
  { label: 'Run Payroll', href: '/run-payroll', icon: Play, roles: ['admin', 'accountant'] },
  { label: 'Reports', href: '/reports', icon: FileText, roles: ['admin', 'accountant'] },
  { label: 'Exports', href: '/exports', icon: Download, roles: ['admin', 'accountant'] },
  { label: 'Import', href: '/import', icon: Upload, roles: ['admin', 'accountant'] },
  { label: 'Organisations', href: '/organisations', icon: Building2, roles: ['admin'] },
  { label: 'My Payslips', href: '/my-payslips', icon: Receipt, roles: ['admin', 'accountant', 'hr'] },
  { label: 'Audit Trail', href: '/audit', icon: Shield, roles: ['admin'] },
  { label: 'Settings', href: '/settings', icon: Settings, roles: ['admin'] },
];

interface DashboardShellProps {
  session: SessionPayload;
  organisations: Organisation[];
  currentOrg: Organisation | null;
  children: React.ReactNode;
}

export function DashboardShell({ session, organisations: orgs, currentOrg, children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredNav = NAV_ITEMS.filter((item) => item.roles.includes(session.role));

  const initials = (session.fullName || session.username)
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      toast.error('Failed to log out');
    }
  }

  function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <div className="flex flex-col h-full">
        {/* Org Switcher */}
        <div className="p-4">
          <OrgSwitcher
            organisations={orgs}
            currentOrg={currentOrg}
            collapsed={collapsed}
            isAdmin={session.role === 'admin'}
          />
        </div>

        <Separator className="bg-white/10" />

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {filteredNav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  collapsed && 'justify-center px-2',
                  isActive
                    ? 'bg-[#C9A046] text-white shadow-md'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
              >
                <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-white')} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <Separator className="bg-white/10" />

        {/* User Section */}
        <div className={cn('p-4', collapsed && 'px-2')}>
          <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
            <Avatar className="h-9 w-9 border-2 border-[#C9A046]">
              <AvatarFallback className="bg-[#C9A046] text-white text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {session.fullName || session.username}
                </p>
                <Badge variant="outline" className="border-[#C9A046]/50 text-[#C9A046] text-[10px] px-1.5 py-0">
                  {session.role}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col bg-[#1B3A6B] transition-all duration-300 ease-in-out',
          collapsed ? 'w-[68px]' : 'w-64'
        )}
      >
        <SidebarContent />

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-10 border-t border-white/10 text-white/50 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 border-b bg-card flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile Menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-[#1B3A6B] border-r-0">
                <SidebarContent onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              {currentOrg && (
                <>
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: currentOrg.primaryColor || '#1B3A6B' }}
                  />
                  <span className="font-semibold text-sm text-foreground hidden sm:inline">
                    {currentOrg.name}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-[#1B3A6B] text-white text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm hidden sm:inline">{session.fullName || session.username}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{session.fullName || session.username}</p>
                  <p className="text-xs text-muted-foreground">{session.role}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

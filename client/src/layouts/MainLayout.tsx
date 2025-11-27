/**
 * Main Layout
 *
 * Primary application layout with sidebar navigation, header, and content area.
 * Used for all authenticated pages.
 */

import { useState, type ReactNode, type JSX } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard,
  Handshake,
  Users,
  Car,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Bell,
  Store,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@design-system';
import { cn, getInitials, getFullName } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
}

/**
 * Navigation items
 */
const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/showroom', label: 'Showroom', icon: Store },
  { href: '/messages', label: 'Messages', icon: MessageCircle },
  { href: '/deals', label: 'Deals', icon: Handshake },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/inventory', label: 'Inventory', icon: Car },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function MainLayout({ children }: MainLayoutProps): JSX.Element {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform bg-sidebar/95 backdrop-blur-xl transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 shadow-premium-lg lg:shadow-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col border-r border-sidebar-border/50">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2.5 no-underline group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-premium-sm group-hover:shadow-premium transition-shadow">
                <Car className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-sidebar-foreground to-sidebar-foreground/80">
                Autolytiq
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-md p-1.5 text-sidebar-foreground hover:bg-sidebar-accent lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 no-underline',
                    isActive
                      ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-premium-sm'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground hover:translate-x-0.5'
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className={cn('h-5 w-5 transition-transform', isActive && 'scale-110')} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div className="border-t border-sidebar-border/50 p-4">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-sidebar-accent/30 hover:bg-sidebar-accent/50 transition-colors cursor-pointer">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-sm font-semibold text-primary-foreground shadow-premium-sm">
                {user ? getInitials(getFullName(user.first_name, user.last_name)) : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-sidebar-foreground">
                  {user ? getFullName(user.first_name, user.last_name) : 'User'}
                </p>
                <p className="truncate text-xs text-muted-foreground">{user?.email || ''}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 lg:px-6 shadow-premium-sm">
          {/* Left side - mobile menu button */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-2 text-foreground hover:bg-muted lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Dealership name (desktop) */}
            <div className="hidden lg:block">
              <h2 className="text-lg font-semibold text-foreground">
                {user?.dealership_name || 'Dealership'}
              </h2>
            </div>
          </div>

          {/* Right side - actions */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <button className="relative rounded-xl p-2 text-foreground hover:bg-muted/80 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive animate-pulse-soft" />
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-md p-2 text-foreground hover:bg-muted"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                  {user ? getInitials(getFullName(user.first_name, user.last_name)) : 'U'}
                </div>
                <ChevronDown
                  className={cn('h-4 w-4 transition-transform', userMenuOpen && 'rotate-180')}
                />
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-border/50 bg-popover/95 backdrop-blur-xl p-1.5 shadow-premium-lg animate-fade-in">
                    <div className="border-b border-border px-3 py-2">
                      <p className="text-sm font-medium text-foreground">
                        {user ? getFullName(user.first_name, user.last_name) : 'User'}
                      </p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/settings"
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground no-underline hover:bg-muted"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-gradient-to-b from-background to-muted/20">
          <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

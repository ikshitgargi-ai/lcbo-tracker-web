'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Activity,
  AlertTriangle,
  Target,
  MapPin,
  UtensilsCrossed,
  Flag,
  Globe2,
  Menu,
  X,
  ArrowDownUp,
  Database,
  Navigation,
  Sparkles,
  Zap,
  Calendar,
  Plus,
  TrendingUp,
  Tag,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Primary nav: 5 things on the bottom tab bar (mobile), expanded list in drawer.
// Consolidated: /listings + /new-distribution + /inventory-adds = /intel (one tabbed page).
// Order: HOME → BRANDS → INTEL → TODAY → LOG
const NAV = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/brands', label: 'Brands', icon: Tag },
  { href: '/intel', label: 'Intel', icon: Activity },
  { href: '/today', label: 'Today', icon: Calendar },
  { href: '/log', label: 'Log', icon: Plus },
  // Drawer-only (after the bottom-tab-bar slice of 5):
  { href: '/pipeline', label: 'Pipeline', icon: Target },
  { href: '/oos', label: 'OOS Risk', icon: AlertTriangle },
  { href: '/opportunities', label: 'Opportunities', icon: Trophy },
  { href: '/activity', label: 'Activity Feed', icon: Zap },
  { href: '/nearby', label: 'Nearby', icon: Navigation },
  { href: '/ask', label: 'Ask AI', icon: Sparkles },
];

// Secondary nav — shown in full drawer/sidebar but lower priority
const NAV_SECONDARY = [
  { href: '/sod', label: 'SOD Status', icon: Database },
  { href: '/map', label: 'Store Map', icon: MapPin },
  { href: '/territories', label: 'Territories', icon: Globe2 },
  { href: '/reports', label: 'Reports', icon: Activity },
  { href: '/goals', label: 'Goals', icon: Flag },
  { href: '/horeca', label: 'HORECA', icon: UtensilsCrossed },
  { href: '/reps', label: 'Reps', icon: ArrowDownUp },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile nav on route change
  useEffect(() => setOpen(false), [pathname]);

  // Lock body scroll when mobile nav open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <div className="min-h-[100dvh] bg-brand-grad">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 border-b border-[var(--color-card-border)] bg-[rgba(10,12,16,0.8)] backdrop-blur safe-top">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
          <span className="font-semibold">Anu LCBO</span>
        </Link>
        <button
          aria-label="Open menu"
          onClick={() => setOpen(!open)}
          className="h-11 w-11 flex items-center justify-center rounded-lg hover:bg-[var(--color-card)]"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <nav
            className="absolute top-0 right-0 bottom-0 w-[85%] max-w-sm bg-[var(--color-card)] border-l border-[var(--color-card-border)] safe-top overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 h-14 border-b border-[var(--color-card-border)]">
              <div className="flex items-center gap-2">
                <Logo />
                <span className="font-semibold">Anu LCBO</span>
              </div>
              <button
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="h-11 w-11 flex items-center justify-center rounded-lg hover:bg-[#1a1f29]"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-3 space-y-1">
              {NAV.map((item) => (
                <NavLink key={item.href} item={item} active={pathname === item.href} />
              ))}
              <div className="mt-4 mb-2 px-3 text-[10px] uppercase tracking-wider text-[var(--color-muted)] font-semibold">
                More
              </div>
              {NAV_SECONDARY.map((item) => (
                <NavLink key={item.href} item={item} active={pathname === item.href} />
              ))}
            </div>
          </nav>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-[var(--color-card-border)] bg-[rgba(18,21,27,0.8)] backdrop-blur safe-top">
        <div className="flex items-center gap-3 px-5 h-16 border-b border-[var(--color-card-border)]">
          <Logo />
          <div>
            <div className="text-sm font-semibold">Anu Spirits</div>
            <div className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider">
              LCBO Tracker Pro
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => (
            <NavLink key={item.href} item={item} active={pathname === item.href} />
          ))}
          <div className="mt-5 mb-2 px-3 text-[10px] uppercase tracking-wider text-[var(--color-muted)] font-semibold">
            More
          </div>
          {NAV_SECONDARY.map((item) => (
            <NavLink key={item.href} item={item} active={pathname === item.href} />
          ))}
        </nav>
        <div className="p-4 text-[10px] text-[var(--color-muted)] border-t border-[var(--color-card-border)]">
          Anu Spirits · Tracker Pro
        </div>
      </aside>

      {/* Mobile bottom tab bar — always visible */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[rgba(10,12,16,0.96)] backdrop-blur border-t border-[var(--color-card-border)] safe-bottom">
        <div className="flex items-stretch justify-around">
          {NAV.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px]',
                  active ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]',
                )}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main content — with bottom padding for mobile tab bar */}
      <main className="lg:pl-64 min-h-[100dvh]">
        <div className="px-4 sm:px-6 lg:px-10 py-4 sm:py-6 pb-24 lg:pb-6 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavLink({
  item,
  active,
}: {
  item: (typeof NAV)[number];
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 h-11 px-3 rounded-lg text-sm transition-colors',
        active
          ? 'bg-[var(--color-primary)] text-white'
          : 'text-[var(--color-foreground)] hover:bg-[#1a1f29]',
      )}
    >
      <Icon size={18} className={active ? 'text-white' : 'text-[var(--color-muted)]'} />
      {item.label}
    </Link>
  );
}

function Logo() {
  return (
    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[var(--color-accent)] to-[#b89060] flex items-center justify-center text-[10px] font-bold text-[#7a1717]">
      ANU
    </div>
  );
}

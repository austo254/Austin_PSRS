import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, CircleUserRound, HelpCircle, Home, LayoutGrid, ListChecks, LogOut, Menu, Plus, X } from 'lucide-react';
import clsx from 'clsx';
import { Logo } from '../components/ui/Logo';
import { Button } from '../components/ui/Button';
import { useAuth } from '../features/auth/AuthContext';
import { useNotifications } from '../features/notifications/hooks';
import { initials } from '../utils/format';

const nav = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/services', label: 'Services', icon: LayoutGrid },
  { to: '/requests', label: 'My Requests', icon: ListChecks, end: true },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/help', label: 'Help', icon: HelpCircle },
];

export function CitizenLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { data } = useNotifications(20);
  const unread = data?.unreadCount ?? 0;

  useEffect(() => { setMenuOpen(false); setMobileOpen(false); }, [loc.pathname]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close);
  }, []);

  const linkCls = ({ isActive }: { isActive: boolean }) => clsx(
    'relative inline-flex items-center gap-2 px-3 py-4 text-sm font-medium transition-colors',
    isActive ? 'text-brand after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-brand' : 'text-slate-600 hover:text-navy',
  );

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Link to="/" aria-label="PSRS home" className="py-3"><Logo /></Link>
            <nav aria-label="Main" className="hidden items-center md:flex">
              {nav.map(({ to, label, end }) => (
                <NavLink key={to} to={to} end={end} className={linkCls}>
                  {label}
                  {to === '/notifications' && unread > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-rejected px-1.5 text-[11px] font-bold text-white" aria-label={`${unread} unread`}>{unread > 99 ? '99+' : unread}</span>}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Button className="hidden sm:inline-flex" onClick={() => navigate('/requests/new')}><Plus className="size-4" />Report an Issue</Button>
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenuOpen((o) => !o)} aria-haspopup="menu" aria-expanded={menuOpen} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-slate-100">
                <span className="grid size-9 place-items-center rounded-full bg-navy text-sm font-bold text-white" aria-hidden>{initials(user!.fullName)}</span>
                <span className="sr-only">Account menu for {user!.fullName}</span>
                <ChevronDown className="hidden size-4 text-muted sm:block" aria-hidden />
              </button>
              {menuOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-56 rounded-lg border border-line bg-white p-1 shadow-lg">
                  <div className="border-b border-line px-3 py-2"><p className="truncate text-sm font-semibold text-navy">{user!.fullName}</p><p className="truncate text-xs text-muted">{user!.email}</p></div>
                  <Link role="menuitem" to="/profile" className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-slate-50"><CircleUserRound className="size-4" />My profile</Link>
                  <button role="menuitem" onClick={async () => { await logout(); navigate('/login'); }} className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-rejected hover:bg-slate-50"><LogOut className="size-4" />Sign out</button>
                </div>
              )}
            </div>
            <button className="rounded p-2 hover:bg-slate-100 md:hidden" aria-label={mobileOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileOpen} onClick={() => setMobileOpen((o) => !o)}>
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <nav aria-label="Mobile" className="border-t border-line bg-white px-4 py-2 md:hidden">
            {nav.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => clsx('flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium', isActive ? 'bg-brand-soft text-brand' : 'text-slate-700')}>
                <Icon className="size-4" aria-hidden />{label}{to === '/notifications' && unread > 0 && <span className="ml-auto rounded-full bg-rejected px-2 text-xs font-bold text-white">{unread}</span>}
              </NavLink>
            ))}
            <Button className="my-2 w-full" onClick={() => navigate('/requests/new')}><Plus className="size-4" />Report an Issue</Button>
          </nav>
        )}
      </header>
      <main id="main" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8"><Outlet /></main>
      <footer className="border-t border-line bg-white py-5 text-center text-xs text-muted">
        Academic demonstration project - not an official government service. <Link to="/privacy" className="underline">Privacy notice</Link>
      </footer>
    </div>
  );
}

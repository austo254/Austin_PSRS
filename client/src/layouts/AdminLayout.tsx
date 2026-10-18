import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, Building, FolderTree, LayoutDashboard, ListChecks, LogOut, Menu, X } from 'lucide-react';
import clsx from 'clsx';
import { Logo } from '../components/ui/Logo';
import { useAuth } from '../features/auth/AuthContext';
import { useNotifications } from '../features/notifications/hooks';
import { initials } from '../utils/format';

const nav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/requests', label: 'Requests', icon: ListChecks },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree },
  { to: '/admin/departments', label: 'Departments', icon: Building },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const unread = useNotifications(20).data?.unreadCount ?? 0;

  const sidebar = (
    <nav aria-label="Admin" className="flex h-full flex-col bg-navy text-white">
      <div className="px-5 py-5"><Logo light /><p className="mt-3 inline-block rounded bg-white/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider">Administrator</p></div>
      <ul className="flex-1 space-y-1 px-3">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => clsx('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors', isActive ? 'bg-brand text-white' : 'text-white/75 hover:bg-white/10 hover:text-white')}>
              <Icon className="size-4" aria-hidden />{label}
              {to === '/admin/notifications' && unread > 0 && <span className="ml-auto rounded-full bg-rejected px-2 text-xs font-bold">{unread}</span>}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-white/15 text-sm font-bold" aria-hidden>{initials(user!.fullName)}</span>
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{user!.fullName}</p><p className="truncate text-xs text-white/60">{user!.email}</p></div>
        </div>
        <button onClick={async () => { await logout(); navigate('/login'); }} className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10"><LogOut className="size-4" />Sign out</button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-screen lg:block">{sidebar}</aside>
      {open && <div className="fixed inset-0 z-40 lg:hidden"><div className="absolute inset-0 bg-navy/50" onClick={() => setOpen(false)} /><div className="relative h-full w-64">{sidebar}</div></div>}
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
          <Logo />
          <button className="rounded p-2 hover:bg-slate-100" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
        </header>
        <main id="main" className="mx-auto max-w-[88rem] px-4 py-6 sm:px-6 lg:px-8"><Outlet /></main>
      </div>
    </div>
  );
}

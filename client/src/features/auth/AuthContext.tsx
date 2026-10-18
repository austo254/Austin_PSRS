import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, setCsrfToken, setUnauthorizedHandler } from '../../services/api';
import type { User } from '../../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<User>;
  register: (input: Record<string, unknown>) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (u: User) => void;
}
const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    setUnauthorizedHandler(() => { setUser(null); setCsrfToken(null); qc.clear(); });
    api<{ user: User; csrfToken: string }>('/auth/me')
      .then((r) => { setCsrfToken(r.csrfToken); setUser(r.user); })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [qc]);

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const r = await api<{ user: User; csrfToken: string }>('/auth/login', { method: 'POST', body: { email, password, remember } });
    setCsrfToken(r.csrfToken); qc.clear(); setUser(r.user); return r.user;
  }, [qc]);

  const register = useCallback(async (input: Record<string, unknown>) => {
    const r = await api<{ user: User; csrfToken: string }>('/auth/register', { method: 'POST', body: input });
    setCsrfToken(r.csrfToken); qc.clear(); setUser(r.user); return r.user;
  }, [qc]);

  const logout = useCallback(async () => {
    try { await api('/auth/logout', { method: 'POST' }); } finally { setCsrfToken(null); setUser(null); qc.clear(); }
  }, [qc]);

  const value = useMemo(() => ({ user, loading, login, register, logout, setUser }), [user, loading, login, register, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}

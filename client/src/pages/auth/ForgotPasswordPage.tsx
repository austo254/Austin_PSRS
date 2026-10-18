import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import { AuthLayout } from '../../layouts/AuthLayout';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { useConfig } from '../../features/requests/hooks';
import { api, ApiError } from '../../services/api';

/**
 * No email provider is integrated. By default this page says so honestly instead of pretending to send mail.
 * With PASSWORD_RESET_MODE=demo (non-production only) the one-time token is shown on screen for classroom demos.
 */
export default function ForgotPasswordPage() {
  const { data: config } = useConfig();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const demo = config?.passwordResetMode === 'demo';

  async function request(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try { const r = await api<{ demoToken?: string; message: string }>('/auth/forgot-password', { method: 'POST', body: { email } }); setToken(r.demoToken ?? null); setMsg({ ok: true, text: r.message }); }
    catch (err) { setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Request failed' }); }
    finally { setBusy(false); }
  }
  async function reset(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try { await api('/auth/reset-password', { method: 'POST', body: { token, password } }); setMsg({ ok: true, text: 'Password updated. You can now sign in.' }); setToken(null); }
    catch (err) { setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Reset failed' }); }
    finally { setBusy(false); }
  }

  return (
    <AuthLayout>
      <h2 className="mb-4 text-xl font-bold text-navy">Reset your password</h2>
      {!demo ? (
        <div className="flex gap-3 rounded-lg border border-line bg-slate-50 p-4 text-sm text-slate-700">
          <Info className="mt-0.5 size-5 shrink-0 text-progress" aria-hidden />
          <p>Email-based password reset is not configured for this academic demonstration. Please contact the project administrator to have your password reset.</p>
        </div>
      ) : token ? (
        <form onSubmit={reset} className="space-y-4">
          <p className="rounded-lg bg-pending-soft p-3 text-xs text-pending">Demo mode: a reset token was generated on screen because no email service is connected.</p>
          <TextField label="New password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} hint="At least 10 characters with upper case, lower case and a number." />
          <Button type="submit" className="w-full" loading={busy}>Set new password</Button>
        </form>
      ) : (
        <form onSubmit={request} className="space-y-4">
          <TextField label="Email address" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" className="w-full" loading={busy}>Continue</Button>
        </form>
      )}
      {msg && <p role="alert" className={`mt-4 text-sm ${msg.ok ? 'text-resolved' : 'text-rejected'}`}>{msg.text}</p>}
      <p className="mt-6 text-sm"><Link to="/login" className="font-medium text-brand hover:underline">← Back to sign in</Link></p>
    </AuthLayout>
  );
}

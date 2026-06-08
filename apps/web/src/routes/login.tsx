import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useLogin } from '../hooks/useAuthActions.js';
import { useAuthStore } from '../stores/auth.store.js';
import { ArrowRight } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Redirect already-authenticated users to prevent flash
  useEffect(() => { if (isAuthenticated) navigate('/dashboard', { replace: true }); }, [isAuthenticated, navigate]);

  const handleGuestLogin = () => login.mutate({ email: 'guest@overleaf.local', password: 'guest' });

  const inputClass = "w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none transition-all";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-[360px] animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent)] text-sm font-bold text-white">OL</div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Welcome back</h2>
          <p className="mt-1 text-[13px] text-[var(--text-secondary)]">Sign in to your account</p>
        </div>

        <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-sm)]">
          <form onSubmit={(e) => { e.preventDefault(); login.mutate({ email, password }); }} className="space-y-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} placeholder="you@example.com" />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputClass} placeholder="••••••••" />
            </div>
            {login.isError && <p className="text-[12px] text-[var(--danger)]">Invalid credentials</p>}
            <button type="submit" disabled={login.isPending} className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--accent-emphasis)] px-4 py-2 text-[13px] font-medium text-white hover:bg-[var(--accent)] disabled:opacity-50 transition-all">
              {login.isPending ? 'Signing in...' : 'Sign In'} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>
          <div className="mt-3 pt-3 border-t border-[var(--border-muted)]">
            <button onClick={handleGuestLogin} disabled={login.isPending} className="w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg)] px-4 py-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] transition-all">Continue as Guest</button>
          </div>
        </div>
        <p className="mt-4 text-center text-[12px] text-[var(--text-tertiary)]">Don't have an account? <Link to="/register" className="font-medium text-[var(--accent-text)] hover:underline">Create one</Link></p>
      </div>
    </div>
  );
}

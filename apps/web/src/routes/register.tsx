import { useState } from 'react';
import { Link } from 'react-router';
import { useRegister } from '../hooks/useAuthActions.js';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const register = useRegister();
  const inputClass = "w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none transition-all duration-[var(--transition-fast)]";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-[360px] animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent)] text-sm font-bold text-white">OL</div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Create account</h2>
          <p className="mt-1 text-[13px] text-[var(--text-secondary)]">Start building your documents</p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-sm)]">
          <form onSubmit={(e) => { e.preventDefault(); register.mutate({ name, email, password }); }} className="space-y-3">
            <div><label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} placeholder="Your name" /></div>
            <div><label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} placeholder="you@example.com" /></div>
            <div><label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className={inputClass} placeholder="Min 8 characters" /></div>
            {register.isError && <p className="text-[12px] text-[var(--danger)]">Registration failed</p>}
            <button type="submit" disabled={register.isPending} className="w-full rounded-[var(--radius-sm)] bg-[var(--accent-emphasis)] px-4 py-2 text-[13px] font-medium text-white hover:bg-[var(--accent)] disabled:opacity-50 transition-all">{register.isPending ? 'Creating...' : 'Create Account'}</button>
          </form>
        </div>
        <p className="mt-4 text-center text-[12px] text-[var(--text-tertiary)]">Already have an account? <Link to="/login" className="font-medium text-[var(--accent-text)] hover:underline">Sign in</Link></p>
      </div>
    </div>
  );
}

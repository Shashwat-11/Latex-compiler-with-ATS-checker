import { Link } from 'react-router';
import { FileText, Zap, Eye } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)]">
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-1 text-[12px] text-[var(--text-secondary)] shadow-[var(--shadow-sm)]">
          <Zap className="h-3 w-3 text-[var(--warning)]" /> Real-time LaTeX compilation
        </div>
        <h1 className="max-w-xl text-3xl font-bold tracking-tight text-[var(--text-primary)]">Write LaTeX.<br /><span className="text-[var(--accent-text)]">See it instantly.</span></h1>
        <p className="mt-3 max-w-md text-[14px] text-[var(--text-secondary)]">A clean, fast LaTeX editor with live PDF preview. No setup — just write and compile.</p>
        <div className="mt-6 flex gap-2">
          <Link to="/login" className="rounded-[var(--radius-sm)] bg-[var(--accent-emphasis)] px-4 py-2 text-[13px] font-medium text-white hover:bg-[var(--accent)] transition-all">Sign In</Link>
          <Link to="/register" className="rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-2 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] transition-all">Create Account</Link>
        </div>
      </div>
      <div className="mx-auto grid max-w-3xl gap-4 px-6 pb-16 sm:grid-cols-3">
        {[{ i: FileText, t: 'LaTeX Editor', d: 'Syntax highlighting, auto-complete, multi-file projects' }, { i: Eye, t: 'Live PDF Preview', d: 'See your document render in real-time' }, { i: Zap, t: 'Instant Compilation', d: 'Docker-powered LaTeX engine' }].map((f) => (
          <div key={f.t} className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4 text-center shadow-[var(--shadow-sm)]">
            <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent-muted)]"><f.i className="h-4 w-4 text-[var(--accent-text)]" /></div>
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">{f.t}</h3>
            <p className="mt-1 text-[12px] text-[var(--text-secondary)]">{f.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

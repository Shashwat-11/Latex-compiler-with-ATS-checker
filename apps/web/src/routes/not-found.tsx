import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--bg)]">
      <h1 className="text-6xl font-bold text-[var(--border)]">404</h1>
      <p className="text-[var(--text-secondary)]">Page not found</p>
      <Link to="/" className="rounded-md bg-[var(--accent)] px-4 py-1.5 text-[13px] font-medium text-white hover:bg-[var(--accent-hover)] transition-colors">Go Home</Link>
    </div>
  );
}

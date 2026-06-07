import { Link, useLocation } from 'react-router';
import { useAuth } from '../../hooks/useAuth.js';
import { useLogout } from '../../hooks/useAuthActions.js';
import { FolderOpen, Settings, LogOut } from 'lucide-react';
import { ThemeToggle } from '../shared/ThemeToggle.js';

export function Sidebar() {
  const { user } = useAuth();
  const logout = useLogout();
  const location = useLocation();

  const linkClass = (path: string) =>
    `flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[13px] font-medium transition-all duration-[var(--transition-fast)] ${
      location.pathname === path
        ? 'bg-[var(--accent-muted)] text-[var(--accent-text)]'
        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]'
    }`;

  return (
    <aside className="flex w-[220px] flex-col h-full border-r border-[var(--border-default)] bg-[var(--bg-elevated)]">
      {/* Brand */}
      <div className="flex items-center justify-between h-11 px-3 border-b border-[var(--border-muted)] shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent)] text-[11px] font-bold text-white">OL</div>
          <span className="text-[13px] font-semibold text-[var(--text-primary)] tracking-tight">Overleaf</span>
        </div>
        <ThemeToggle />
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 p-2 flex-1">
        <Link to="/dashboard" className={linkClass('/dashboard')}>
          <FolderOpen className="h-4 w-4 opacity-70" /> Projects
        </Link>
        <Link to="/settings" className={linkClass('/settings')}>
          <Settings className="h-4 w-4 opacity-70" /> Settings
        </Link>
      </nav>

      {/* User */}
      <div className="border-t border-[var(--border-muted)] p-2 shrink-0">
        <div className="flex items-center gap-2 px-1.5 mb-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[11px] font-semibold text-[var(--accent-text)]">
            {user?.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 truncate">
            <p className="text-[12px] font-medium text-[var(--text-primary)] leading-tight">{user?.name ?? 'User'}</p>
            <p className="text-[11px] text-[var(--text-tertiary)] truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={() => logout.mutate()} className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--danger-muted)] hover:text-[var(--danger)] transition-all duration-[var(--transition-fast)]">
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </aside>
  );
}

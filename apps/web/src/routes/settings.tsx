import { useAuth } from '../hooks/useAuth.js';
import { useUIStore } from '../stores/ui.store.js';

export function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useUIStore();

  return (
    <div className="mx-auto max-w-2xl p-6 animate-fade-in">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">Settings</h1>
      <p className="text-[13px] text-[var(--text-secondary)] mt-0.5 mb-6">Customize appearance and account preferences</p>

      {/* Appearance */}
      <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)] mb-4">
        <h2 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">Appearance</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-[var(--text-primary)]">Theme</p>
              <p className="text-[11px] text-[var(--text-tertiary)]">Light, dark, or follow system preference</p>
            </div>
            <select value={theme} onChange={(e) => setTheme(e.target.value as any)}
              className="rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg)] px-3 py-1.5 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all">
              <option value="dark">Dark (default)</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>
      </div>

      {/* Account */}
      <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)]">
        <h2 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">Account</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">Display name</label>
            <input type="text" defaultValue={user?.name ?? ''}
              className="w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all" />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">Email</label>
            <input type="email" defaultValue={user?.email ?? ''} disabled
              className="w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-inset)] px-3 py-2 text-[13px] text-[var(--text-tertiary)] outline-none cursor-not-allowed" />
          </div>
        </div>
      </div>
    </div>
  );
}

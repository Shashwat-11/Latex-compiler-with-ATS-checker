import { useState, useEffect } from 'react';
import api from '../../lib/api.js';

export function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [health, setHealth] = useState({
    api: 'checking' as string, db: 'checking' as string,
    latex: 'checking' as string, auth: 'checking' as string,
  });
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs((l) => [...l.slice(-24), msg]);

  const checkAll = async () => {
    setHealth({ api: 'checking', db: 'checking', latex: 'checking', auth: 'checking' });

    try {
      const h = await api.get('/health');
      setHealth((s) => ({
        ...s,
        api: 'ok',
        db: h.data?.db === 'connected' ? 'ok' : 'down',
        latex: h.data?.latex === 'available' ? 'ok' : 'down',
      }));
      addLog(`API v${h.data?.version || '?'} DB:${h.data?.db} LATEX:${h.data?.latex}`);
    } catch {
      setHealth({ api: 'down', db: 'down', latex: 'down', auth: 'down' });
      addLog('API DOWN — check server on :3001');
      return;
    }

    try {
      await api.get('/auth/me');
      setHealth((s) => ({ ...s, auth: 'ok' }));
      addLog('Auth: logged in');
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      if (err?.response?.status === 401) {
        setHealth((s) => ({ ...s, auth: 'ok' }));
        addLog('Auth: not logged in');
      }
    }
  };

  useEffect(() => { checkAll(); }, []);

  const dot = (s: string) => s === 'ok' ? '🟢' : s === 'down' ? '🔴' : '⏳';

  return (
    <>
      <button onClick={() => { setOpen(!open); if (!open) checkAll(); }}
        className="fixed bottom-3 right-3 z-50 rounded-full bg-gray-900 px-3 py-1.5 text-xs text-gray-400 opacity-40 hover:opacity-100 transition-opacity">
        {dot(health.api)} Debug
      </button>

      {open && (
        <div className="fixed bottom-12 right-3 z-50 w-72 rounded-xl border border-slate-200 bg-white shadow-xl animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Debug</span>
            <button onClick={() => setOpen(false)} className="text-xs text-slate-300 hover:text-slate-500">✕</button>
          </div>

          <div className="space-y-1.5 px-4 py-3 text-xs">
            {[
              ['API Server', health.api],
              ['Database', health.db],
              ['LaTeX', health.latex],
              ['Auth', health.auth],
            ].map(([label, status]) => (
              <div key={label as string} className="flex justify-between">
                <span className="text-slate-500">{label}</span>
                <span>{dot(status as string)} {status}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-1 border-t border-slate-100 px-4 py-2">
            <button onClick={checkAll}
              className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-100 transition-colors">
              Re-check
            </button>
            <button onClick={() => api.get('/health').then((r) => addLog(JSON.stringify(r.data))).catch((e) => addLog(`Error: ${e.message}`))}
              className="rounded-md bg-slate-50 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 transition-colors">
              Raw Health
            </button>
          </div>

          {logs.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-2">
              <div className="max-h-28 overflow-auto font-mono text-[10px] text-slate-400 space-y-0.5">
                {logs.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

import { useCompilationStore } from '../../stores/compilation.store.js';
import { useCompilation } from '../../hooks/useCompilation.js';
import { Play, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';

interface Props { projectId: string; projectName: string; onSaveBeforeCompile?: () => void; onToggleAiSidebar?: () => void; aiSidebarOpen?: boolean; }

export function ProjectHeader({ projectId, projectName, onSaveBeforeCompile, onToggleAiSidebar, aiSidebarOpen }: Props) {
  const { compile } = useCompilation(projectId);
  const { isCompiling, status, compileTimeMs, errorLine } = useCompilationStore();
  const handleCompile = () => { onSaveBeforeCompile?.(); setTimeout(() => compile(), 500); };

  return (
    <header className="flex items-center justify-between h-10 px-4 border-b border-[var(--border-default)] bg-[var(--bg)] shrink-0 select-none">
      <h2 className="text-[13px] font-semibold text-[var(--text-primary)] truncate mr-4">{projectName}</h2>
      <Tooltip.Provider>
      <div className="flex items-center gap-3 shrink-0 min-w-0">
        {errorLine && <span className="text-[11px] text-[var(--danger)] flex-1 min-w-0 truncate" title={errorLine}><AlertCircle className="inline h-3 w-3 mr-1" />{errorLine}</span>}
        {status === 'success' && compileTimeMs ? (
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <span className="text-[11px] text-[var(--success)] shrink-0 cursor-default"><CheckCircle2 className="inline h-3 w-3 mr-1" />{compileTimeMs < 1000 ? `${compileTimeMs}ms` : `${(compileTimeMs/1000).toFixed(1)}s`}</span>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className="rounded-[var(--radius-sm)] bg-[var(--text-primary)] px-2 py-1 text-[11px] text-[var(--text-inverse)] shadow-[var(--shadow-md)]">Compilation successful<Tooltip.Arrow className="fill-[var(--text-primary)]" /></Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        ) : null}
        {onToggleAiSidebar && (
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                onClick={onToggleAiSidebar}
                className={`rounded-[var(--radius-sm)] p-1.5 transition-all shrink-0 ${
                  aiSidebarOpen
                    ? 'bg-[var(--accent-emphasis)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]'
                }`}
              >
                <Sparkles className="h-4 w-4" />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className="rounded-[var(--radius-sm)] bg-[var(--text-primary)] px-2 py-1 text-[11px] text-[var(--text-inverse)] shadow-[var(--shadow-md)]">
                {aiSidebarOpen ? 'Close AI Copilot' : 'Open AI Copilot'}
                <Tooltip.Arrow className="fill-[var(--text-primary)]" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        )}
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button onClick={handleCompile} disabled={isCompiling} className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--accent-emphasis)] px-3 py-1 text-[12px] font-medium text-white hover:bg-[var(--accent)] disabled:opacity-50 transition-all shrink-0">
                {isCompiling ? <><Loader2 className="h-3 w-3 animate-spin" /> Compiling</> : <><Play className="h-3 w-3" /> Compile</>}
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className="rounded-[var(--radius-sm)] bg-[var(--text-primary)] px-2 py-1 text-[11px] text-[var(--text-inverse)] shadow-[var(--shadow-md)]">
                Compile document (Ctrl+S)
                <Tooltip.Arrow className="fill-[var(--text-primary)]" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
      </div>
      </Tooltip.Provider>
    </header>
  );
}

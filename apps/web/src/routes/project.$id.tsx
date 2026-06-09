import { useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { useProject } from '../hooks/useProjects.js';
import { FileExplorer } from '../components/file-explorer/FileExplorer.js';
import { CodeEditor } from '../components/editor/CodeEditor.js';
import { EditorTabs } from '../components/editor/EditorTabs.js';
import { EditorStatusBar } from '../components/editor/EditorStatusBar.js';
import { PDFViewer } from '../components/pdf-viewer/PDFViewer.js';
import { AtsPanel } from '../components/pdf-viewer/AtsPanel.js';
import { ProjectHeader } from '../components/project/ProjectHeader.js';
import { CopilotSidebar } from '../components/ai/CopilotSidebar.js';
import { useEditorStore } from '../stores/editor.store.js';
import { useCompilationStore } from '../stores/compilation.store.js';
import { useCompilationSSE } from '../hooks/useCompilationSSE.js';
import { useCompilation } from '../hooks/useCompilation.js';
import { useAutoSave } from '../hooks/useAutoSave.js';
import { Spinner } from '../components/shared/Spinner.js';

export function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading } = useProject(id ?? null);
  const { activeFileId, fileContents } = useEditorStore();
  const { compilationId } = useCompilationStore();
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);
  const autoCompiled = useRef(false);

  useCompilationSSE(compilationId);
  const { compile } = useCompilation(id ?? null);

  const activeContent = activeFileId ? fileContents[activeFileId] : undefined;
  const { isSaving, isDirty, saveNow } = useAutoSave(id, activeFileId, activeContent);

  useEffect(() => { useEditorStore.getState().reset(); autoCompiled.current = false; }, [id]);

  // Auto-compile on first open — wait for initial render and file hydration
  useEffect(() => {
    if (!project || isLoading || autoCompiled.current) return;
    if (!activeFileId) return; // don't compile without an active file
    const t = setTimeout(() => { compile(); autoCompiled.current = true; }, 2000);
    return () => clearTimeout(t);
  }, [project, isLoading, activeFileId]);

  // Ctrl+S → save + compile
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveNow();
        setTimeout(() => compile(), 800);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [saveNow, compile]);

  if (isLoading) return <div className="flex h-full items-center justify-center"><Spinner /></div>;
  if (!project || !id) return <div className="flex h-full items-center justify-center text-[var(--text-tertiary)]">Project not found</div>;

  return (
    <div className="flex flex-col h-full">
      <ProjectHeader
        projectId={id}
        projectName={project.name}
        onSaveBeforeCompile={saveNow}
        onToggleAiSidebar={() => setAiSidebarOpen(!aiSidebarOpen)}
        aiSidebarOpen={aiSidebarOpen}
      />

      <div className="flex flex-1 min-h-0">
        <Group orientation="horizontal" id="overleaf-editor-layout" style={{ height: '100%' }}>
          {/* File Explorer */}
          <Panel defaultSize="15" minSize="12" maxSize="25">
            <div className="h-full border-r border-[var(--border-default)]">
              <FileExplorer projectId={id} />
            </div>
          </Panel>
          <Separator className="w-1 bg-[var(--border-default)] hover:bg-[var(--accent)] transition-colors cursor-col-resize" />

          {/* Center: Editor + Copilot (vertical stack) */}
          <Panel defaultSize="45" minSize="25">
            <Group orientation={aiSidebarOpen ? 'vertical' : 'vertical'} id="editor-center-layout" style={{ height: '100%' }}>
              <Panel defaultSize={aiSidebarOpen ? 65 : 100} minSize={30}>
                <div className="flex flex-col h-full min-w-0">
                  <EditorTabs />
                  <div className="flex-1 min-h-0">
                    {activeFileId && activeContent !== undefined ? (
                      <CodeEditor key={activeFileId} fileId={activeFileId} initialContent={activeContent} />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[12px] text-[var(--text-tertiary)]">Select a file to edit</div>
                    )}
                  </div>
                  <EditorStatusBar projectId={id} isSaving={isSaving} isDirty={isDirty} />
                </div>
              </Panel>

              {aiSidebarOpen && (
                <>
                  <Separator className="h-1 bg-[var(--border-default)] hover:bg-[var(--accent)] transition-colors cursor-row-resize shrink-0" />
                  <Panel defaultSize={35} minSize={15} maxSize={55}>
                    <CopilotSidebar
                      projectId={id}
                      currentFileId={activeFileId ?? undefined}
                      isOpen={aiSidebarOpen}
                      onToggle={() => setAiSidebarOpen(false)}
                    />
                  </Panel>
                </>
              )}
            </Group>
          </Panel>

          <Separator className="w-1 bg-[var(--border-default)] hover:bg-[var(--accent)] transition-colors cursor-col-resize" />

          {/* PDF + ATS */}
          <Panel defaultSize="40" minSize="20">
            <div className="h-full border-l border-[var(--border-default)] flex flex-col min-h-0">
              <div className="flex-1 min-h-0">
                <PDFViewer />
              </div>
              <AtsPanel projectId={id} />
            </div>
          </Panel>
        </Group>
      </div>
    </div>
  );
}

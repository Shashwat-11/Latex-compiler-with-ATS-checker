import { useState } from 'react';
import { useProjects, useDeleteProject } from '../hooks/useProjects.js';
import { useNavigate } from 'react-router';
import { NewProjectDialog } from '../components/project/NewProjectDialog.js';
import { FileText, Plus } from 'lucide-react';
import { Skeleton } from '../components/shared/Skeleton.js';
import { EmptyState } from '../components/shared/EmptyState.js';

function ProjectCard({ id, name, description, updatedAt, onDelete }: {
  id: string; name: string; description: string | null; updatedAt: string; onDelete: (id: string) => void;
}) {
  const navigate = useNavigate();
  return (
    <div onClick={() => navigate(`/project/${id}`)}
      className="group cursor-pointer rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4 transition-all hover:border-[var(--accent)] animate-fade-in">
      <div className="flex items-start justify-between mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent-muted)]">
          <FileText className="h-4 w-4 text-[var(--accent-text)]" />
        </div>
        <button onClick={(e) => { e.stopPropagation(); if (confirm('Delete this project?')) onDelete(id); }}
          className="rounded p-1 text-[var(--text-tertiary)] opacity-0 hover:text-[var(--danger)] hover:bg-[var(--danger-muted)] group-hover:opacity-100 transition-all">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
      <h3 className="text-[14px] font-semibold text-[var(--text-primary)] truncate">{name}</h3>
      {description && <p className="mt-0.5 text-[12px] text-[var(--text-secondary)] line-clamp-2">{description}</p>}
      <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">{new Date(updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
    </div>
  );
}

export function DashboardPage() {
  const { data, isLoading } = useProjects();
  const deleteProject = useDeleteProject();
  const [showNew, setShowNew] = useState(false);

  if (isLoading) return (
    <div className="mx-auto max-w-4xl p-6">
      <Skeleton className="h-7 w-32 mb-6" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1,2,3].map(i => (
          <div key={i} className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4">
            <Skeleton className="h-8 w-8 mb-2 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-4 w-3/4 mb-1" />
            <Skeleton className="h-3 w-full mb-1" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Projects</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">Your LaTeX documents</p>
        </div>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--accent-emphasis)] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[var(--accent)] transition-all">
          <Plus className="h-3.5 w-3.5" /> New
        </button>
      </div>

      {data && data.data.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.data.map((p: any) => <ProjectCard key={p.id} {...p} onDelete={(id) => deleteProject.mutate(id)} />)}
        </div>
      ) : (
        <EmptyState icon={<FileText className="h-10 w-10 text-[var(--text-tertiary)]" />} title="No projects" description="Create your first LaTeX project"
          action={<button onClick={() => setShowNew(true)} className="mt-3 rounded-[var(--radius-sm)] bg-[var(--accent-emphasis)] px-4 py-1.5 text-[13px] font-medium text-white">New Project</button>} />
      )}

      {showNew && <NewProjectDialog onClose={() => setShowNew(false)} />}
    </div>
  );
}

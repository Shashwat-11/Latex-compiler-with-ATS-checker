import { useState } from 'react';
import { useCreateProject } from '../../hooks/useProjects.js';
import { useNavigate } from 'react-router';

export function NewProjectDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [template, setTemplate] = useState<'blank' | 'resume' | 'article' | 'report'>('blank');
  const createProject = useCreateProject();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const project = await createProject.mutateAsync({ name, template });
    navigate(`/project/${project.id}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-[var(--bg-elevated)] p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">New Project</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="My Project"
              className="w-full rounded-lg border border-[var(--border-default)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Template</label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value as typeof template)}
              className="w-full rounded-lg border border-[var(--border-default)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none"
            >
              <option value="blank">Blank</option>
              <option value="article">Article</option>
              <option value="report">Report</option>
              <option value="resume">Resume</option>
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--border-default)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createProject.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createProject.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

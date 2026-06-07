import { useProjects } from '../../hooks/useProjects.js';
import { useNavigate } from 'react-router';
import { FileText, Clock, MoreVertical, Trash2 } from 'lucide-react';
import { Spinner } from '../shared/Spinner.js';
import { EmptyState } from '../shared/EmptyState.js';

export function ProjectList() {
  const { data, isLoading } = useProjects();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-12 w-12" />}
        title="No projects yet"
        description="Create your first LaTeX project to get started"
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.data.map((project) => (
        <div
          key={project.id}
          onClick={() => navigate(`/project/${project.id}`)}
          className="cursor-pointer rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
        >
          <div className="mb-3 flex items-start justify-between">
            <FileText className="h-8 w-8 text-blue-500" />
            <button
              onClick={(e) => e.stopPropagation()}
              className="rounded p-1 text-gray-400 opacity-0 hover:bg-gray-100 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-gray-800"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white">{project.name}</h3>
          {project.description && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{project.description}</p>
          )}
          <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
            <Clock className="h-3 w-3" />
            <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

import { useState } from 'react';
import { FileText, Layers, Cpu } from 'lucide-react';
import { useTemplates } from '../../hooks/useTemplates.js';
import type { ResumeTemplateSummary } from '../../hooks/useTemplates.js';
import { Spinner } from '../shared/Spinner.js';

const categoryLabels: Record<string, string> = {
  professional: 'Professional',
  academic: 'Academic',
  creative: 'Creative',
  minimal: 'Minimal',
};

const categoryIcons: Record<string, string> = {
  professional: '👔',
  academic: '🎓',
  creative: '🎨',
  minimal: '✨',
};

function TemplateCard({ template, onSelect }: { template: ResumeTemplateSummary; onSelect: (slug: string) => void }) {
  const categoryColor = template.category === 'professional'
    ? 'border-[var(--accent)]'
    : template.category === 'academic'
    ? 'border-[#8b5cf6]'
    : template.category === 'creative'
    ? 'border-[#f59e0b]'
    : 'border-[#10b981]';

  return (
    <button
      onClick={() => onSelect(template.slug)}
      className="group relative flex flex-col rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4 text-left hover:border-[var(--accent)] hover:shadow-[var(--shadow-md)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
    >
      {/* Preview area */}
      <div className={`mb-3 aspect-[210/297] rounded-[var(--radius-sm)] border-2 ${categoryColor} bg-[var(--bg)] flex items-center justify-center`}>
        <div className="text-center p-2">
          <FileText className={`h-8 w-8 mx-auto mb-1 ${
            template.category === 'professional' ? 'text-[var(--accent)]' :
            template.category === 'academic' ? 'text-[#8b5cf6]' :
            template.category === 'creative' ? 'text-[#f59e0b]' :
            'text-[#10b981]'
          }`} />
          <p className="text-[10px] text-[var(--text-tertiary)]">{template.latexClass}</p>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[11px] px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-[var(--bg-overlay)] text-[var(--text-tertiary)]">
            {categoryIcons[template.category] || '📄'} {categoryLabels[template.category] || template.category}
          </span>
        </div>
        <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">{template.name}</h3>
        <p className="text-[11px] text-[var(--text-tertiary)] mt-1 line-clamp-2">{template.description}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[var(--border-muted)]">
        <span className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
          <Cpu className="h-3 w-3" /> {template.compiler}
        </span>
        {template.styleOptions.styles && (
          <span className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
            <Layers className="h-3 w-3" /> {template.styleOptions.styles.length} styles
          </span>
        )}
      </div>
    </button>
  );
}

interface Props {
  onSelectTemplate: (slug: string) => void;
}

export function TemplateGallery({ onSelectTemplate }: Props) {
  const { data: templates, isLoading, error } = useTemplates();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = templates
    ? [...new Set(templates.map((t) => t.category))]
    : [];

  const filtered = activeCategory
    ? templates?.filter((t) => t.category === activeCategory)
    : templates;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[13px] text-[var(--danger)]">Failed to load templates</p>
      </div>
    );
  }

  return (
    <div>
      {/* Category filter */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
            !activeCategory
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
              activeCategory === cat
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {categoryIcons[cat] || '📄'} {categoryLabels[cat] || cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered && filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {filtered.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={onSelectTemplate}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-[13px] text-[var(--text-tertiary)]">No templates found</p>
        </div>
      )}
    </div>
  );
}

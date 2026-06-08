import { ResumeWizard } from '../components/ai/ResumeWizard.js';

export function ResumeNewPage() {
  return (
    <div className="flex flex-col h-full bg-[var(--bg)]">
      <header className="flex items-center justify-between h-10 px-4 border-b border-[var(--border-default)] bg-[var(--bg)] shrink-0">
        <h1 className="text-[13px] font-semibold text-[var(--text-primary)]">Create New Resume</h1>
      </header>
      <div className="flex-1 overflow-y-auto">
        <ResumeWizard />
      </div>
    </div>
  );
}

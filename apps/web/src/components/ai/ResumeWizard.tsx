import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, ArrowRight, Check, Loader2, Plus, Trash2, Sparkles, FileText,
} from 'lucide-react';
import { TemplateGallery } from './TemplateGallery.js';
import { useTemplates } from '../../hooks/useTemplates.js';
import { useResumeGeneration } from '../../hooks/useResumeGeneration.js';
import type { ResumeTemplateSummary } from '../../hooks/useTemplates.js';
import type { GenerateResumeRequest } from '@overleaf/shared';
import { Spinner } from '../shared/Spinner.js';

// ─── Types ───

interface FormData {
  projectName: string;
  templateSlug: string | null;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    title: string;
    linkedin: string;
    github: string;
    summary: string;
  };
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    startYear: string;
    endYear: string;
    gpa: string;
  }>;
  experience: Array<{
    company: string;
    role: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    bullets: string[];
  }>;
  skills: Array<{
    category: string;
    items: string;
  }>;
  selectedStyle: string;
  selectedColor: string;
}

const emptyForm: FormData = {
  projectName: 'My Resume',
  templateSlug: null,
  personalInfo: { firstName: '', lastName: '', email: '', phone: '', title: '', linkedin: '', github: '', summary: '' },
  education: [{ institution: '', degree: '', field: '', startYear: '', endYear: '', gpa: '' }],
  experience: [{ company: '', role: '', location: '', startDate: '', endDate: '', current: false, bullets: [''] }],
  skills: [{ category: 'Programming Languages', items: '' }],
  selectedStyle: 'classic',
  selectedColor: 'blue',
};

// ─── Step Indicators ───

const steps = [
  { num: 1, label: 'Template' },
  { num: 2, label: 'Personal Info' },
  { num: 3, label: 'Content' },
  { num: 4, label: 'Generate' },
];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((s, i) => (
        <div key={s.num} className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
            current >= s.num
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--bg-overlay)] text-[var(--text-tertiary)]'
          }`}>
            <span className={`flex items-center justify-center w-4 h-4 rounded-full text-[10px] ${
              current > s.num ? 'bg-white/20' : ''
            }`}>
              {current > s.num ? <Check className="h-3 w-3" /> : s.num}
            </span>
            {s.label}
          </div>
          {i < steps.length - 1 && <div className="w-6 h-px bg-[var(--border-muted)]" />}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: Template Selection ───

function StepTemplate({ form, onSelect }: { form: FormData; onSelect: (slug: string, style?: string, color?: string) => void }) {
  const { data: templates } = useTemplates();
  const selectedTemplate = templates?.find((t) => t.slug === form.templateSlug);

  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Choose a Template</h2>
      <p className="text-[13px] text-[var(--text-secondary)] mb-4">Select a LaTeX template for your resume</p>

      <TemplateGallery onSelectTemplate={(slug) => onSelect(slug)} />

      {selectedTemplate && selectedTemplate.styleOptions.styles && (
        <div className="mt-4 p-4 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-elevated)]">
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-3">Template Options</h3>
          {selectedTemplate.styleOptions.styles.length > 0 && (
            <div className="mb-3">
              <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Style</label>
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.styleOptions.styles.map((style: string) => (
                  <button
                    key={style}
                    onClick={() => onSelect(selectedTemplate.slug, style, form.selectedColor)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                      form.selectedStyle === style
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {selectedTemplate.styleOptions.colors && selectedTemplate.styleOptions.colors.length > 0 && (
            <div>
              <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Color</label>
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.styleOptions.colors.map((color: string) => (
                  <button
                    key={color}
                    onClick={() => onSelect(selectedTemplate.slug, form.selectedStyle, color)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                      form.selectedColor === color
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {color.charAt(0).toUpperCase() + color.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Personal Info ───

function StepPersonalInfo({ form, onChange }: { form: FormData; onChange: (data: FormData) => void }) {
  const update = (field: string, value: string) => {
    onChange({ ...form, personalInfo: { ...form.personalInfo, [field]: value } });
  };

  const inputClass = "w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none transition-all";
  const labelClass = "block text-[12px] font-medium text-[var(--text-secondary)] mb-1";

  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Personal Information</h2>
      <p className="text-[13px] text-[var(--text-secondary)] mb-4">Tell us about yourself</p>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>First Name *</label>
            <input className={inputClass} value={form.personalInfo.firstName} onChange={(e) => update('firstName', e.target.value)} placeholder="John" />
          </div>
          <div>
            <label className={labelClass}>Last Name *</label>
            <input className={inputClass} value={form.personalInfo.lastName} onChange={(e) => update('lastName', e.target.value)} placeholder="Doe" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Email *</label>
            <input className={inputClass} type="email" value={form.personalInfo.email} onChange={(e) => update('email', e.target.value)} placeholder="john@example.com" />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input className={inputClass} value={form.personalInfo.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+1-555-0123" />
          </div>
        </div>

        <div>
          <label className={labelClass}>Professional Title</label>
          <input className={inputClass} value={form.personalInfo.title} onChange={(e) => update('title', e.target.value)} placeholder="Software Engineer" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>LinkedIn URL</label>
            <input className={inputClass} value={form.personalInfo.linkedin} onChange={(e) => update('linkedin', e.target.value)} placeholder="linkedin.com/in/johndoe" />
          </div>
          <div>
            <label className={labelClass}>GitHub URL</label>
            <input className={inputClass} value={form.personalInfo.github} onChange={(e) => update('github', e.target.value)} placeholder="github.com/johndoe" />
          </div>
        </div>

        <div>
          <label className={labelClass}>Professional Summary</label>
          <textarea className={`${inputClass} min-h-[80px] resize-y`} value={form.personalInfo.summary} onChange={(e) => update('summary', e.target.value)} placeholder="Experienced software engineer with 5+ years..." />
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Content (Education, Experience, Skills) ───

function StepContent({ form, onChange }: { form: FormData; onChange: (data: FormData) => void }) {
  const [tab, setTab] = useState<'education' | 'experience' | 'skills'>('education');

  const inputClass = "w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none transition-all";

  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Your Content</h2>
      <p className="text-[13px] text-[var(--text-secondary)] mb-4">Add your education, experience, and skills</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-[var(--radius-md)] bg-[var(--bg-overlay)]">
        {(['education', 'experience', 'skills'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-3 py-1.5 rounded-[var(--radius-sm)] text-[12px] font-medium transition-all ${
              tab === t ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]' : 'text-[var(--text-tertiary)]'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Education Tab */}
      {tab === 'education' && (
        <div className="space-y-3">
          {form.education.map((edu, i) => (
            <div key={i} className="p-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-elevated)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-medium text-[var(--text-secondary)]">Education #{i + 1}</span>
                {form.education.length > 1 && (
                  <button onClick={() => {
                    const next = [...form.education]; next.splice(i, 1);
                    onChange({ ...form, education: next });
                  }} className="text-[var(--danger)] hover:opacity-80"><Trash2 className="h-3.5 w-3.5" /></button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className={inputClass} value={edu.institution} onChange={(e) => {
                  const next = [...form.education]; next[i] = { ...next[i]!, institution: e.target.value };
                  onChange({ ...form, education: next });
                }} placeholder="Institution" />
                <input className={inputClass} value={edu.degree} onChange={(e) => {
                  const next = [...form.education]; next[i] = { ...next[i]!, degree: e.target.value };
                  onChange({ ...form, education: next });
                }} placeholder="Degree" />
                <input className={inputClass} value={edu.field} onChange={(e) => {
                  const next = [...form.education]; next[i] = { ...next[i]!, field: e.target.value };
                  onChange({ ...form, education: next });
                }} placeholder="Field of study" />
                <div className="grid grid-cols-2 gap-2">
                  <input className={inputClass} value={edu.startYear} onChange={(e) => {
                    const next = [...form.education]; next[i] = { ...next[i]!, startYear: e.target.value };
                    onChange({ ...form, education: next });
                  }} placeholder="Start year" />
                  <input className={inputClass} value={edu.endYear} onChange={(e) => {
                    const next = [...form.education]; next[i] = { ...next[i]!, endYear: e.target.value };
                    onChange({ ...form, education: next });
                  }} placeholder="End year" />
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={() => onChange({ ...form, education: [...form.education, { institution: '', degree: '', field: '', startYear: '', endYear: '', gpa: '' }] })}
            className="flex items-center gap-1.5 text-[12px] text-[var(--accent-text)] hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Add Education
          </button>
        </div>
      )}

      {/* Experience Tab */}
      {tab === 'experience' && (
        <div className="space-y-3">
          {form.experience.map((exp, i) => (
            <div key={i} className="p-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-elevated)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-medium text-[var(--text-secondary)]">Experience #{i + 1}</span>
                {form.experience.length > 1 && (
                  <button onClick={() => {
                    const next = [...form.experience]; next.splice(i, 1);
                    onChange({ ...form, experience: next });
                  }} className="text-[var(--danger)] hover:opacity-80"><Trash2 className="h-3.5 w-3.5" /></button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input className={inputClass} value={exp.company} onChange={(e) => {
                  const next = [...form.experience]; next[i] = { ...next[i]!, company: e.target.value };
                  onChange({ ...form, experience: next });
                }} placeholder="Company" />
                <input className={inputClass} value={exp.role} onChange={(e) => {
                  const next = [...form.experience]; next[i] = { ...next[i]!, role: e.target.value };
                  onChange({ ...form, experience: next });
                }} placeholder="Role" />
                <input className={inputClass} value={exp.location} onChange={(e) => {
                  const next = [...form.experience]; next[i] = { ...next[i]!, location: e.target.value };
                  onChange({ ...form, experience: next });
                }} placeholder="Location" />
                <div className="grid grid-cols-2 gap-2">
                  <input className={inputClass} value={exp.startDate} onChange={(e) => {
                    const next = [...form.experience]; next[i] = { ...next[i]!, startDate: e.target.value };
                    onChange({ ...form, experience: next });
                  }} placeholder="Start date" />
                  <input className={inputClass} value={exp.endDate} onChange={(e) => {
                    const next = [...form.experience]; next[i] = { ...next[i]!, endDate: e.target.value };
                    onChange({ ...form, experience: next });
                  }} placeholder="End date" disabled={exp.current} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)] mb-2">
                <input type="checkbox" checked={exp.current} onChange={(e) => {
                  const next = [...form.experience]; next[i] = { ...next[i]!, current: e.target.checked };
                  onChange({ ...form, experience: next });
                }} className="rounded" />
                Currently working here
              </label>
              <div>
                <label className="text-[11px] text-[var(--text-tertiary)] mb-1 block">Bullet Points (one per line)</label>
                <textarea
                  className={`${inputClass} min-h-[60px] resize-y`}
                  value={exp.bullets.join('\n')}
                  onChange={(e) => {
                    const next = [...form.experience];
                    next[i] = { ...next[i]!, bullets: e.target.value.split('\n').filter((b) => b.trim()) };
                    onChange({ ...form, experience: next });
                  }}
                  placeholder={`Developed key features...\nLed team of 5 engineers...\nImproved performance by 40%...`}
                />
              </div>
            </div>
          ))}
          <button
            onClick={() => onChange({ ...form, experience: [...form.experience, { company: '', role: '', location: '', startDate: '', endDate: '', current: false, bullets: [''] }] })}
            className="flex items-center gap-1.5 text-[12px] text-[var(--accent-text)] hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Add Experience
          </button>
        </div>
      )}

      {/* Skills Tab */}
      {tab === 'skills' && (
        <div className="space-y-3">
          {form.skills.map((skill, i) => (
            <div key={i} className="p-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-elevated)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-medium text-[var(--text-secondary)]">Skill Category #{i + 1}</span>
                {form.skills.length > 1 && (
                  <button onClick={() => {
                    const next = [...form.skills]; next.splice(i, 1);
                    onChange({ ...form, skills: next });
                  }} className="text-[var(--danger)] hover:opacity-80"><Trash2 className="h-3.5 w-3.5" /></button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className={inputClass} value={skill.category} onChange={(e) => {
                  const next = [...form.skills]; next[i] = { ...next[i]!, category: e.target.value };
                  onChange({ ...form, skills: next });
                }} placeholder="Category (e.g., Programming)" />
                <input className={inputClass} value={skill.items} onChange={(e) => {
                  const next = [...form.skills]; next[i] = { ...next[i]!, items: e.target.value };
                  onChange({ ...form, skills: next });
                }} placeholder="Skills (comma separated)" />
              </div>
            </div>
          ))}
          <button
            onClick={() => onChange({ ...form, skills: [...form.skills, { category: '', items: '' }] })}
            className="flex items-center gap-1.5 text-[12px] text-[var(--accent-text)] hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Add Skill Category
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Generate & Preview ───

function StepGenerate({ form }: { form: FormData }) {
  const navigate = useNavigate();
  const { generate, saveAsProject, isGenerating, error, result } = useResumeGeneration();

  const handleGenerate = async () => {
    const input: GenerateResumeRequest = {
      templateId: form.templateSlug || '',
      style: form.selectedStyle,
      color: form.selectedColor,
      personalInfo: {
        firstName: form.personalInfo.firstName,
        lastName: form.personalInfo.lastName,
        email: form.personalInfo.email,
        phone: form.personalInfo.phone,
        title: form.personalInfo.title || undefined,
        linkedin: form.personalInfo.linkedin || undefined,
        github: form.personalInfo.github || undefined,
        summary: form.personalInfo.summary || undefined,
      },
      education: form.education
        .filter((e) => e.institution && e.degree)
        .map((e) => ({
          institution: e.institution,
          degree: e.degree,
          field: e.field || undefined,
          startYear: e.startYear || undefined,
          endYear: e.endYear || undefined,
          gpa: e.gpa || undefined,
        })),
      experience: form.experience
        .filter((e) => e.company && e.role)
        .map((e) => ({
          company: e.company,
          role: e.role,
          location: e.location || undefined,
          startDate: e.startDate,
          endDate: e.endDate || undefined,
          current: e.current || undefined,
          bullets: e.bullets.filter((b) => b.trim()),
        })),
      skills: form.skills
        .filter((s) => s.category)
        .map((s) => ({
          category: s.category,
          items: s.items.split(',').map((i) => i.trim()).filter(Boolean),
        })),
    };

    try {
      const data = await generate(input);
      if (data?.id) {
        const projectId = await saveAsProject(data.id, form.projectName || 'My Resume');
        navigate(`/project/${projectId}`);
      }
    } catch {}
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Generate Your Resume</h2>
      <p className="text-[13px] text-[var(--text-secondary)] mb-4">Review and generate your LaTeX resume</p>

      <div className="space-y-3 mb-6">
        <div className="p-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-elevated)]">
          <h3 className="text-[12px] font-semibold text-[var(--text-primary)] mb-2">Summary</h3>
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div><span className="text-[var(--text-tertiary)]">Template:</span> <span className="text-[var(--text-primary)]">{form.templateSlug || 'Not selected'}</span></div>
            <div><span className="text-[var(--text-tertiary)]">Name:</span> <span className="text-[var(--text-primary)]">{form.personalInfo.firstName} {form.personalInfo.lastName}</span></div>
            <div><span className="text-[var(--text-tertiary)]">Education:</span> <span className="text-[var(--text-primary)]">{form.education.filter((e) => e.institution).length} entries</span></div>
            <div><span className="text-[var(--text-tertiary)]">Experience:</span> <span className="text-[var(--text-primary)]">{form.experience.filter((e) => e.company).length} entries</span></div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-[var(--radius-sm)] bg-[var(--danger-muted)] border border-[var(--danger)] text-[12px] text-[var(--danger)]">
          {error}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={isGenerating || !form.templateSlug}
        className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--accent-emphasis)] px-6 py-2.5 text-[13px] font-medium text-white hover:bg-[var(--accent)] disabled:opacity-50 transition-all"
      >
        {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><Sparkles className="h-4 w-4" /> Generate Resume</>}
      </button>
    </div>
  );
}

// ─── Main Wizard ───

export function ResumeWizard() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(emptyForm);
  const { data: templates } = useTemplates();

  const handleSelectTemplate = (slug: string, style?: string, color?: string) => {
    setForm((prev) => ({
      ...prev,
      templateSlug: slug,
      selectedStyle: style || prev.selectedStyle,
      selectedColor: color || prev.selectedColor,
    }));
  };

  const canProceed = () => {
    switch (step) {
      case 1: return !!form.templateSlug;
      case 2: return !!(form.personalInfo.firstName && form.personalInfo.lastName && form.personalInfo.email);
      case 3: return true;
      default: return true;
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <StepIndicator current={step} total={4} />

      <div className="min-h-[400px]">
        {step === 1 && <StepTemplate form={form} onSelect={handleSelectTemplate} />}
        {step === 2 && <StepPersonalInfo form={form} onChange={setForm} />}
        {step === 3 && <StepContent form={form} onChange={setForm} />}
        {step === 4 && <StepGenerate form={form} />}
      </div>

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--border-default)]">
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] px-4 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] disabled:opacity-50 transition-all"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>

        {step < 4 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed()}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--accent-emphasis)] px-4 py-2 text-[13px] font-medium text-white hover:bg-[var(--accent)] disabled:opacity-50 transition-all"
          >
            Next <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}

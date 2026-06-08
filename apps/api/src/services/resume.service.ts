import { db, schema } from '@overleaf/db';
import { eq, desc } from 'drizzle-orm';
import { generateResumeLatex } from './ai.service.js';

export interface GenerateResumeInput {
  templateId: string;
  style?: string;
  color?: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    title?: string;
    linkedin?: string;
    github?: string;
    summary?: string;
  };
  education: Array<{
    institution: string;
    degree: string;
    field?: string;
    startYear?: string;
    endYear?: string;
    gpa?: string;
  }>;
  experience: Array<{
    company: string;
    role: string;
    location?: string;
    startDate: string;
    endDate?: string;
    current?: boolean;
    bullets: string[];
  }>;
  skills: Array<{
    category: string;
    items: string[];
  }>;
  projects?: Array<{
    name: string;
    description: string;
    url?: string;
    technologies: string[];
  }>;
}

export async function generateResume(userId: string, input: GenerateResumeInput) {
  const template = await db.query.resumeTemplates.findFirst({
    where: eq(schema.resumeTemplates.id, input.templateId),
  });

  if (!template) {
    throw new Error('Resume template not found');
  }

  const [generated] = await db.insert(schema.generatedResumes).values({
    userId,
    templateId: input.templateId,
    inputData: input as any,
    status: 'compiling',
  }).returning();

  const gen = generated!;

  try {
    const templateLatex = Object.values(template.templateFiles as Record<string, string>).join('\n');
    const latex = await generateResumeLatex(templateLatex, input as any, input.style, input.color);

    await db.update(schema.generatedResumes)
      .set({ status: 'done' })
      .where(eq(schema.generatedResumes.id, gen.id));

    return { id: gen.id, latex, status: 'done' };
  } catch (error: any) {
    await db.update(schema.generatedResumes)
      .set({ status: 'error' })
      .where(eq(schema.generatedResumes.id, gen.id));

    throw new Error(`Resume generation failed: ${error.message}`);
  }
}

export async function getGeneratedResume(id: string) {
  const resume = await db.query.generatedResumes.findFirst({
    where: eq(schema.generatedResumes.id, id),
  });

  if (!resume) return null;

  const template = await db.query.resumeTemplates.findFirst({
    where: eq(schema.resumeTemplates.id, resume.templateId),
  });

  let latex = '';
  if (resume.status === 'done' && template) {
    const templateLatex = Object.values(template.templateFiles as Record<string, string>).join('\n');
    latex = await generateResumeLatex(templateLatex, resume.inputData as any);
  }

  return {
    id: resume.id,
    status: resume.status,
    inputData: resume.inputData,
    latex,
    createdAt: resume.createdAt.toISOString(),
  };
}

export async function saveResumeAsProject(userId: string, resumeId: string, projectName: string): Promise<string> {
  const resume = await db.query.generatedResumes.findFirst({
    where: eq(schema.generatedResumes.id, resumeId),
  });

  if (!resume) throw new Error('Generated resume not found');

  const [project] = await db.insert(schema.projects).values({
    ownerId: userId,
    name: projectName,
    description: 'Resume generated with AI',
  }).returning();

  const proj = project!;

  await db.update(schema.generatedResumes)
    .set({ projectId: proj.id })
    .where(eq(schema.generatedResumes.id, resumeId));

  const template = await db.query.resumeTemplates.findFirst({
    where: eq(schema.resumeTemplates.id, resume.templateId),
  });

  if (template) {
    const files = template.templateFiles as Record<string, string>;
    let sortOrder = 0;
    for (const [name, content] of Object.entries(files)) {
      await db.insert(schema.files).values({
        projectId: proj.id,
        name,
        type: 'file',
        content,
        sortOrder,
      });
      sortOrder++;
    }
  }

  return proj.id;
}

export async function listTemplates() {
  return db.query.resumeTemplates.findMany({
    where: eq(schema.resumeTemplates.isActive, true),
    orderBy: [desc(schema.resumeTemplates.createdAt)],
  });
}

export async function getTemplateBySlug(slug: string) {
  return db.query.resumeTemplates.findFirst({
    where: eq(schema.resumeTemplates.slug, slug),
  });
}

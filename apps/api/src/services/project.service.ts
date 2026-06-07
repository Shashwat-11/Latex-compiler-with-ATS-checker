import { db, schema } from '@overleaf/db';
import { eq, and, asc, desc, count, ilike, sql } from 'drizzle-orm';
import type { CompilerType } from '@overleaf/shared';

export interface CreateProjectInput {
  name: string;
  description?: string;
  template?: 'blank' | 'resume' | 'article' | 'report';
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  isArchived?: boolean;
}

export interface ProjectListOptions {
  page: number;
  limit: number;
  search?: string;
  archived?: boolean;
}

export async function listProjects(userId: string, opts: ProjectListOptions) {
  const { page, limit, search, archived } = opts;
  const offset = (page - 1) * limit;

  let where = eq(schema.projects.ownerId, userId);

  if (typeof archived === 'boolean') {
    where = and(where, eq(schema.projects.isArchived, archived)) as typeof where;
  }

  const [totalResult] = await db
    .select({ total: count() })
    .from(schema.projects)
    .where(where);

  let query = db
    .select()
    .from(schema.projects)
    .where(where)
    .orderBy(desc(schema.projects.updatedAt))
    .limit(limit)
    .offset(offset);

  if (search) {
    query = db
      .select()
      .from(schema.projects)
      .where(and(where, ilike(schema.projects.name, `%${search}%`)) as typeof where)
      .orderBy(desc(schema.projects.updatedAt))
      .limit(limit)
      .offset(offset);
  }

  const projects = await query;
  const total = totalResult?.total ?? 0;

  return {
    data: projects.map((p) => ({
      id: p.id,
      ownerId: p.ownerId,
      name: p.name,
      description: p.description,
      isArchived: p.isArchived,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function createProject(userId: string, input: CreateProjectInput) {
  const [project] = await db
    .insert(schema.projects)
    .values({
      ownerId: userId,
      name: input.name,
      description: input.description ?? null,
    })
    .returning();

  if (!project) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to create project' } as const };
  }

  // Create default settings
  await db.insert(schema.projectSettings).values({
    projectId: project.id,
    compiler: 'pdflatex',
    autoCompile: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Create default main.tex file
  if (input.template === 'resume') {
    await db.insert(schema.files).values({
      projectId: project.id,
      parentId: null,
      name: 'main.tex',
      type: 'file',
      content: `\\documentclass[11pt,a4paper]{article}
\\usepackage{geometry}
\\geometry{margin=0.75in}
\\usepackage{hyperref}

\\begin{document}

\\begin{center}
  {\\Huge \\textbf{Your Name}} \\\\[0.3em]
  \\href{mailto:email@example.com}{email@example.com} \\textbar\\ (555) 123-4567 \\textbar\\ \\href{https://linkedin.com/in/yourname}{LinkedIn}
\\end{center}

\\section*{Professional Summary}
Brief summary of your experience and career goals.

\\section*{Experience}
\\textbf{Job Title} \\hfill \\textit{Company} \\hfill Dates
\\begin{itemize}
  \\item Key achievement or responsibility
  \\item Another achievement with measurable impact
\\end{itemize}

\\section*{Education}
\\textbf{Degree} \\hfill \\textit{University} \\hfill Year

\\section*{Skills}
List your technical skills, languages, and tools.

\\end{document}`,
      sortOrder: 0,
      sizeBytes: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } else {
    await db.insert(schema.files).values({
      projectId: project.id,
      parentId: null,
      name: 'main.tex',
      type: 'file',
      content: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{graphicx}

\\title{Untitled Document}
\\author{}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Introduction}
Start writing here...

\\end{document}`,
      sortOrder: 0,
      sizeBytes: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return {
    project: {
      id: project.id,
      ownerId: project.ownerId,
      name: project.name,
      description: project.description,
      isArchived: project.isArchived,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    },
  };
}

export async function getProject(projectId: string) {
  const project = await db.query.projects.findFirst({
    where: eq(schema.projects.id, projectId),
  });

  if (!project) {
    return { error: { code: 'NOT_FOUND', message: 'Project not found' } as const };
  }

  return {
    project: {
      id: project.id,
      ownerId: project.ownerId,
      name: project.name,
      description: project.description,
      isArchived: project.isArchived,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    },
  };
}

export async function updateProject(projectId: string, input: UpdateProjectInput) {
  const [project] = await db
    .update(schema.projects)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.isArchived !== undefined && { isArchived: input.isArchived }),
      updatedAt: new Date(),
    })
    .where(eq(schema.projects.id, projectId))
    .returning();

  if (!project) {
    return { error: { code: 'NOT_FOUND', message: 'Project not found' } as const };
  }

  return {
    project: {
      id: project.id,
      ownerId: project.ownerId,
      name: project.name,
      description: project.description,
      isArchived: project.isArchived,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    },
  };
}

export async function deleteProject(projectId: string) {
  await db.delete(schema.projects).where(eq(schema.projects.id, projectId));
  return { success: true as const };
}

export async function duplicateProject(userId: string, projectId: string, newName?: string) {
  const project = await db.query.projects.findFirst({
    where: eq(schema.projects.id, projectId),
  });

  if (!project) {
    return { error: { code: 'NOT_FOUND', message: 'Project not found' } as const };
  }

  const name = newName || `${project.name} (Copy)`;

  const [newProject] = await db
    .insert(schema.projects)
    .values({
      ownerId: userId,
      name,
      description: project.description,
    })
    .returning();

  if (!newProject) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to duplicate project' } as const };
  }

  // Copy settings
  const settings = await db.query.projectSettings.findFirst({
    where: eq(schema.projectSettings.projectId, projectId),
  });

  if (settings) {
    await db.insert(schema.projectSettings).values({
      projectId: newProject.id,
      compiler: settings.compiler,
      autoCompile: settings.autoCompile,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Copy files recursively (simplified — copies root files only)
  const files = await db
    .select()
    .from(schema.files)
    .where(and(eq(schema.files.projectId, projectId), sql`${schema.files.parentId} IS NULL`))
    .orderBy(asc(schema.files.sortOrder));

  for (const file of files) {
    await db.insert(schema.files).values({
      projectId: newProject.id,
      parentId: null,
      name: file.name,
      type: file.type,
      content: file.content,
      sortOrder: file.sortOrder,
      sizeBytes: file.sizeBytes,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return {
    project: {
      id: newProject.id,
      ownerId: newProject.ownerId,
      name: newProject.name,
      description: newProject.description,
      isArchived: newProject.isArchived,
      createdAt: newProject.createdAt.toISOString(),
      updatedAt: newProject.updatedAt.toISOString(),
    },
  };
}

export async function getProjectSettings(projectId: string) {
  let settings = await db.query.projectSettings.findFirst({
    where: eq(schema.projectSettings.projectId, projectId),
  });

  if (!settings) {
    const [newSettings] = await db
      .insert(schema.projectSettings)
      .values({
        projectId,
        compiler: 'pdflatex',
        autoCompile: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    settings = newSettings!;
  }

  return {
    settings: {
      projectId: settings.projectId,
      compiler: settings.compiler,
      rootFileId: settings.rootFileId,
      spellCheckLang: settings.spellCheckLang ?? 'en-US',
      editorFontSize: settings.editorFontSize ?? 14,
      autoCompile: settings.autoCompile,
      compileOnSave: settings.compileOnSave,
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
    },
  };
}

export async function updateProjectSettings(projectId: string, input: {
  compiler?: CompilerType;
  rootFileId?: string | null;
  spellCheckLang?: string;
  editorFontSize?: number;
  autoCompile?: boolean;
  compileOnSave?: boolean;
}) {
  let settings = await db.query.projectSettings.findFirst({
    where: eq(schema.projectSettings.projectId, projectId),
  });

  if (!settings) {
    const [newSettings] = await db
      .insert(schema.projectSettings)
      .values({ projectId, compiler: 'pdflatex', autoCompile: true, createdAt: new Date(), updatedAt: new Date() })
      .returning();
    settings = newSettings!;
  }

  const [updated] = await db
    .update(schema.projectSettings)
    .set({
      ...(input.compiler !== undefined && { compiler: input.compiler }),
      ...(input.rootFileId !== undefined && { rootFileId: input.rootFileId }),
      ...(input.spellCheckLang !== undefined && { spellCheckLang: input.spellCheckLang }),
      ...(input.editorFontSize !== undefined && { editorFontSize: input.editorFontSize }),
      ...(input.autoCompile !== undefined && { autoCompile: input.autoCompile }),
      ...(input.compileOnSave !== undefined && { compileOnSave: input.compileOnSave }),
      updatedAt: new Date(),
    })
    .where(eq(schema.projectSettings.projectId, projectId))
    .returning();

  return {
    settings: {
      projectId: updated!.projectId,
      compiler: updated!.compiler,
      rootFileId: updated!.rootFileId,
      spellCheckLang: updated!.spellCheckLang ?? 'en-US',
      editorFontSize: updated!.editorFontSize ?? 14,
      autoCompile: updated!.autoCompile,
      compileOnSave: updated!.compileOnSave ?? false,
      createdAt: updated!.createdAt.toISOString(),
      updatedAt: updated!.updatedAt.toISOString(),
    },
  };
}

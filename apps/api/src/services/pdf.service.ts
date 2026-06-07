import { readFile, access } from 'node:fs/promises';
import { db, schema } from '@overleaf/db';
import { eq } from 'drizzle-orm';

export async function getPdfBuffer(compilationId: string): Promise<Buffer | null> {
  const compilation = await db.query.compilations.findFirst({
    where: eq(schema.compilations.id, compilationId),
  });

  if (!compilation || !compilation.pdfPath || compilation.status !== 'success') {
    return null;
  }

  try {
    await access(compilation.pdfPath);
    return readFile(compilation.pdfPath);
  } catch {
    return null;
  }
}

export async function getLatestCompilationPdf(projectId: string): Promise<Buffer | null> {
  const compilation = await db.query.compilations.findFirst({
    where: eq(schema.compilations.projectId, projectId),
    orderBy: (compilations, { desc }) => [desc(compilations.createdAt)],
  });

  if (!compilation || !compilation.pdfPath) return null;

  try {
    return readFile(compilation.pdfPath);
  } catch {
    return null;
  }
}

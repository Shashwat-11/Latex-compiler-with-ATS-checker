import { db, schema } from '@overleaf/db';
import { eq } from 'drizzle-orm';
import { compileProject } from './compiler.service.js';

const activeJobs = new Map<string, Promise<void>>();
const MAX_CONCURRENT = 3;

export async function enqueueCompilation(compilationId: string, projectId: string): Promise<void> {
  // Run in background
  const job = compileProject(compilationId, projectId).finally(() => {
    activeJobs.delete(compilationId);
  });

  // Wait if too many concurrent
  while (activeJobs.size >= MAX_CONCURRENT) {
    await Promise.race(activeJobs.values());
  }

  activeJobs.set(compilationId, job);
  job.catch(() => {}); // Errors handled inside compileProject
}

export async function cancelCompilation(compilationId: string): Promise<void> {
  const job = activeJobs.get(compilationId);
  if (job) {
    activeJobs.delete(compilationId);
  }
  
  await db
    .update(schema.compilations)
    .set({ status: 'cancelled', finishedAt: new Date() })
    .where(eq(schema.compilations.id, compilationId));
}

export function getActiveCount(): number {
  return activeJobs.size;
}

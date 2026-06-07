import type { CompilationStatus } from '@overleaf/shared';
import { db, schema } from '@overleaf/db';
import { eq } from 'drizzle-orm';
import { env } from '../../config/env.js';
import { spawn } from 'node:child_process';
import { writeFile, mkdir, readFile, rm, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

async function getProjectFiles(projectId: string): Promise<Map<string, string>> {
  const allFiles = await db
    .select()
    .from(schema.files)
    .where(eq(schema.files.projectId, projectId));

  // Build path mapping
  const fileMap = new Map<string, string>(); // relativePath → content
  const idToPath = new Map<string, string>();
  const idToParent = new Map<string, string | null>();
  const idToName = new Map<string, string>();

  for (const f of allFiles) {
    idToParent.set(f.id, f.parentId);
    idToName.set(f.id, f.name);
    if (f.type === 'file' && f.content !== null) {
      fileMap.set(f.id, f.content);
    }
  }

  // Resolve full paths
  const idToFullPath = new Map<string, string>();
  for (const f of allFiles) {
    if (f.type === 'folder') continue;
    const parts: string[] = [];
    let current: string | null = f.id;
    while (current) {
      const name = idToName.get(current);
      if (name) parts.unshift(name);
      current = idToParent.get(current) ?? null;
    }
    idToFullPath.set(f.id, parts.join('/'));
  }

  const result = new Map<string, string>();
  for (const [id, content] of fileMap) {
    const path = idToFullPath.get(id);
    if (path) result.set(path, content);
  }

  return result;
}

export async function compileProject(compilationId: string, projectId: string): Promise<void> {
  const startTime = Date.now();

  // Update status to running
  await db
    .update(schema.compilations)
    .set({ status: 'running', startedAt: new Date() })
    .where(eq(schema.compilations.id, compilationId));

  const workDir = join('/tmp', 'overleaf-compile', compilationId);
  try {
    // Create temp workspace (requires world-exec for Docker userns)
    await mkdir(workDir, { recursive: true });
    await chmod(workDir, 0o755);

    // Get all project files and write them
    const files = await getProjectFiles(projectId);

    await db
      .update(schema.compilations)
      .set({ status: 'compiling' })
      .where(eq(schema.compilations.id, compilationId));

    for (const [relativePath, content] of files) {
      const fullPath = join(workDir, relativePath);
      await mkdir(join(fullPath, '..'), { recursive: true });
      await writeFile(fullPath, content, 'utf8');
    }

    // Create .latexmkrc to force biber for biblatex documents
    const hasBib = Array.from(files.keys()).some((f) => f.endsWith('.bib'));
    if (hasBib) {
      await writeFile(join(workDir, '.latexmkrc'), '$bibtex = "biber";\n', 'utf8');
    }

    // Run latexmk inside Docker (sandboxed texlive)
    const pdfPath = join(workDir, 'output.pdf');
    const logPath = join(workDir, 'output.log');
    // Ensure the workdir has proper permissions for Docker user namespace

    await new Promise<void>((resolve, reject) => {
      const latexCmd =
        `cd /workspace && TEXFILE=$(ls *.tex 2>/dev/null | head -1) && latexmk -pdf -interaction=nonstopmode -halt-on-error -jobname=output "$TEXFILE"`;
      
      const dockerArgs = [
        'run', '--rm',
        '--network', 'none',
        '--memory', `${env.LATEX_MAX_MEMORY_MB}m`,
        '--stop-timeout', String(env.LATEX_TIMEOUT_SECONDS),
        '--entrypoint', 'sh',
        '-v', `${workDir}:/workspace:rw`,
        env.LATEX_DOCKER_IMAGE,
        '-c', latexCmd,
      ];

      const proc = spawn('docker', dockerArgs, {
        timeout: (env.LATEX_TIMEOUT_SECONDS + 10) * 1000,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (chunk) => { stdout += chunk; });
      proc.stderr.on('data', (chunk) => { stderr += chunk; });

      proc.on('error', async (err) => {
        await db
          .update(schema.compilations)
          .set({
            status: 'error',
            errorSummary: `Docker error: ${err.message}`,
            finishedAt: new Date(),
            compileTimeMs: Date.now() - startTime,
          })
          .where(eq(schema.compilations.id, compilationId));
        reject(err);
      });

      proc.on('close', async (exitCode) => {
        // Read log output
        let logOutput = '';
        try {
          logOutput = await readFile(logPath, 'utf8');
        } catch {
          logOutput = stdout + '\n' + stderr;
        }

        const hasPdf = await readFile(pdfPath).then(() => true).catch(() => false);

        if (exitCode !== 0 || !hasPdf) {
          const errorLines = logOutput
            .split('\n')
            .filter((l) => l.startsWith('!'))
            .slice(0, 20)
            .join('\n');

          await db
            .update(schema.compilations)
            .set({
              status: 'error',
              logOutput,
              errorSummary: errorLines || 'Compilation failed - check LaTeX syntax',
              finishedAt: new Date(),
              compileTimeMs: Date.now() - startTime,
            })
            .where(eq(schema.compilations.id, compilationId));
          reject(new Error('Compilation failed'));
          return;
        }

        try {
          // Move PDF to persistent storage
          const storageDir = join(env.PDF_STORAGE_PATH, projectId);
          await mkdir(storageDir, { recursive: true });
          const destPath = join(storageDir, `${compilationId}.pdf`);
          
          const pdfBuffer = await readFile(pdfPath);
          await writeFile(destPath, pdfBuffer);

          await db
            .update(schema.compilations)
            .set({
              status: 'success',
              logOutput,
              pdfPath: destPath,
              pdfSizeBytes: pdfBuffer.length,
              finishedAt: new Date(),
              compileTimeMs: Date.now() - startTime,
            })
            .where(eq(schema.compilations.id, compilationId));

          resolve();
        } catch (err) {
          await db
            .update(schema.compilations)
            .set({
              status: 'error',
              logOutput,
              errorSummary: 'Failed to read PDF output',
              finishedAt: new Date(),
              compileTimeMs: Date.now() - startTime,
            })
            .where(eq(schema.compilations.id, compilationId));
          reject(err);
        }
      });
    });

  } catch (err) {
    // If status not already set by inner handler, mark as error
    const compilation = await db.query.compilations.findFirst({
      where: eq(schema.compilations.id, compilationId),
    });
    if (compilation && compilation.status !== 'error') {
      await db
        .update(schema.compilations)
        .set({
          status: 'error',
          errorSummary: err instanceof Error ? err.message : 'Compilation failed',
          finishedAt: new Date(),
          compileTimeMs: Date.now() - startTime,
        })
        .where(eq(schema.compilations.id, compilationId));
    }
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

import { db, schema } from '@overleaf/db';
import { eq, and, asc } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import type { FileNode, FileType } from '@overleaf/shared';

function fileToNode(f: typeof schema.files.$inferSelect): FileNode {
  return {
    id: f.id,
    projectId: f.projectId,
    parentId: f.parentId,
    name: f.name,
    type: f.type as FileType,
    content: f.content,
    sortOrder: f.sortOrder,
    sizeBytes: f.sizeBytes,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}

export async function getFileTree(projectId: string): Promise<{ files: FileNode[] }> {
  const allFiles = await db
    .select()
    .from(schema.files)
    .where(eq(schema.files.projectId, projectId))
    .orderBy(asc(schema.files.sortOrder));

  const nodeMap = new Map<string, FileNode>();
  const roots: FileNode[] = [];

  for (const f of allFiles) {
    const node = fileToNode(f);
    node.children = [];
    nodeMap.set(f.id, node);
  }

  for (const f of allFiles) {
    const node = nodeMap.get(f.id)!;
    if (f.parentId && nodeMap.has(f.parentId)) {
      nodeMap.get(f.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children
  const sortNodes = (nodes: FileNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    });
    for (const n of nodes) {
      if (n.children) sortNodes(n.children);
    }
  };
  sortNodes(roots);

  return { files: roots };
}

export async function createFile(projectId: string, input: {
  name: string;
  parentId?: string | null;
  type: FileType;
  content?: string;
}) {
  const content = input.type === 'folder' ? null : (input.content ?? '');
  const contentHash = input.type === 'file' && content
    ? createHash('sha256').update(content).digest('hex')
    : null;

  const [file] = await db
    .insert(schema.files)
    .values({
      projectId,
      parentId: input.parentId ?? null,
      name: input.name,
      type: input.type,
      content: input.type === 'folder' ? null : content,
      contentHash,
      sortOrder: 0,
      sizeBytes: content ? Buffer.byteLength(content, 'utf8') : 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  if (!file) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to create file' } as const };
  }

  return { file: fileToNode(file) };
}

export async function getFile(fileId: string) {
  const file = await db.query.files.findFirst({
    where: eq(schema.files.id, fileId),
  });

  if (!file) {
    return { error: { code: 'NOT_FOUND', message: 'File not found' } as const };
  }

  return { file: fileToNode(file) };
}

export async function updateFile(fileId: string, input: {
  content?: string;
  name?: string;
}) {
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (input.content !== undefined) {
    updates.content = input.content;
    updates.contentHash = createHash('sha256').update(input.content).digest('hex');
    updates.sizeBytes = Buffer.byteLength(input.content, 'utf8');
  }
  if (input.name !== undefined) {
    updates.name = input.name;
  }

  const [file] = await db
    .update(schema.files)
    .set(updates)
    .where(eq(schema.files.id, fileId))
    .returning();

  if (!file) {
    return { error: { code: 'NOT_FOUND', message: 'File not found' } as const };
  }

  return { file: fileToNode(file) };
}

export async function deleteFile(fileId: string) {
  // Get all child IDs for cascade
  const file = await db.query.files.findFirst({
    where: eq(schema.files.id, fileId),
  });

  if (!file) {
    return { error: { code: 'NOT_FOUND', message: 'File not found' } as const };
  }

  // Collect all descendant IDs
  const descendants: string[] = [];
  const queue = [fileId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    descendants.push(current);
    const children = await db
      .select({ id: schema.files.id })
      .from(schema.files)
      .where(eq(schema.files.parentId, current));
    for (const c of children) queue.push(c.id);
  }

  // Delete all descendants
  for (const id of descendants) {
    await db.delete(schema.files).where(eq(schema.files.id, id));
  }

  return { success: true as const, affectedIds: descendants };
}

export async function moveFile(fileId: string, input: {
  newParentId: string | null;
  newSortOrder?: number;
}) {
  const updates: Record<string, unknown> = {
    parentId: input.newParentId,
    updatedAt: new Date(),
  };
  if (input.newSortOrder !== undefined) {
    updates.sortOrder = input.newSortOrder;
  }

  const [file] = await db
    .update(schema.files)
    .set(updates)
    .where(eq(schema.files.id, fileId))
    .returning();

  if (!file) {
    return { error: { code: 'NOT_FOUND', message: 'File not found' } as const };
  }

  return { file: fileToNode(file) };
}

export async function duplicateFile(fileId: string, newName?: string) {
  const original = await db.query.files.findFirst({
    where: eq(schema.files.id, fileId),
  });

  if (!original) {
    return { error: { code: 'NOT_FOUND', message: 'File not found' } as const };
  }

  const name = newName || `${original.name} (copy)`;
  const contentHash = original.contentHash;

  const [copy] = await db
    .insert(schema.files)
    .values({
      projectId: original.projectId,
      parentId: original.parentId,
      name,
      type: original.type,
      content: original.content,
      contentHash,
      sortOrder: (original.sortOrder ?? 0) + 1,
      sizeBytes: original.sizeBytes,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  if (!copy) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to duplicate file' } as const };
  }

  return { file: fileToNode(copy) };
}

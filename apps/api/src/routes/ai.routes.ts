import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z, ZodError } from 'zod';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import { verifyProjectAccess } from '../middleware/project-access.middleware.js';
import { streamChatResponse, getInlineCompletions } from '../services/ai.service.js';
import { generateResume, getGeneratedResume, saveResumeAsProject, listTemplates, getTemplateBySlug } from '../services/resume.service.js';
import { db, schema } from '@overleaf/db';
import { eq, desc } from 'drizzle-orm';

// ─── Validation Schemas ───

const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  contextFileId: z.string().uuid().optional(),
  contextSelection: z.string().optional(),
});

const inlineCompletionSchema = z.object({
  prefix: z.string(),
  suffix: z.string(),
  language: z.string().default('latex'),
});

const generateResumeSchema = z.object({
  templateId: z.string().uuid(),
  style: z.string().optional(),
  color: z.string().optional(),
  personalInfo: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string(),
    title: z.string().optional(),
    linkedin: z.string().optional(),
    github: z.string().optional(),
    summary: z.string().optional(),
  }),
  education: z.array(z.object({
    institution: z.string().min(1),
    degree: z.string().min(1),
    field: z.string().optional(),
    startYear: z.string().optional(),
    endYear: z.string().optional(),
    gpa: z.string().optional(),
  })),
  experience: z.array(z.object({
    company: z.string().min(1),
    role: z.string().min(1),
    location: z.string().optional(),
    startDate: z.string().min(1),
    endDate: z.string().optional(),
    current: z.boolean().optional(),
    bullets: z.array(z.string()).default([]),
  })),
  skills: z.array(z.object({
    category: z.string().min(1),
    items: z.array(z.string()),
  })),
  projects: z.array(z.object({
    name: z.string().min(1),
    description: z.string(),
    url: z.string().optional(),
    technologies: z.array(z.string()).default([]),
  })).optional(),
});

function sendZodError(reply: FastifyReply, error: ZodError) {
  return reply.status(400).send({
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.') || 'body';
          if (!acc[path]) acc[path] = [];
          acc[path].push(err.message);
          return acc;
        },
        {} as Record<string, string[]>,
      ),
    },
  });
}

// ─── Routes ───

export async function aiRoutes(app: FastifyInstance) {

  // ─── Chat: Send a message about a project ───

  app.post('/projects/:projectId/chat', {
    preHandler: [authenticate, verifyProjectAccess],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = chatMessageSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendZodError(reply, parsed.error);
    }
    const { message, contextFileId, contextSelection } = parsed.data;
    const userId = request.user.id;
    const { projectId } = request.params as { projectId: string };

    // Get or create conversation
    const existingConv = await db.query.aiConversations.findFirst({
      where: eq(schema.aiConversations.projectId, projectId),
      orderBy: [desc(schema.aiConversations.createdAt)],
    });

    const conversation = existingConv ?? (await (async () => {
      const [created] = await db.insert(schema.aiConversations).values({
        projectId,
        userId,
        title: message.slice(0, 100),
      }).returning();
      return created!;
    })());

    // Save user message
    await db.insert(schema.aiMessages).values({
      conversationId: conversation.id,
      role: 'user',
      content: message,
      contextFileId: contextFileId || null,
      contextSelection: contextSelection || null,
    });

    // Get conversation history (last 20 messages)
    const history = await db.query.aiMessages.findMany({
      where: eq(schema.aiMessages.conversationId, conversation.id),
      orderBy: [desc(schema.aiMessages.createdAt)],
      limit: 20,
    });

    // Fetch current document content if contextFileId is provided
    let documentContext: string | undefined;
    if (contextFileId) {
      const file = await db.query.files.findFirst({
        where: eq(schema.files.id, contextFileId),
      });
      if (file?.content) {
        documentContext = file.content;
        if (contextSelection) {
          documentContext = `SELECTED TEXT (lines ${contextSelection}):\n${contextSelection}\n\nFULL FILE:\n${file.content}`;
        }
      }
    }

    // Set up SSE streaming
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const messages = history.reverse().map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    let fullResponse = '';

    try {
      for await (const chunk of streamChatResponse(messages, documentContext)) {
        fullResponse += chunk;
        reply.raw.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      // Save assistant message
      await db.insert(schema.aiMessages).values({
        conversationId: conversation.id,
        role: 'assistant',
        content: fullResponse,
      });

      reply.raw.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (error: any) {
      reply.raw.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    } finally {
      reply.raw.end();
    }
  });

  // ─── Chat: Get conversation history ───

  app.get('/projects/:projectId/chat/history', {
    preHandler: [authenticate, verifyProjectAccess],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { projectId } = request.params as { projectId: string };

    const conversation = await db.query.aiConversations.findFirst({
      where: eq(schema.aiConversations.projectId, projectId),
      orderBy: [desc(schema.aiConversations.createdAt)],
    });

    if (!conversation) {
      return reply.send({ conversation: null, messages: [] });
    }

    const messages = await db.query.aiMessages.findMany({
      where: eq(schema.aiMessages.conversationId, conversation.id),
      orderBy: [desc(schema.aiMessages.createdAt)],
      limit: 50,
    });

    return reply.send({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt.toISOString(),
      },
      messages: messages.reverse().map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        contextFileId: m.contextFileId,
        contextSelection: m.contextSelection,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  });

  // ─── Inline Completions ───

  app.post('/projects/:projectId/completions', {
    preHandler: [authenticate, verifyProjectAccess],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = inlineCompletionSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendZodError(reply, parsed.error);
    }
    const { prefix, suffix } = parsed.data;

    try {
      const completions = await getInlineCompletions(prefix, suffix);
      return reply.send({ completions });
    } catch (error: any) {
      return reply.status(500).send({
        error: { code: 'AI_ERROR', message: error.message },
      });
    }
  });

  // ─── Templates: List all ───

  app.get('/templates', async (_request: FastifyRequest, reply: FastifyReply) => {
    const templates = await listTemplates();
    return reply.send({ templates });
  });

  // ─── Templates: Get by slug ───

  app.get('/templates/:slug', async (request: FastifyRequest, reply: FastifyReply) => {
    const { slug } = request.params as { slug: string };
    const template = await getTemplateBySlug(slug);
    if (!template) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Template not found' },
      });
    }
    return reply.send({ template });
  });

  // ─── Resume: Generate ───

  app.post('/resume/generate', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = generateResumeSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendZodError(reply, parsed.error);
    }
    const userId = request.user.id;

    try {
      const result = await generateResume(userId, parsed.data);
      return reply.status(201).send(result);
    } catch (error: any) {
      return reply.status(500).send({
        error: { code: 'GENERATION_ERROR', message: error.message },
      });
    }
  });

  // ─── Resume: Get status ───

  app.get('/resume/:id', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const result = await getGeneratedResume(id);
    if (!result) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Generated resume not found' },
      });
    }
    return reply.send(result);
  });

  // ─── Resume: Save as project ───

  app.post('/resume/:id/save', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.id;
    const { projectName } = request.body as { projectName: string };

    if (!projectName || typeof projectName !== 'string') {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'projectName is required' },
      });
    }

    try {
      const projectId = await saveResumeAsProject(userId, id, projectName);
      return reply.status(201).send({ projectId });
    } catch (error: any) {
      return reply.status(500).send({
        error: { code: 'SAVE_ERROR', message: error.message },
      });
    }
  });
}

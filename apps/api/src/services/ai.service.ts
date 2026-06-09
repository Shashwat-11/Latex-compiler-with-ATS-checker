import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';

const SYSTEM_PROMPT = `You are an expert LaTeX assistant integrated into a web-based LaTeX editor called Overleaf.

CAPABILITIES:
- You help users write, edit, and debug LaTeX documents.
- You know document classes: article, report, book, beamer, moderncv, altacv, awesome-cv.
- You know LaTeX packages: amsmath, graphicx, hyperref, geometry, biblatex, tikz, etc.
- You can generate complete LaTeX documents from natural language descriptions.
- You can edit specific sections while preserving the rest of the document.
- You can fix LaTeX compilation errors.
- You can CREATE and EDIT files in the project when the user asks you to.
  Use the [CREATE_FILE: path/to/file.tex] marker followed by the file content.
  Use the [EDIT_FILE: path/to/file.tex] marker followed by the new content.
  Only include the full file content for creates/edits, not a diff.

RULES:
1. Always output valid, compilable LaTeX code.
2. When editing existing files, put the COMPLETE file content inside [EDIT_FILE] marker.
   BUT keep your chat explanation VERY BRIEF — just say e.g. "Updated author name and title."
   DO NOT repeat the full LaTeX code in your explanation text.
3. When creating new files, put the full content inside [CREATE_FILE] marker.
   Say "Created filename.tex" and briefly describe what it contains.
4. Keep explanations concise (1-3 sentences max). The user can see the file in the editor.
5. For resume generation, follow the specified template's structure exactly.
6. Escape special characters properly (&, %, $, #, _, {, }, ~, ^).
7. Use proper LaTeX math syntax with $...$ or $$...$$.`;

let client: GoogleGenAI | null = null;
let currentKey: string | undefined;

function getClient(userApiKey?: string): GoogleGenAI {
  const activeKey = userApiKey || env.GEMINI_API_KEY;
  if (!activeKey) {
    throw new Error('No Gemini API key provided. Set GEMINI_API_KEY in .env or provide your own.');
  }
  // Re-create client if the key changed (user-provided key vs env var)
  if (!client || activeKey !== currentKey) {
    client = new GoogleGenAI({ apiKey: activeKey });
    currentKey = activeKey;
  }
  return client;
}

// ─── Error Parsing ───

function extractErrorMessage(error: unknown): { cleanMessage: string; isOverloaded: boolean } {
  try {
    const raw = error as any;
    let message = raw?.message || String(error) || 'Unknown error';
    let isOverloaded = false;

    // Try to parse nested JSON in the message string (common with Gemini SDK)
    if (typeof message === 'string' && message.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(message);
        if (parsed.error) {
          message = parsed.error.message || message;
          if (parsed.error.status === 'UNAVAILABLE' || parsed.error.code === 503 || parsed.error.code === 429) {
            isOverloaded = true;
          }
        }
      } catch { /* not JSON, use as-is */ }
    }

    // Check raw error properties
    if (raw?.code === 503 || raw?.code === 429 || raw?.status === 'UNAVAILABLE') isOverloaded = true;
    if (typeof message === 'string' && (message.includes('503') || message.includes('UNAVAILABLE') || message.includes('high demand'))) isOverloaded = true;

    return { cleanMessage: message.replace(/^["'\s]+|["'\s]+$/g, ''), isOverloaded };
  } catch {
    return { cleanMessage: 'An unexpected error occurred', isOverloaded: false };
  }
}

// ─── Model Fallback ───

// Model priority: Flash-Lite first (faster, more available), then Flash, then Pro
const CHAT_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro'];
const COMPLETION_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash'];
const RESUME_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash'];

async function withModelFallback<T>(
  models: string[],
  callModel: (model: string) => Promise<T>,
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < models.length; i++) {
    try {
      return await callModel(models[i]!);
    } catch (error: any) {
      lastError = error;
      const { isOverloaded } = extractErrorMessage(error);
      if (isOverloaded && i < models.length - 1) {
        console.warn(`AI model ${models[i]!} overloaded, falling back to ${models[i + 1]!}`);
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      throw error;
    }
  }

  const { cleanMessage } = extractErrorMessage(lastError);
  throw new Error(`All AI models are currently unavailable. ${cleanMessage}`);
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface CompletionResult {
  text: string;
}

// ─── Chat Completion (streaming via async generator) ───

export async function* streamChatResponse(
  messages: ChatMessage[],
  context?: string,
  userApiKey?: string,
): AsyncGenerator<string, void, unknown> {
  const ai = getClient(userApiKey);

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : m.role,
    parts: [{ text: m.content }],
  }));

  const systemInstruction = context
    ? `${SYSTEM_PROMPT}\n\nCURRENT DOCUMENT CONTEXT:\n${context}`
    : SYSTEM_PROMPT;

  // Track how much we've yielded so we can resume mid-stream if a model fails
  let yieldedCount = 0;

  for (let attempt = 0; attempt < CHAT_MODELS.length; attempt++) {
    const model = CHAT_MODELS[attempt]!;
    try {
      const stream = await ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction: attempt > 0
            ? `${systemInstruction}\n\nNote: A previous model became unavailable mid-response. Continue the response naturally.`
            : systemInstruction,
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      });

      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          yieldedCount++;
          yield text;
        }
      }
      // If we get here, the stream completed successfully
      return;
    } catch (error: any) {
      const { cleanMessage, isOverloaded } = extractErrorMessage(error);

      // Non-recoverable errors — throw immediately
      if (cleanMessage.includes('API_KEY') || cleanMessage.includes('API key')) {
        throw new Error('AI service: Invalid or missing API key. Check your GEMINI_API_KEY.');
      }
      if (!isOverloaded) {
        throw new Error(`AI service: ${cleanMessage}`);
      }

      // Overloaded — if we already yielded content, inform the user
      if (yieldedCount > 0) {
        yield `\n\n*[The response was interrupted because the AI model became temporarily unavailable. ${attempt < CHAT_MODELS.length - 1 ? 'Trying a fallback model...' : 'Please try again later.'}]*\n\n`;
      }

      // If this was the last model, throw a clean error
      if (attempt >= CHAT_MODELS.length - 1) {
        throw new Error('AI service is temporarily busy. Please wait a moment and try again.');
      }

      // Wait longer between retries to let rate limits reset
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

export async function getInlineCompletions(
  prefix: string,
  suffix: string,
  userApiKey?: string,
): Promise<string[]> {
  const ai = getClient(userApiKey);

  const prompt = `You are a LaTeX code completion engine. Complete the LaTeX code at the cursor position marked by [CURSOR].
Return ONLY the completion text, no explanations.

PREFIX (code before cursor):
\`\`\`latex
${prefix}
\`\`\`

SUFFIX (code after cursor):
\`\`\`latex
${suffix}
\`\`\`

Complete the code at [CURSOR]:`;

  try {
    const response = await withModelFallback(COMPLETION_MODELS, async (model) => {
      return ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.2,
          maxOutputTokens: 256,
        },
      });
    });

    const text = response.text?.trim() || '';
    const completions = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('```'));

    return completions.length > 0 ? completions : [text];
  } catch (error: any) {
    const { cleanMessage, isOverloaded } = extractErrorMessage(error);
    if (isOverloaded) {
      throw new Error('Completion service temporarily busy. Please try again.');
    }
    throw new Error(`Completion service: ${cleanMessage}`);
  }
}

export async function generateResumeLatex(
  templateLatex: string,
  userData: Record<string, any>,
  style?: string,
  color?: string,
  userApiKey?: string,
): Promise<string> {
  const ai = getClient(userApiKey);

  let latex = templateLatex
    .replace(/%%FIRSTNAME%%/g, userData.personalInfo?.firstName || '')
    .replace(/%%LASTNAME%%/g, userData.personalInfo?.lastName || '')
    .replace(/%%EMAIL%%/g, userData.personalInfo?.email || '')
    .replace(/%%PHONE%%/g, userData.personalInfo?.phone || '')
    .replace(/%%TITLE%%/g, userData.personalInfo?.title || '')
    .replace(/%%LINKEDIN%%/g, userData.personalInfo?.linkedin || '')
    .replace(/%%GITHUB%%/g, userData.personalInfo?.github || '')
    .replace(/%%STYLE%%/g, style || 'classic')
    .replace(/%%COLOR%%/g, color || 'blue')
    .replace(/%%ACCENT_COLOR%%/g, color || '#002B5B');

  const sectionsPrompt = `You are a LaTeX resume generator. Given the following user data and template placeholders, generate the LaTeX code for each section.

TEMPLATE SECTIONS TO FILL:
- %%SUMMARY%%
- %%EDUCATION%%
- %%EXPERIENCE%%
- %%SKILLS%%
- %%PROJECTS%%
- %%PERSONAL_INFO%%

USER DATA:
${JSON.stringify(userData, null, 2)}

Generate ONLY the LaTeX code for each section, using appropriate template commands.
For moderncv: use \\section{}, \\cventry{}, \\cvitem{}, \\cvline{}
For altacv: use \\cvsection{}, \\cvevent{}, \\cvskill{}
For article/simple: use \\section{}, \\textbf{}, \\textit{}, \\begin{itemize}
For awesome-cv: use \\cvsection{}, \\cveducation{}, \\cvevent{}, \\cvtag{}

Return a JSON object mapping section names to their LaTeX content.`;

  try {
    const response = await withModelFallback(RESUME_MODELS, async (model) => {
      return ai.models.generateContent({
        model,
        contents: sectionsPrompt,
        config: {
          temperature: 0.3,
          maxOutputTokens: 8192,
        },
      });
    });

    const generatedText = response.text || '';

    try {
      const sections = JSON.parse(generatedText);
      latex = latex
        .replace(/%%SUMMARY%%/g, sections['%%SUMMARY%%'] || '')
        .replace(/%%EDUCATION%%/g, sections['%%EDUCATION%%'] || '')
        .replace(/%%EXPERIENCE%%/g, sections['%%EXPERIENCE%%'] || '')
        .replace(/%%SKILLS%%/g, sections['%%SKILLS%%'] || '')
        .replace(/%%PROJECTS%%/g, sections['%%PROJECTS%%'] || '')
        .replace(/%%PERSONAL_INFO%%/g, sections['%%PERSONAL_INFO%%'] || '');
    } catch {
      const cleaned = generatedText.replace(/```latex\n?/g, '').replace(/```\n?/g, '').trim();
      if (cleaned.length > 0) {
        latex = cleaned;
      }
    }

    return latex;
  } catch (error: any) {
    const { cleanMessage, isOverloaded } = extractErrorMessage(error);
    if (isOverloaded) {
      throw new Error('Resume generation service temporarily busy. Please try again.');
    }
    throw new Error(`Resume generation service: ${cleanMessage}`);
  }
}

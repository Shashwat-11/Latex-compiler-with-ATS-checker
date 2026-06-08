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

RULES:
1. Always output valid, compilable LaTeX code.
2. Wrap LaTeX code blocks in \`\`\`latex ... \`\`\` markers.
3. When editing, only show the changed sections, not the entire document.
4. Explain what you changed and why.
5. For resume generation, follow the specified template's structure exactly.
6. Escape special characters properly (&, %, $, #, _, {, }, ~, ^).
7. Use proper LaTeX math syntax with $...$ or $$...$$.
8. Keep explanations concise — the user is already familiar with LaTeX.`;

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    if (!env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return client;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface CompletionResult {
  text: string;
}

export async function* streamChatResponse(
  messages: ChatMessage[],
  context?: string,
): AsyncGenerator<string, void, unknown> {
  const ai = getClient();

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : m.role,
    parts: [{ text: m.content }],
  }));

  const systemInstruction = context
    ? `${SYSTEM_PROMPT}\n\nCURRENT DOCUMENT CONTEXT:\n${context}`
    : SYSTEM_PROMPT;

  try {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        yield text;
      }
    }
  } catch (error: any) {
    const message = error?.message || 'Unknown error';
    if (message.includes('API_KEY') || message.includes('API key')) {
      throw new Error('AI service: Invalid or missing API key');
    }
    if (message.includes('RATE_LIMIT') || message.includes('rate')) {
      throw new Error('AI service: Rate limit exceeded. Please try again later.');
    }
    throw new Error(`AI service: ${message}`);
  }
}

export async function getInlineCompletions(
  prefix: string,
  suffix: string,
): Promise<string[]> {
  const ai = getClient();

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
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: {
        temperature: 0.2,
        maxOutputTokens: 256,
      },
    });

    const text = response.text?.trim() || '';
    const completions = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('```'));

    return completions.length > 0 ? completions : [text];
  } catch (error: any) {
    const message = error?.message || 'Unknown error';
    throw new Error(`AI completion service: ${message}`);
  }
}

export async function generateResumeLatex(
  templateLatex: string,
  userData: Record<string, any>,
  style?: string,
  color?: string,
): Promise<string> {
  const ai = getClient();

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
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: sectionsPrompt,
      config: {
        temperature: 0.3,
        maxOutputTokens: 8192,
      },
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
    const message = error?.message || 'Unknown error';
    throw new Error(`Resume generation service: ${message}`);
  }
}

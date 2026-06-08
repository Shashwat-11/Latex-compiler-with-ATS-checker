import { db, schema } from '@overleaf/db';
import { eq, desc } from 'drizzle-orm';
import { spawnSync } from 'node:child_process';
import { readFile, mkdir, rm, writeFile, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ATSCategoryScores, ATSKeywordMatch, ATSFormattingIssue, ATSReadabilityMetrics } from '@overleaf/shared';

// ─── Verb Strength Tiers ──────────────────────────────────────

const VERB_TIERS: Record<string, { tier: 'high' | 'medium' | 'low'; points: number }> = {
  // High-impact: ownership, leadership, innovation
  architected: { tier: 'high', points: 5 }, spearheaded: { tier: 'high', points: 5 },
  orchestrated: { tier: 'high', points: 5 }, transformed: { tier: 'high', points: 5 },
  pioneered: { tier: 'high', points: 5 }, founded: { tier: 'high', points: 5 },
  led: { tier: 'high', points: 4 }, directed: { tier: 'high', points: 4 },
  owned: { tier: 'high', points: 4 }, established: { tier: 'high', points: 4 },
  launched: { tier: 'high', points: 4 }, engineered: { tier: 'high', points: 4 },
  // Medium-impact: building, improving
  designed: { tier: 'medium', points: 3 }, implemented: { tier: 'medium', points: 3 },
  developed: { tier: 'medium', points: 3 }, built: { tier: 'medium', points: 3 },
  created: { tier: 'medium', points: 3 }, optimized: { tier: 'medium', points: 3 },
  automated: { tier: 'medium', points: 3 }, scaled: { tier: 'medium', points: 3 },
  streamlined: { tier: 'medium', points: 3 }, migrated: { tier: 'medium', points: 3 },
  delivered: { tier: 'medium', points: 3 }, deployed: { tier: 'medium', points: 3 },
  // Low-impact: support roles
  managed: { tier: 'medium', points: 2 }, mentored: { tier: 'medium', points: 2 },
  collaborated: { tier: 'low', points: 1 }, coordinated: { tier: 'low', points: 1 },
  helped: { tier: 'low', points: 1 }, assisted: { tier: 'low', points: 1 },
  supported: { tier: 'low', points: 1 }, participated: { tier: 'low', points: 1 },
  worked: { tier: 'low', points: 1 }, contributed: { tier: 'low', points: 1 },
};

// ─── Keyword Corpus (Expanded) ────────────────────────────────

const KEYWORD_CORPUS: Record<string, string[]> = {
  skills: [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C', 'SQL',
    'React', 'Angular', 'Vue', 'Node.js', 'Next.js', 'Fastify', 'Express', 'Django',
    'PostgreSQL', 'MongoDB', 'Redis', 'MySQL', 'Docker', 'Kubernetes', 'AWS', 'Azure',
    'Git', 'CI/CD', 'REST', 'GraphQL', 'WebSocket', 'Microservices', 'Linux',
    'Machine Learning', 'Data Analysis', 'NLP', 'Deep Learning', 'TensorFlow',
    'PyTorch', 'Pandas', 'NumPy', 'Scikit-learn', 'Verilog', 'VHDL', 'FPGA',
    'SPICE', 'MATLAB', 'Embedded Systems', 'RTOS', 'IoT', 'RISC-V', 'ARM',
    'Agile', 'Scrum', 'Kanban', 'Jira', 'Confluence', 'Figma', 'GitHub Actions',
    'Terraform', 'Ansible', 'Jenkins', 'Datadog', 'Sentry', 'Prometheus', 'Grafana',
  ],
  soft: [
    'Leadership', 'Communication', 'Teamwork', 'Problem Solving', 'Mentoring',
    'Project Management', 'Cross-functional', 'Stakeholder Management',
    'Critical Thinking', 'Adaptability', 'Time Management', 'Conflict Resolution',
  ],
  business: [
    'ROI', 'Revenue', 'Cost Reduction', 'Efficiency', 'KPIs', 'Analytics',
    'Strategy', 'Roadmap', 'Budget', 'Forecasting', 'Scalability', 'Optimization',
  ],
};

// ─── Section Detection ────────────────────────────────────────

const SECTION_PATTERNS: Array<{ name: string; patterns: RegExp[]; recommendedIndex: number }> = [
  { name: 'contact', patterns: [/@.*\.[a-z]{2,}/i], recommendedIndex: 0 },
  { name: 'summary', patterns: [/summary|profile|objective|about me/i], recommendedIndex: 1 },
  { name: 'experience', patterns: [/experience|employment|work history|professional/i], recommendedIndex: 2 },
  { name: 'education', patterns: [/education|academic|university|college/i], recommendedIndex: 3 },
  { name: 'skills', patterns: [/skills?$|technologies|technical skills|tools/i], recommendedIndex: 4 },
  { name: 'projects', patterns: [/projects?$|portfolio|publications/i], recommendedIndex: 5 },
  { name: 'achievements', patterns: [/achievements?$|awards?$|honors/i], recommendedIndex: 6 },
];

// ─── Text Extraction ──────────────────────────────────────────

export async function extractTextFromPdf(pdfPath: string): Promise<string> {
  try {
    const tmpDir = join('/tmp', 'ats-extract', randomUUID());
    await mkdir(tmpDir, { recursive: true });
    await chmod(tmpDir, 0o777);
    await writeFile(join(tmpDir, 'input.pdf'), await readFile(pdfPath));

    const result = spawnSync('docker', [
      'run', '--rm', '-v', `${tmpDir}:/data:rw`,
      '--entrypoint', 'sh', 'overleaf-tex:latest',
      '-c', 'pdftotext /data/input.pdf /data/output.txt',
    ], { timeout: 20000, stdio: 'pipe' });

    if (result.status === 0) {
      const text = await readFile(join(tmpDir, 'output.txt'), 'utf8');
      await rm(tmpDir, { recursive: true, force: true });
      return text;
    }
    await rm(tmpDir, { recursive: true, force: true });
  } catch {}

  const buf = await readFile(pdfPath);
  return buf.toString('latin1').replace(/[^\x20-\x7E\n\r\t]/g, ' ').trim() || 'No readable text found';
}

// ─── Contact Detection ────────────────────────────────────────

function detectContactDetails(text: string) {
  const email = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || null;
  const phone = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)?.[0] || null;
  const linkedin = text.match(/linkedin\.com\/in\/[\w-]+/i)?.[0] || null;
  const github = text.match(/github\.com\/[\w-]+(?!\/)/i)?.[0] || null;
  const location = text.match(/(?:Hyderabad|Mumbai|Bangalore|Delhi|Pune|Chennai|Kolkata|San Francisco|New York|London|Berlin)[,.\s]*[\w\s]*/i)?.[0]?.trim() || null;

  let score = 0;
  if (email) score += 30;
  if (phone) score += 25;
  if (linkedin) score += 25;
  if (github) score += 20;

  return {
    email, phone, linkedin, github, location,
    score: Math.min(100, score),
    missing: [
      !email && 'email',
      !phone && 'phone number',
      !linkedin && 'LinkedIn profile',
      !github && 'GitHub profile',
    ].filter(Boolean) as string[],
  };
}

// ─── Per-Bullet Analysis ──────────────────────────────────────

interface BulletAnalysis {
  text: string;
  startsWithVerb: boolean;
  hasMetric: boolean;
  verbStrength: { tier: string; points: number } | null;
  length: number;
  score: number;
}

function analyzeBullets(text: string): BulletAnalysis[] {
  // Match common PDF bullet characters including control chars
  const bulletRegex = /(?:^|\n)\s*(?:[•\-\–—◦▪▸➢■□●◆\x08\u2022\u25CF\u25CB\u25AA\u25C6]\s*|\s{2,})([^\n]+)/g;
  const lines = text.split('\n');
  const bullets: BulletAnalysis[] = [];
  
  // Method 1: regex-based bullet detection
  let match;
  while ((match = bulletRegex.exec(text)) !== null) {
    const content = (match[1] || '').trim();
    if (content.length < 10 || content.length > 300) continue; // skip too short/long
    bullets.push(scoreBullet(content));
  }
  
  // Method 2: if regex found <3 bullets, try indented-line detection
  if (bullets.length < 3) {
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 15 || trimmed.length > 300) continue;
      // Lines that look like experience bullets: start with verb or have metrics
      const firstWord = trimmed.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '') || '';
      if (VERB_TIERS[firstWord] || /\d+[%]|\$\d+|^\d+$|increased|decreased|reduced|improved/i.test(trimmed)) {
        bullets.push(scoreBullet(trimmed));
      }
    }
  }

  return bullets.slice(0, 30);
}

function scoreBullet(content: string): BulletAnalysis {
  const firstWord = content.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '') || '';
  const verb = VERB_TIERS[firstWord] || null;
  const hasMetric = /\d+[%]|\$\d+|\d+\s*(?:users|customers|clients|projects|teams|hours|days|weeks|months|years|%|[KMB])\b|\b\d+x\b/i.test(content);
  const length = content.split(/\s+/).length;
  let score = 0;
  if (verb) score += verb.points;
  if (hasMetric) score += 3;
  if (length >= 6 && length <= 25) score += 2;
  score = Math.min(10, score);
  return { text: content.substring(0, 120), startsWithVerb: !!verb, hasMetric, verbStrength: verb, length, score };
}

// ─── Keyword Density ──────────────────────────────────────────

function keywordDensity(text: string): { matches: ATSKeywordMatch[]; missing: string[]; densityScore: number } {
  const lower = text.toLowerCase();
  const words = text.split(/\s+/).length;
  const matches: ATSKeywordMatch[] = [];
  const missing: string[] = [];
  for (const [category, kws] of Object.entries(KEYWORD_CORPUS)) {
    for (const kw of kws) {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const count = (lower.match(new RegExp(`\\b${escaped}\\b`, 'gi')) || []).length;
      if (count > 0) {
        const idx = lower.indexOf(kw.toLowerCase());
        const context = text.slice(Math.max(0, idx - 30), idx + kw.length + 30).trim();
        matches.push({ keyword: kw, category, count, context });
      } else {
        missing.push(kw);
      }
    }
  }

  // Density: keywords per 100 words. Ideal: 8-15 per 100 words
  const density = words > 0 ? Math.round((matches.length / words) * 100) : 0;
  let densityScore = 0;
  if (density >= 8 && density <= 15) densityScore = 100;
  else if (density >= 5 && density < 8) densityScore = 75;
  else if (density > 15) densityScore = 60; // keyword stuffing
  else densityScore = Math.round((density / 8) * 100);

  return { matches, missing, densityScore: Math.min(100, densityScore) };
}

// ─── Section Ordering ─────────────────────────────────────────

function checkSectionOrder(text: string): { score: number; issues: string[] } {
  const lines = text.split('\n');
  const found: Array<{ name: string; index: number; recommendedIndex: number }> = [];

  for (const section of SECTION_PATTERNS) {
    for (const pattern of section.patterns) {
      const match = lines.findIndex((l) => pattern.test(l));
      if (match >= 0) {
        found.push({ name: section.name, index: match, recommendedIndex: section.recommendedIndex });
        break;
      }
    }
  }

  found.sort((a, b) => a.index - b.index);
  const issues: string[] = [];
  let orderErrors = 0;

  for (let i = 1; i < found.length; i++) {
    if (found[i - 1]!.recommendedIndex > found[i]!.recommendedIndex) {
      orderErrors++;
    }
  }

  if (found.length >= 2 && found[0]!.name !== 'contact') {
    issues.push('Contact info should be at the top');
    orderErrors++;
  }

  const score = Math.max(0, 100 - orderErrors * 20);
  return { score, issues };
}

// ─── JD Matching ──────────────────────────────────────────────

export function matchJobDescription(resumeText: string, jdText: string): {
  score: number; matchedSkills: string[]; missingSkills: string[];
} {
  if (!jdText.trim()) return { score: 0, matchedSkills: [], missingSkills: [] };

  const jdWords = new Set(jdText.toLowerCase().split(/\W+/).filter((w) => w.length > 2));
  const allSkills = Object.values(KEYWORD_CORPUS).flat();
  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of allSkills) {
    if (!jdWords.has(skill.toLowerCase())) continue;
    if (resumeText.toLowerCase().includes(skill.toLowerCase())) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  }

  const total = matched.length + missing.length;
  const score = total > 0 ? Math.round((matched.length / total) * 100) : 0;
  return { score, matchedSkills: matched, missingSkills: missing };
}

// ─── Readability (Enhanced) ───────────────────────────────────

function computeReadability(text: string): { metrics: ATSReadabilityMetrics; score: number } {
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+(?:\s|$)/).filter(Boolean);
  const wordCount = words.length;
  const sentenceCount = sentences.length || 1;
  const avgSentenceLength = Math.round(wordCount / sentenceCount);

  const bulletAnalysis = analyzeBullets(text);
  const actionVerbsCount = bulletAnalysis.filter((b) => b.startsWithVerb).length;
  const bulletPointsCount = bulletAnalysis.length;
  const quantifiedAchievements = bulletAnalysis.filter((b) => b.hasMetric).length;

  let score = 60;
  if (wordCount >= 300 && wordCount <= 800) score += 15;
  if (avgSentenceLength < 25) score += 10;
  if (actionVerbsCount >= 4) score += 10;
  if (quantifiedAchievements >= 2) score += 10;
  if (bulletPointsCount >= 3) score += 5;
  score = Math.min(100, score);

  return {
    metrics: { wordCount, sentenceCount, avgSentenceLength, bulletPointsCount, actionVerbsCount, quantifiedAchievements },
    score,
  };
}

// ─── Formatting (Enhanced) ────────────────────────────────────

function analyzeFormatting(text: string): { issues: ATSFormattingIssue[]; score: number } {
  const issues: ATSFormattingIssue[] = [];
  let score = 100;

  if (/\t/.test(text) || / {4,}/.test(text)) {
    issues.push({ type: 'spacing', severity: 'warning', description: 'Irregular spacing — use consistent single spaces' });
    score -= 10;
  }
  if (/fig(?:ure)?\.?\s*\d|image|\.png|\.jpg|\.jpeg|graph/i.test(text) && !/graph\.(com|io)/i.test(text)) {
    issues.push({ type: 'images', severity: 'warning', description: 'References to images/graphics — ATS cannot parse images' });
    score -= 10;
  }
  if (/[│┌├└─┼]/u.test(text)) {
    issues.push({ type: 'tables', severity: 'error', description: 'Box-drawing characters — use plain text, not formatted tables' });
    score -= 20;
  }
  if (/\bcolumns?\b|\btabular\b|\btable\b/i.test(text)) {
    issues.push({ type: 'columns', severity: 'warning', description: 'Multi-column layout detected — ATS parses left-to-right only' });
    score -= 15;
  }
  // Check first person pronouns (penalty)
  if (/\bI\s|\bme\s|\bmy\s|\bwe\s|\bour\s/i.test(text)) {
    issues.push({ type: 'headers_footers', severity: 'warning', description: 'First-person pronouns detected (I/me/my) — use third-person or implied' });
    score -= 5;
  }

  return { issues, score: Math.max(0, score) };
}

// ─── Recommendations ──────────────────────────────────────────

function generateRecommendations(
  contactResult: ReturnType<typeof detectContactDetails>,
  sectionOrder: ReturnType<typeof checkSectionOrder>,
  formatResult: ReturnType<typeof analyzeFormatting>,
  readability: ReturnType<typeof computeReadability>,
  density: ReturnType<typeof keywordDensity>,
  bullets: BulletAnalysis[],
): string[] {
  const recs: string[] = [];

  if (contactResult.score < 60) {
    recs.push(`Add missing contact info: ${contactResult.missing.join(', ')}`);
  }
  if (sectionOrder.score < 80) {
    recs.push(`Re-order sections: Contact → Summary → Experience → Education → Skills → Projects`);
    for (const issue of sectionOrder.issues) recs.push(`  ${issue}`);
  }
  for (const issue of formatResult.issues) {
    recs.push(issue.description);
  }
  if (readability.metrics.wordCount < 300) {
    recs.push(`Content too short (${readability.metrics.wordCount} words). Aim for 300–800 words.`);
  }
  if (readability.metrics.quantifiedAchievements < 2) {
    recs.push('Add quantified results to more bullets (e.g., "reduced costs by 20%", "managed team of 5")');
  }
  const weakBullets = bullets.filter((b) => b.startsWithVerb && (b.verbStrength?.tier === 'low' || b.score < 3));
  if (weakBullets.length > 2) {
    recs.push(`Upgrade ${weakBullets.length} weak bullet verbs — use high-impact words like "Led", "Architected", "Spearheaded"`);
  }
  if (density.densityScore < 50) {
    recs.push(`Low keyword density (${Math.round((density.matches.length / Math.max(1, readability.metrics.wordCount)) * 100)} per 100 words) — add more skills and tools`);
  }
  const nonVerbBullets = bullets.filter((b) => !b.startsWithVerb);
  if (nonVerbBullets.length > 0) {
    recs.push(`${nonVerbBullets.length} bullets don't start with an action verb. Start each bullet with a strong verb.`);
  }

  return recs.length > 0 ? recs : ['Your resume looks ATS-friendly!'];
}

// ─── Main Analysis ────────────────────────────────────────────

export interface EnhancedAtsReport {
  overallScore: number;
  categoryScores: ATSCategoryScores & { bulletQuality: number; contactCompleteness: number; sectionOrder: number; keywordDensity: number };
  keywordMatches: ATSKeywordMatch[];
  missingKeywords: string[];
  formattingIssues: ATSFormattingIssue[];
  readabilityMetrics: ATSReadabilityMetrics;
  recommendations: string[];
  bulletAnalysis: BulletAnalysis[];
  contactDetails: ReturnType<typeof detectContactDetails>;
  jdMatch?: { score: number; matchedSkills: string[]; missingSkills: string[] };
}

export async function analyzeResume(
  projectId: string, fileId: string, compilationId: string, pdfPath: string,
  jdText?: string,
): Promise<EnhancedAtsReport> {
  const text = await extractTextFromPdf(pdfPath);

  const contactResult = detectContactDetails(text);
  const sectionOrder = checkSectionOrder(text);
  const formatResult = analyzeFormatting(text);
  const readability = computeReadability(text);
  const density = keywordDensity(text);
  const bullets = analyzeBullets(text);

  // Bullet quality score
  const totalBulletScore = bullets.reduce((s, b) => s + b.score, 0);
  const bulletQuality = bullets.length > 0 ? Math.round((totalBulletScore / (bullets.length * 10)) * 100) : 0;

  const categoryScores = {
    keywords: density.densityScore,
    formatting: formatResult.score,
    readability: readability.score,
    structure: sectionOrder.score,
    contactInfo: contactResult.score,
    bulletQuality,
    contactCompleteness: contactResult.score,
    sectionOrder: sectionOrder.score,
    keywordDensity: density.densityScore,
  };

  const overallScore = Math.round(
    density.densityScore * 0.25 +
    formatResult.score * 0.15 +
    readability.score * 0.20 +
    sectionOrder.score * 0.10 +
    contactResult.score * 0.10 +
    bulletQuality * 0.20,
  );

  const recommendations = generateRecommendations(contactResult, sectionOrder, formatResult, readability, density, bullets);
  const jdMatch = jdText ? matchJobDescription(text, jdText) : undefined;

  // Store in DB
  await db.insert(schema.atsReports).values({
    projectId, fileId, compilationId, overallScore,
    categoryScores, keywordMatches: density.matches,
    missingKeywords: density.missing, formattingIssues: formatResult.issues,
    readabilityMetrics: readability.metrics, recommendations,
  });

  return {
    overallScore, categoryScores, keywordMatches: density.matches,
    missingKeywords: density.missing, formattingIssues: formatResult.issues,
    readabilityMetrics: readability.metrics, recommendations,
    bulletAnalysis: bullets, contactDetails: contactResult, jdMatch,
  };
}

// ─── History ──────────────────────────────────────────────────

export async function getAtsHistory(projectId: string, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const reports = await db.select().from(schema.atsReports)
    .where(eq(schema.atsReports.projectId, projectId))
    .orderBy(desc(schema.atsReports.createdAt)).limit(limit).offset(offset);
  return {
    data: reports.map((r) => ({ id: r.id, projectId: r.projectId, fileId: r.fileId, compilationId: r.compilationId, overallScore: r.overallScore, categoryScores: r.categoryScores, keywordMatches: r.keywordMatches, missingKeywords: r.missingKeywords, formattingIssues: r.formattingIssues, readabilityMetrics: r.readabilityMetrics, recommendations: r.recommendations, createdAt: r.createdAt.toISOString() })),
    meta: { page, limit, total: reports.length, totalPages: 1 },
  };
}

export async function getAtsReport(reportId: string) {
  const report = await db.query.atsReports.findFirst({ where: eq(schema.atsReports.id, reportId) });
  if (!report) return null;
  return { id: report.id, projectId: report.projectId, fileId: report.fileId, compilationId: report.compilationId, overallScore: report.overallScore, categoryScores: report.categoryScores, keywordMatches: report.keywordMatches, missingKeywords: report.missingKeywords, formattingIssues: report.formattingIssues, readabilityMetrics: report.readabilityMetrics, recommendations: report.recommendations, createdAt: report.createdAt.toISOString() };
}

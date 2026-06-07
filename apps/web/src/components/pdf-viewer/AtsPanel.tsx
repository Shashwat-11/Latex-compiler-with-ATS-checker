import { useState } from 'react';
import api from '../../lib/api.js';

interface AtsReport {
  overallScore: number;
  categoryScores: Record<string, number>;
  missingKeywords: string[];
  recommendations: string[];
  bulletAnalysis?: Array<{ text: string; startsWithVerb: boolean; hasMetric: boolean; verbStrength: { tier: string; points: number } | null; score: number }>;
  contactDetails?: { email: string | null; phone: string | null; linkedin: string | null; github: string | null; score: number; missing: string[] };
  jdMatch?: { score: number; matchedSkills: string[]; missingSkills: string[] };
}

export function AtsPanel({ projectId }: { projectId: string }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<AtsReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [jdText, setJdText] = useState('');
  const [showJd, setShowJd] = useState(false);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setError(null);
    setCollapsed(false);
    try {
      const filesRes = await api.get(`/projects/${projectId}/files`);
      const texFile = filesRes.data.files.find((f: { name: string; type: string }) =>
        f.name.endsWith('.tex') && f.type === 'file'
      );
      if (!texFile) { setError('No .tex file found'); return; }

      const { data } = await api.post(`/projects/${projectId}/ats/analyze`, {
        fileId: texFile.id,
        jdText: jdText.trim() || undefined,
      });
      setReport(data.report);
      setOpen(true);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const scoreColor = (s: number) => s >= 70 ? 'text-emerald-500' : s >= 50 ? 'text-amber-500' : 'text-red-500';
  const scoreBg = (s: number) => s >= 70 ? 'bg-emerald-500' : s >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="border-t border-slate-200">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ATS Checker</span>
          {report && (
            <button onClick={() => setCollapsed(!collapsed)}
              className="text-[10px] text-slate-400 hover:text-slate-600">
              {collapsed ? '▼ Expand' : '▲ Collapse'}
            </button>
          )}
        </div>
        <div className="flex gap-1">
          <button onClick={() => setShowJd(!showJd)}
            className="rounded-md px-2 py-1 text-[10px] text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            {showJd ? 'Hide JD' : '+ Job Desc'}
          </button>
          <button onClick={runAnalysis} disabled={analyzing}
            className="rounded-md bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-100 disabled:opacity-50">
            {analyzing ? 'Analyzing...' : report ? 'Re-analyze' : 'Check ATS Score'}
          </button>
        </div>
      </div>

      {showJd && (
        <div className="px-3 pb-2">
          <textarea value={jdText} onChange={(e) => setJdText(e.target.value)}
            placeholder="Paste job description to check match..."
            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs h-16 resize-none focus:border-indigo-300 focus:outline-none"
          />
        </div>
      )}

      {open && report && !collapsed && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-3 animate-fade-in">
          {/* Overall Score */}
          <div className="flex items-center gap-4">
            <svg className="h-16 w-16 -rotate-90 flex-shrink-0">
              <circle cx="32" cy="32" r="28" fill="none" stroke="#e2e8f0" strokeWidth="6" />
              <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="6"
                strokeDasharray={`${report.overallScore * 1.76} 176`} strokeLinecap="round"
                className={scoreColor(report.overallScore)} />
            </svg>
            <div>
              <p className={`text-lg font-bold ${scoreColor(report.overallScore)}`}>{report.overallScore}</p>
              <p className="text-xs text-slate-400">ATS Score</p>
            </div>
          </div>

          {/* JD Match */}
          {report.jdMatch && (
            <div className="rounded-lg bg-indigo-50 px-3 py-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-indigo-700">JD Match</span>
                <span className="font-bold text-indigo-700">{report.jdMatch.score}%</span>
              </div>
              {report.jdMatch.missingSkills.length > 0 && (
                <p className="mt-1 text-[10px] text-indigo-500">
                  Missing: {report.jdMatch.missingSkills.slice(0, 8).join(', ')}
                </p>
              )}
            </div>
          )}

          {/* Contact */}
          {report.contactDetails && (
            <div className={`rounded-lg px-3 py-2 ${report.contactDetails.score >= 80 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
              <p className="text-xs font-medium text-slate-600 mb-1">Contact Info</p>
              <div className="flex flex-wrap gap-1 text-[10px]">
                {report.contactDetails.email && <span className="rounded bg-white px-1.5 py-0.5 text-emerald-600">📧 Email</span>}
                {report.contactDetails.phone && <span className="rounded bg-white px-1.5 py-0.5 text-emerald-600">📞 Phone</span>}
                {report.contactDetails.linkedin && <span className="rounded bg-white px-1.5 py-0.5 text-emerald-600">🔗 LinkedIn</span>}
                {report.contactDetails.github && <span className="rounded bg-white px-1.5 py-0.5 text-emerald-600">💻 GitHub</span>}
                {report.contactDetails.missing.map((m) => (
                  <span key={m} className="rounded bg-white px-1.5 py-0.5 text-red-400">✗ {m}</span>
                ))}
              </div>
            </div>
          )}

          {/* Category Scores */}
          <div className="space-y-1.5">
            {[
              ['Keywords', report.categoryScores.keywordDensity || report.categoryScores.keywords],
              ['Bullet Quality', report.categoryScores.bulletQuality || 0],
              ['Formatting', report.categoryScores.formatting],
              ['Readability', report.categoryScores.readability],
              ['Section Order', report.categoryScores.sectionOrder || report.categoryScores.structure],
              ['Contact', report.categoryScores.contactCompleteness || report.categoryScores.contactInfo],
            ].map(([label, score]) => (
              <div key={label as string} className="flex items-center gap-2">
                <span className="w-22 text-xs text-slate-500">{label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${scoreBg(score as number)}`}
                    style={{ width: `${Math.max(0, score as number)}%` }} />
                </div>
                <span className={`w-7 text-xs font-medium text-right ${scoreColor(score as number)}`}>{score}</span>
              </div>
            ))}
          </div>

          {/* Bullet Analysis */}
          {report.bulletAnalysis && report.bulletAnalysis.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-600 mb-1">Bullet Analysis ({report.bulletAnalysis.length})</p>
              <div className="space-y-1 max-h-40 overflow-auto">
                {report.bulletAnalysis.slice(0, 10).map((b, i) => (
                  <div key={i} className="flex items-start gap-2 text-[10px]">
                    <span className={`mt-0.5 w-4 text-center font-bold ${b.score >= 6 ? 'text-emerald-500' : b.score >= 3 ? 'text-amber-500' : 'text-red-400'}`}>
                      {b.score}
                    </span>
                    <div className="flex-1">
                      <p className="text-slate-600 line-clamp-1">{b.text}</p>
                      <div className="flex gap-1 mt-0.5">
                        {b.startsWithVerb && b.verbStrength && (
                          <span className={`rounded px-1 py-0.5 ${b.verbStrength.tier === 'high' ? 'bg-emerald-100 text-emerald-600' : b.verbStrength.tier === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-500'}`}>
                            {b.verbStrength.tier}
                          </span>
                        )}
                        {b.hasMetric && <span className="rounded bg-blue-100 px-1 py-0.5 text-blue-600">metric</span>}
                        {!b.startsWithVerb && <span className="rounded bg-red-100 px-1 py-0.5 text-red-500">no verb</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-600 mb-1">Recommendations</p>
              <ul className="space-y-1">
                {report.recommendations.map((r, i) => (
                  <li key={i} className="text-xs text-slate-500 flex gap-1.5">
                    <span className="text-indigo-400">•</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="border-t border-slate-100 px-4 py-2">
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}
    </div>
  );
}

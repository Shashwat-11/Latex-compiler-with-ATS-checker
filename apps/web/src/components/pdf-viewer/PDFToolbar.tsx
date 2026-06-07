import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Download } from 'lucide-react';

interface PDFToolbarProps {
  pageNum: number; numPages: number; scale: number;
  onPageChange: (page: number) => void; onScaleChange: (scale: number) => void;
  pdfUrl?: string | null;
}

export function PDFToolbar({ pageNum, numPages, scale, onPageChange, onScaleChange, pdfUrl }: PDFToolbarProps) {
  const handleDownload = () => { if (pdfUrl) window.open(pdfUrl, '_blank'); };
  const btnClass = "rounded p-0.5 text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all";

  return (
    <div className="flex h-9 items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 shrink-0">
      <div className="flex items-center gap-2">
        <button onClick={() => onPageChange(Math.max(1, pageNum - 1))} disabled={pageNum <= 1} className={btnClass}><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-xs text-[var(--text-secondary)] tabular-nums">{pageNum} / {numPages}</span>
        <button onClick={() => onPageChange(Math.min(numPages, pageNum + 1))} disabled={pageNum >= numPages} className={btnClass}><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onScaleChange(Math.max(0.5, scale - 0.1))} className={btnClass}><ZoomOut className="h-4 w-4" /></button>
        <span className="text-xs text-[var(--text-secondary)] w-10 text-center tabular-nums">{Math.round(scale * 100)}%</span>
        <button onClick={() => onScaleChange(Math.min(3, scale + 0.1))} className={btnClass}><ZoomIn className="h-4 w-4" /></button>
      </div>
      <button onClick={handleDownload} disabled={!pdfUrl} className={btnClass} title={pdfUrl ? 'Download PDF' : 'No PDF'}><Download className="h-4 w-4" /></button>
    </div>
  );
}

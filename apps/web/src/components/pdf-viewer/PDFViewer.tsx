import { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { useCompilationStore } from '../../stores/compilation.store.js';
import { PDFToolbar } from './PDFToolbar.js';
import { Spinner } from '../shared/Spinner.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export function PDFViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { pdfUrl, isCompiling, status } = useCompilationStore();

  const renderAllPages = useCallback(async (doc: pdfjsLib.PDFDocumentProxy, s: number) => {
    if (!pagesRef.current) return;
    pagesRef.current.innerHTML = '';

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: s });

      const canvas = document.createElement('canvas');
      canvas.className = 'shadow-md mb-3 pdf-canvas-fade-in';
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      canvas.setAttribute('data-page', String(i));

      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      pagesRef.current.appendChild(canvas);
    }
  }, []);

  useEffect(() => {
    if (!pdfUrl) {
      setPdfDoc(null); setNumPages(0); setError(null);
      if (pagesRef.current) pagesRef.current.innerHTML = '';
      return;
    }
    setLoading(true); setError(null);
    let cancelled = false;

    (async () => {
      try {
        const doc = await pdfjsLib.getDocument(pdfUrl).promise;
        if (cancelled) return;
        setPdfDoc(doc); setNumPages(doc.numPages); setCurrentPage(1);
        await renderAllPages(doc, scale);
      } catch {
        if (!cancelled) setError('Failed to load PDF');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [pdfUrl, renderAllPages, scale]);

  useEffect(() => {
    if (pdfDoc) renderAllPages(pdfDoc, scale);
  }, [pdfDoc, scale, renderAllPages]);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setCurrentPage(parseInt(entry.target.getAttribute('data-page') || '1'));
          }
        }
      },
      { root: el, threshold: 0.3 }
    );
    // Observe after a short delay to let canvases render
    const timer = setTimeout(() => {
      pagesRef.current?.querySelectorAll('canvas').forEach((c) => observer.observe(c));
    }, 100);
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, [numPages]);

  const jumpToPage = (page: number) => {
    pagesRef.current?.querySelector(`[data-page="${page}"]`)?.scrollIntoView({ behavior: 'smooth' });
  };

  if (isCompiling || loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-[var(--text-secondary)]">
        <Spinner />
        <p className="text-sm">{status === 'compiling' ? 'Compiling LaTeX...' : status === 'queued' ? 'Queued...' : 'Loading PDF...'}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
        <div className="rounded-full bg-red-100 p-3">
          <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
        </div>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!pdfDoc) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-[var(--text-secondary)]">
        <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
        <p className="text-sm">Compile to see PDF preview</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" ref={containerRef}>
      <PDFToolbar
        pageNum={currentPage}
        numPages={numPages}
        scale={scale}
        onPageChange={jumpToPage}
        onScaleChange={setScale}
        pdfUrl={pdfUrl}
      />
      <div className="flex-1 overflow-auto bg-[var(--bg)] p-4">
        <div ref={pagesRef} className="mx-auto" style={{ maxWidth: `${8.5 * scale * 96}px` }} />
      </div>
    </div>
  );
}

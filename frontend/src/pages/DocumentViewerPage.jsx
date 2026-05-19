import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, RotateCw, Maximize2, FileText
} from 'lucide-react';
import { documentService } from '../services/api';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default function DocumentViewerPage() {
  const { id }   = useParams();
  const { dark } = useTheme();

  const bg        = dark ? '#0F172A' : '#F1F5F9';
  const toolbar   = dark ? '#1E293B' : '#FFFFFF';
  const border    = dark ? '#334155' : '#E2E8F0';
  const btnHover  = dark ? '#334155' : '#F1F5F9';
  const btnBg     = dark ? '#0F172A' : '#F8FAFC';
  const textMuted = dark ? '#94A3B8' : '#64748B';
  const textMain  = dark ? '#F1F5F9' : '#0F172A';

  const [doc,        setDoc]        = useState(null);
  const [numPages,   setNumPages]   = useState(null);
  const [page,       setPage]       = useState(1);
  const [scale,      setScale]      = useState(1.2);
  const [rotation,   setRotation]   = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [fullscreen, setFullscreen] = useState(false);

  // Block print
  useEffect(() => {
    const block = (e) => { e.stopImmediatePropagation(); e.preventDefault(); };
    window.addEventListener('beforeprint', block, true);
    const origPrint = window.print;
    window.print = () => {};
    return () => {
      window.removeEventListener('beforeprint', block, true);
      window.print = origPrint;
    };
  }, []);

  // Block Ctrl+P
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  // No-print CSS
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'no-print-viewer';
    style.textContent = '@media print { body { display: none !important; } }';
    document.head.appendChild(style);
    return () => document.getElementById('no-print-viewer')?.remove();
  }, []);

  useEffect(() => {
    documentService.getOne(id)
      .then((res) => { setDoc(res.data); setLoading(false); })
      .catch(() => { setError('Dokumen tidak ditemukan'); setLoading(false); });
  }, [id]);

  const onLoadSuccess = useCallback(({ numPages }) => setNumPages(numPages), []);

  const zoomIn  = () => setScale((s) => Math.min(s + 0.2, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.2, 0.5));
  const rotate  = () => setRotation((r) => (r + 90) % 360);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm" style={{ color: textMuted }}>Memuat dokumen...</p>
      </div>
    </div>
  );

  if (error || !doc?.url_dokumen) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
      <div className="text-center">
        <FileText size={40} className="mx-auto mb-3" style={{ color: textMuted }} />
        <p className="font-medium mb-1" style={{ color: textMain }}>{error || 'File tidak tersedia'}</p>
        <button onClick={() => window.close()} className="text-orange-500 text-sm mt-2 cursor-pointer hover:underline">
          Tutup Tab
        </button>
      </div>
    </div>
  );

  const pdfUrl = doc.url_dokumen.startsWith('http') ? doc.url_dokumen : doc.url_dokumen;

  return (
    <div className="min-h-screen flex flex-col select-none" style={{ background: bg }}>

      {/* Toolbar */}
      <div
        className="flex items-center gap-3 px-5 py-3 border-b flex-shrink-0"
        style={{ background: toolbar, borderColor: border }}
      >

        {/* Doc info */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(249,115,22,0.15)' }}>
            <FileText size={13} style={{ color: '#F97316' }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: textMain }}>{doc.judul}</p>
            <p className="text-xs" style={{ color: textMuted }}>{doc.nomor_dokumen}</p>
          </div>
        </div>

        {/* Page nav */}
        <div className="flex items-center gap-1 rounded-lg px-1 py-1" style={{ background: btnBg, border: `1px solid ${border}` }}>
          <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page <= 1}
            className="w-7 h-7 flex items-center justify-center rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            style={{ color: textMuted }} onMouseEnter={e => e.currentTarget.style.background = btnHover} onMouseLeave={e => e.currentTarget.style.background = ''}>
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-medium px-2 tabular-nums" style={{ color: textMain }}>
            {page} / {numPages ?? '—'}
          </span>
          <button onClick={() => setPage((p) => Math.min(p + 1, numPages ?? p))} disabled={page >= (numPages ?? 1)}
            className="w-7 h-7 flex items-center justify-center rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            style={{ color: textMuted }} onMouseEnter={e => e.currentTarget.style.background = btnHover} onMouseLeave={e => e.currentTarget.style.background = ''}>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Zoom & Rotate */}
        <div className="flex items-center gap-1 rounded-lg px-1 py-1" style={{ background: btnBg, border: `1px solid ${border}` }}>
          <button onClick={zoomOut} title="Perkecil"
            className="w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer"
            style={{ color: textMuted }} onMouseEnter={e => e.currentTarget.style.background = btnHover} onMouseLeave={e => e.currentTarget.style.background = ''}>
            <ZoomOut size={13} />
          </button>
          <span className="text-xs font-medium px-2 tabular-nums w-12 text-center" style={{ color: textMain }}>
            {Math.round(scale * 100)}%
          </span>
          <button onClick={zoomIn} title="Perbesar"
            className="w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer"
            style={{ color: textMuted }} onMouseEnter={e => e.currentTarget.style.background = btnHover} onMouseLeave={e => e.currentTarget.style.background = ''}>
            <ZoomIn size={13} />
          </button>
        </div>

        <button onClick={rotate} title="Putar"
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer"
          style={{ color: textMuted }} onMouseEnter={e => e.currentTarget.style.background = btnHover} onMouseLeave={e => e.currentTarget.style.background = ''}>
          <RotateCw size={14} />
        </button>

        <button onClick={() => { document.documentElement.requestFullscreen?.(); setFullscreen(true); }} title="Layar penuh"
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer"
          style={{ color: textMuted }} onMouseEnter={e => e.currentTarget.style.background = btnHover} onMouseLeave={e => e.currentTarget.style.background = ''}>
          <Maximize2 size={14} />
        </button>

        {/* Badge pemilik */}
        {doc.pemilik && (
          <span className="text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0"
            style={{ background: 'rgba(249,115,22,0.15)', color: '#FB923C' }}>
            {doc.pemilik}
          </span>
        )}
      </div>

      {/* PDF area */}
      <div className="flex-1 overflow-auto flex justify-center py-8 px-4" style={{ background: bg }}>
        <Document
          file={pdfUrl}
          onLoadSuccess={onLoadSuccess}
          onLoadError={() => setError('Gagal memuat file PDF')}
          loading={
            <div className="flex flex-col items-center gap-3 mt-20">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm" style={{ color: textMuted }}>Memuat halaman...</p>
            </div>
          }
        >
          <Page
            pageNumber={page}
            scale={scale}
            rotate={rotation}
            renderTextLayer={true}
            renderAnnotationLayer={false}
            className="shadow-2xl rounded-sm"
          />
        </Document>
      </div>

      {/* Bottom page indicator */}
      {numPages && numPages > 1 && (
        <div className="flex justify-center py-3 border-t gap-1.5 flex-wrap"
          style={{ background: toolbar, borderColor: border }}>
          {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)}
              className="w-7 h-7 text-xs font-medium rounded-md transition-all cursor-pointer"
              style={p === page
                ? { background: '#F97316', color: '#fff' }
                : { color: textMuted, background: 'transparent' }
              }>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

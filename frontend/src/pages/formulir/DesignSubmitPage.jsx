import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UploadCloud, CheckCircle, X, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { formulirService } from '../../services/api';

const RS_CODES = ['PHG','PEVH','PHBP','PHBW','PHPC','PHRA','PHSW'];

function FileSlot({ code, file, onChange, onClear }) {
  const [drag, setDrag] = useState(false);
  return (
    <div>
      {file ? (
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border"
          style={{ borderColor:'var(--c-border)', background:'var(--c-hover)' }}>
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={13} style={{ color:'#F97316', flexShrink:0 }} />
            <span className="text-xs text-ink truncate">{file.name}</span>
            <span className="text-2xs text-ink-faint flex-shrink-0">
              {file.name.split('.').pop().toUpperCase()}
            </span>
          </div>
          <button type="button" onClick={onClear} className="text-ink-faint hover:text-red-500 cursor-pointer flex-shrink-0">
            <X size={12} />
          </button>
        </div>
      ) : (
        <label
          className="flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed cursor-pointer transition-all py-5"
          style={{ borderColor: drag ? '#F97316' : 'var(--c-border)', background: drag ? 'rgba(249,115,22,0.04)' : 'transparent' }}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); if(e.dataTransfer.files[0]) onChange(e.dataTransfer.files[0]); }}>
          <UploadCloud size={18} style={{ color: drag ? '#F97316' : 'var(--c-text-faint)' }} />
          <span className="text-xs text-ink-faint">Klik atau drop file</span>
          <span className="text-2xs text-ink-faint">PDF / DOC / DOCX</span>
          <input type="file" accept=".pdf,.doc,.docx" className="hidden"
            onChange={e => { if(e.target.files[0]) onChange(e.target.files[0]); }} />
        </label>
      )}
    </div>
  );
}

export default function DesignSubmitPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [formulir,   setFormulir]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [kadivList,  setKadivList]  = useState([]);
  const [kadivId,    setKadivId]    = useState('');
  const [files,      setFiles]      = useState(() =>
    Object.fromEntries(RS_CODES.map(c => [`file_${c}`, null]))
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    formulirService.getOne(id).then(({ data }) => {
      setFormulir(data);
      formulirService.getKadivList({ departemen_id: data.departemen_id, rs_id: data.rs_pengaju_id })
        .then(({ data: k }) => setKadivList(k || []));
    }).catch(() => toast.error('Gagal memuat')).finally(() => setLoading(false));
  }, [id]);

  const uploadedCount = Object.values(files).filter(Boolean).length;
  const allDone       = uploadedCount === RS_CODES.length && kadivId;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allDone) { toast.error('Lengkapi semua file dan pilih Kadiv'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('kadiv_user_id', kadivId);
      RS_CODES.forEach(c => fd.append(`file_${c}`, files[`file_${c}`]));
      await formulirService.submitDesign(id, fd);
      toast.success('Design submitted! Formulir telah dirilis.');
      navigate(`/formulir/${id}`);
    } catch(e) { toast.error(e.response?.data?.message || 'Gagal submit'); } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3 animate-fade-in">
      <div className="flex items-start gap-3">
        <button type="button" onClick={() => navigate(-1)} className="mt-1 text-ink-faint hover:text-ink cursor-pointer">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-ink font-display">Upload File Design</h1>
          <p className="text-sm text-ink-muted mt-0.5">{formulir?.nama_formulir} · {formulir?.departemen_nama}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-xl border p-4" style={{ background:'var(--c-card)', borderColor:'var(--c-border)' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-ink">{uploadedCount} dari {RS_CODES.length} file terupload</p>
          <p className="text-xs text-ink-faint">{uploadedCount}/{RS_CODES.length}</p>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background:'var(--c-hover)' }}>
          <div className="h-full rounded-full transition-all duration-300"
            style={{ width:`${(uploadedCount/RS_CODES.length)*100}%`, background:'#F97316' }} />
        </div>
      </div>

      {/* File grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {RS_CODES.map(code => {
          const f = files[`file_${code}`];
          return (
            <div key={code} className="rounded-xl border p-4 space-y-3 transition-all"
              style={{ background:'var(--c-card)', borderColor: f ? '#22C55E' : 'var(--c-border)',
                       boxShadow: f ? '0 0 0 1px rgba(34,197,94,0.2)' : 'var(--shadow-sm)' }}>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sm text-ink">{code}</span>
                {f
                  ? <CheckCircle size={15} className="text-green-500" />
                  : <span className="text-xs text-ink-faint">Belum diupload</span>
                }
              </div>
              <FileSlot
                code={code}
                file={f}
                onChange={file => setFiles(prev => ({...prev, [`file_${code}`]: file}))}
                onClear={() => setFiles(prev => ({...prev, [`file_${code}`]: null}))}
              />
            </div>
          );
        })}
      </div>

      {/* Kadiv */}
      <div className="rounded-xl border p-4 space-y-2" style={{ background:'var(--c-card)', borderColor:'var(--c-border)' }}>
        <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide block">
          Pilih Kadiv Penerima Notifikasi <span className="text-red-500">*</span>
        </label>
        <select value={kadivId} onChange={e => setKadivId(e.target.value)} className="input-field w-full">
          <option value="">-- Pilih Kadiv --</option>
          {kadivList.map(k => <option key={k.id} value={k.id}>{k.nama} ({k.email})</option>)}
        </select>
        {kadivList.length === 0 && (
          <p className="text-xs text-amber-600">Tidak ada Kadiv terdaftar untuk departemen ini. Hubungi Admin.</p>
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Batal</button>
        <button type="submit" disabled={!allDone || submitting}
          title={!allDone ? `Upload semua file (${uploadedCount}/${RS_CODES.length}) dan pilih Kadiv` : ''}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: allDone ? '#8B5CF6' : '#9CA3AF', cursor: allDone ? 'pointer' : 'not-allowed' }}
          onMouseEnter={e => { if(allDone) e.currentTarget.style.background='#7C3AED'; }}
          onMouseLeave={e => { if(allDone) e.currentTarget.style.background = allDone ? '#8B5CF6' : '#9CA3AF'; }}>
          {submitting ? 'Menyimpan...' : 'Submit & Release Formulir'}
        </button>
      </div>
    </form>
  );
}

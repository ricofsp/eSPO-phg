import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { formulirService, divisionService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

export default function PengajuanBaruPage() {
  const navigate = useNavigate();
  const { user }  = useAuth();

  const [form,      setForm]      = useState({ nama_formulir: '', departemen_id: '' });
  const [file,      setFile]      = useState(null);
  const [divisions, setDivisions] = useState([]);
  const [dragOver,  setDragOver]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [unique,    setUnique]    = useState(null); // null | 'checking' | 'ok' | 'exists'
  const [errors,    setErrors]    = useState({});
  const fileRef = useRef(null);

  useEffect(() => {
    divisionService.getAll({ all:'1' }).then(({ data: r }) => setDivisions(r.data || [])).catch(()=>{});
  }, []);

  const checkUniq = useDebounce(async (nama, dep) => {
    if (!nama.trim() || !dep) { setUnique(null); return; }
    setUnique('checking');
    try {
      const { data } = await formulirService.checkUnique({ nama_formulir: nama, departemen_id: dep });
      setUnique(data.exists ? 'exists' : 'ok');
    } catch { setUnique(null); }
  }, 500);

  useEffect(() => {
    checkUniq(form.nama_formulir, form.departemen_id);
  }, [form.nama_formulir, form.departemen_id]);

  const handleFile = (f) => {
    const allowed = ['.pdf','.doc','.docx'];
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(ext)) { setErrors(e => ({...e, file:'Hanya PDF/DOC/DOCX'})); return; }
    if (f.size > 10*1024*1024)  { setErrors(e => ({...e, file:'Ukuran maks 10 MB'})); return; }
    setFile(f);
    setErrors(e => ({...e, file:''}));
  };

  const canSubmit = form.nama_formulir.trim() && form.departemen_id && file && unique === 'ok' && !saving;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('nama_formulir', form.nama_formulir.trim());
      fd.append('departemen_id', form.departemen_id);
      fd.append('file', file);
      await formulirService.create(fd);
      toast.success('Pengajuan berhasil dikirim!');
      navigate('/formulir/pengajuan-saya');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengirim pengajuan');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-3 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-ink font-display">Pengajuan Formulir Baru</h1>
        <p className="text-sm text-ink-muted mt-0.5">Upload draft formulir untuk direview oleh Tim Mutu</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border p-6 space-y-3"
        style={{ background:'var(--c-card)', borderColor:'var(--c-border)' }}>

        {/* Nama formulir */}
        <div>
          <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide block mb-1.5">
            Nama Formulir <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              value={form.nama_formulir}
              onChange={e => setForm(f => ({...f, nama_formulir: e.target.value}))}
              placeholder="Contoh: Formulir Persetujuan Tindakan Medis"
              className="input-field w-full pr-8"
            />
            {unique === 'checking' && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#015c80] border-t-transparent rounded-full animate-spin" />
            )}
            {unique === 'ok' && <CheckCircle size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />}
            {unique === 'exists' && <AlertCircle size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" />}
          </div>
          {unique === 'exists' && (
            <p className="text-xs text-red-500 mt-1">Formulir dengan nama dan departemen ini sudah ada atau sedang diajukan.</p>
          )}
        </div>

        {/* Departemen */}
        <div>
          <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide block mb-1.5">
            Departemen <span className="text-red-500">*</span>
          </label>
          <select
            value={form.departemen_id}
            onChange={e => setForm(f => ({...f, departemen_id: e.target.value}))}
            className="input-field w-full"
          >
            <option value="">-- Pilih Departemen --</option>
            {divisions.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
          </select>
        </div>

        {/* File upload */}
        <div>
          <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide block mb-1.5">
            File Draft <span className="text-red-500">*</span>
            <span className="ml-1 normal-case font-normal text-ink-faint">(PDF, DOC, DOCX · maks 10 MB)</span>
          </label>
          {file ? (
            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border"
              style={{ borderColor:'var(--c-border)', background:'var(--c-hover)' }}>
              <div className="flex items-center gap-2">
                <FileText size={16} style={{ color:'#015c80' }} />
                <div>
                  <p className="text-sm font-medium text-ink">{file.name}</p>
                  <p className="text-xs text-ink-faint">{(file.size/1024).toFixed(0)} KB</p>
                </div>
              </div>
              <button type="button" onClick={() => setFile(null)} className="text-ink-faint hover:text-red-500 transition-colors cursor-pointer">
                <X size={15} />
              </button>
            </div>
          ) : (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); if(e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-all py-8"
              style={{ borderColor: dragOver ? '#015c80' : 'var(--c-border)', background: dragOver ? 'rgba(1,92,128,0.04)' : 'var(--c-hover)' }}
            >
              <UploadCloud size={24} style={{ color: dragOver ? '#015c80' : 'var(--c-text-faint)' }} />
              <p className="text-sm text-ink-muted">Drag & drop atau <span style={{ color:'#015c80' }} className="font-semibold">pilih file</span></p>
              <p className="text-xs text-ink-faint">PDF, DOC, DOCX · Maks 10 MB</p>
            </div>
          )}
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
            onChange={e => { if(e.target.files[0]) handleFile(e.target.files[0]); }} />
          {errors.file && <p className="text-xs text-red-500 mt-1">{errors.file}</p>}
        </div>

        {/* RS info */}
        {user?.hospital_id && (
          <div className="px-3 py-2 rounded-lg text-xs text-ink-muted" style={{ background:'var(--c-hover)' }}>
            Pengajuan atas nama RS Anda akan otomatis tercatat.
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Batal</button>
          <button type="submit" disabled={!canSubmit}
            className="btn-primary transition-all"
            style={{ opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
            {saving ? 'Mengirim...' : 'Kirim Pengajuan'}
          </button>
        </div>
      </form>
    </div>
  );
}

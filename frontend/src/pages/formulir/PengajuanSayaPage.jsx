import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, FileText, UploadCloud, X, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { formulirService, divisionService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/ui/Modal';
import StatusBadge from './StatusBadge';

function formatDate(str) {
  if (!str) return '-';
  const d = new Date(str);
  const pad = n => String(n).padStart(2,'0');
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
}

function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

const EMPTY_FORM = { nama_formulir: '' };

export default function PengajuanSayaPage() {
  const navigate  = useNavigate();
  const { user }  = useAuth();

  // Ambil departemen_id pertama dari divisi_id user
  const userDivisiId = user?.divisi_id
    ? String(user.divisi_id).split(',').map(s => s.trim()).filter(Boolean)[0]
    : null;

  // List state
  const [data,      setData]      = useState([]);
  const [loading,   setLoading]   = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [file,      setFile]      = useState(null);
  const [divisions, setDivisions] = useState([]);
  const [dragOver,  setDragOver]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [unique,    setUnique]    = useState(null);
  const [fileError, setFileError] = useState('');
  const fileRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data: r } = await formulirService.getMySubmissions();
      setData(r.data || []);
    } catch(e) {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (modalOpen && !divisions.length && userDivisiId)
      divisionService.getOne(userDivisiId).then(({ data }) => setDivisions([data])).catch(()=>{});
  }, [modalOpen]);

  const checkUniq = useDebounce(async (nama) => {
    if (!nama.trim() || !userDivisiId) { setUnique(null); return; }
    setUnique('checking');
    try {
      const { data } = await formulirService.checkUnique({ nama_formulir: nama, departemen_id: userDivisiId });
      setUnique(data.exists ? 'exists' : 'ok');
    } catch { setUnique(null); }
  }, 500);

  useEffect(() => {
    checkUniq(form.nama_formulir);
  }, [form.nama_formulir]);

  const openModal = () => {
    setForm(EMPTY_FORM);
    setFile(null);
    setUnique(null);
    setFileError('');
    setModalOpen(true);
  };

  const handleFile = (f) => {
    const allowed = ['.pdf','.doc','.docx'];
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(ext)) { setFileError('Hanya PDF/DOC/DOCX'); return; }
    if (f.size > 10*1024*1024)  { setFileError('Ukuran maks 10 MB'); return; }
    setFile(f);
    setFileError('');
  };

  const canSubmit = form.nama_formulir.trim() && userDivisiId && file && unique === 'ok' && !saving;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('nama_formulir', form.nama_formulir.trim());
      fd.append('file', file);
      await formulirService.create(fd);
      toast.success('Pengajuan berhasil dikirim!');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengirim pengajuan');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink font-display">Formulir</h1>
          <p className="text-sm text-ink-muted mt-0.5">Pantau dan kelola pengajuan formulir Anda</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-secondary !px-3" title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openModal} className="btn-primary gap-1.5">
            <Plus size={14} /> Pengajuan Baru
          </button>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background:'var(--c-card)', borderColor:'var(--c-border)' }}>
        <table className="w-full" style={{ minWidth: 700 }}>
          <thead>
            <tr style={{ background:'var(--c-hover)', borderBottom:'1px solid var(--c-border)' }}>
              <th className="table-th w-8">No</th>
              <th className="table-th">Nama Formulir</th>
              <th className="table-th">Departemen</th>
              <th className="table-th" style={{ width: 180 }}>Status</th>
              <th className="table-th whitespace-nowrap" style={{ width: 100 }}>Tgl Pengajuan</th>
              <th className="table-th" style={{ width: 60 }}>Detail</th>
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({length:4}).map((_,i) => (
              <tr key={i} style={{ borderBottom:'1px solid var(--c-border)' }}>
                {Array.from({length:6}).map((_,j) => (
                  <td key={j} className="table-td"><div className="h-4 rounded animate-pulse" style={{ background:'var(--c-hover)' }} /></td>
                ))}
              </tr>
            )) : data.length === 0 ? (
              <tr><td colSpan={6} className="py-20 text-center">
                <div className="flex flex-col items-center gap-3">
                  <FileText size={36} className="text-ink-faint" />
                  <p className="text-sm text-ink-faint">Belum ada pengajuan</p>
                  <button onClick={openModal} className="btn-primary text-xs gap-1">
                    <Plus size={12} /> Buat Pengajuan Baru
                  </button>
                </div>
              </td></tr>
            ) : data.map((row, idx) => (
              <tr key={row.id} className="table-row">
                <td className="table-td text-xs text-center text-ink-faint">{idx+1}</td>
                <td className="table-td font-medium text-ink">{row.nama_formulir}</td>
                <td className="table-td text-sm text-ink-muted">{row.departemen_nama || '-'}</td>
                <td className="table-td"><StatusBadge status={row.status} /></td>
                <td className="table-td text-sm text-ink-muted whitespace-nowrap">{formatDate(row.created_at)}</td>
                <td className="table-td text-center">
                  <button onClick={() => navigate(`/formulir/${row.id}`)}
                    className="text-xs px-2 py-1 rounded-md transition-all cursor-pointer"
                    style={{ background:'rgba(249,115,22,0.08)', color:'#F97316' }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(249,115,22,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.background='rgba(249,115,22,0.08)'}>
                    Lihat
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Pengajuan Baru */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Pengajuan Formulir Baru" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">

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
                <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
              )}
              {unique === 'ok'     && <CheckCircle  size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />}
              {unique === 'exists' && <AlertCircle  size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" />}
            </div>
            {unique === 'exists' && (
              <p className="text-xs text-red-500 mt-1">Formulir dengan nama dan departemen ini sudah ada atau sedang diajukan.</p>
            )}
          </div>

          {/* Departemen — otomatis dari akun user */}
          <div>
            <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide block mb-1.5">Departemen</label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm"
              style={{ borderColor:'var(--c-border)', background:'var(--c-hover)', color:'var(--c-text-muted)' }}>
              {divisions[0]?.nama || (userDivisiId ? 'Memuat...' : <span className="text-red-500">Belum diatur — hubungi Admin</span>)}
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background:'rgba(249,115,22,0.1)', color:'#F97316' }}>
                Otomatis
              </span>
            </div>
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
                  <FileText size={16} style={{ color:'#F97316' }} />
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
                className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-all py-7"
                style={{ borderColor: dragOver ? '#F97316' : 'var(--c-border)', background: dragOver ? 'rgba(249,115,22,0.04)' : 'var(--c-hover)' }}
              >
                <UploadCloud size={22} style={{ color: dragOver ? '#F97316' : 'var(--c-text-faint)' }} />
                <p className="text-sm text-ink-muted">Drag & drop atau <span style={{ color:'#F97316' }} className="font-semibold">pilih file</span></p>
                <p className="text-xs text-ink-faint">PDF, DOC, DOCX · Maks 10 MB</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
              onChange={e => { if(e.target.files[0]) handleFile(e.target.files[0]); }} />
            {fileError && <p className="text-xs text-red-500 mt-1">{fileError}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Batal</button>
            <button type="submit" disabled={!canSubmit}
              className="btn-primary transition-all"
              style={{ opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
              {saving ? 'Mengirim...' : 'Kirim Pengajuan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, FileText, UploadCloud, X, CheckSquare, Square, ChevronDown, ChevronUp, FileEdit, ShieldCheck, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { spoService, divisionService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/ui/Modal';
import { StatusBadge, fmtDate } from './spoUtils.jsx';

const EMPTY_FORM = { judul: '', nomor_dokumen: '', pemilik: '', keterangan: '', hak_akses: [] };

export default function PengajuanSayaSpoPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // List
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab]             = useState(0);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [file, setFile]           = useState(null);
  const [fileError, setFileError] = useState('');
  const [dragOver, setDragOver]   = useState(false);
  const [errors, setErrors]       = useState({});

  // Data for form
  const [divisions, setDivisions]   = useState([]);
  const [kadivList, setKadivList]   = useState([]);
  const [selected, setSelected]     = useState([]);   // kadiv reviewer IDs
  const [groupOpen, setGroupOpen]   = useState({});
  const [saving, setSaving]         = useState(false);
  const fileRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data: r } = await spoService.getMySubmissions();
      setData(r.data || r || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  async function openModal() {
    setForm(EMPTY_FORM);
    setFile(null);
    setFileError('');
    setErrors({});
    setSelected([]);
    setGroupOpen({});
    setTab(0);
    setModalOpen(true);

    try {
      const [divRes, kadivRes] = await Promise.all([
        divisionService.getAll({ limit: 500 }),
        spoService.getKadivRs({ rs_id: user?.hospital_id }),
      ]);
      setDivisions(divRes.data?.data || divRes.data || []);
      const kd = kadivRes.data;
      setKadivList(Array.isArray(kd) ? kd : (kd?.data || []));
    } catch { /* ignore */ }
  }

  // Kadiv grouped by divisi, filtered to selected hak_akses
  const filteredKadiv = form.hak_akses.length > 0
    ? kadivList.filter(k => form.hak_akses.includes(k.divisi_kode))
    : [];

  const grouped = filteredKadiv.reduce((acc, k) => {
    const key = k.divisi_nama || 'Tanpa Divisi';
    if (!acc[key]) acc[key] = [];
    acc[key].push(k);
    return acc;
  }, {});

  // Auto-select/deselect reviewers when hak_akses changes
  function toggleHakAkses(kode) {
    setForm(f => {
      const newHak = f.hak_akses.includes(kode)
        ? f.hak_akses.filter(k => k !== kode)
        : [...f.hak_akses, kode];
      // Hapus reviewer yang divisinya tidak lagi dipilih
      setSelected(prev => prev.filter(id => {
        const k = kadivList.find(k => k.id === id);
        return k && newHak.includes(k.divisi_kode);
      }));
      return { ...f, hak_akses: newHak };
    });
  }

  function selectAllHakAkses() {
    const allKodes = divisions.map(d => d.kode);
    setForm(f => ({ ...f, hak_akses: allKodes }));
  }

  function toggleKadiv(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function toggleGroup(ids) {
    const allSel = ids.every(id => selected.includes(id));
    setSelected(prev => allSel ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]);
  }

  function handleFile(f) {
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
    if (!['.pdf', '.doc', '.docx'].includes(ext)) { setFileError('Hanya PDF/DOC/DOCX'); return; }
    if (f.size > 10 * 1024 * 1024) { setFileError('Ukuran maks 10 MB'); return; }
    setFile(f);
    setFileError('');
  }

  function validate() {
    const e = {};
    if (!form.judul.trim()) e.judul = 'Wajib diisi';
    if (!file) e.file = 'File wajib diupload';
    if (selected.length === 0) e.reviewer = 'Pilih minimal 1 Kadiv RS reviewer';
    return e;
  }

  async function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      // jump to first tab with error
      if (errs.judul || errs.file) setTab(0);
      else if (errs.reviewer) setTab(2);
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('judul',         form.judul.trim());
      fd.append('nomor_dokumen', form.nomor_dokumen.trim());
      fd.append('pemilik',       form.pemilik.trim());
      fd.append('keterangan',    form.keterangan.trim());
      form.hak_akses.forEach(k => fd.append('hak_akses', k));
      fd.append('file', file);
      selected.forEach(id => fd.append('kadiv_reviewer_ids', id));
      await spoService.create(fd);
      toast.success('Pengajuan SPO berhasil dikirim!');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengirim pengajuan');
    } finally { setSaving(false); }
  }

  const hakAksesCount = form.hak_akses.length;
  const reviewerCount = selected.length;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink font-display">SPO</h1>
          <p className="text-sm text-ink-muted mt-0.5">Pantau dan kelola pengajuan SPO Anda</p>
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

      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--c-card)', borderColor: 'var(--c-border)' }}>
        <table className="w-full" style={{ minWidth: 600 }}>
          <thead>
            <tr style={{ background: 'var(--c-hover)', borderBottom: '1px solid var(--c-border)' }}>
              <th className="table-th w-8">No</th>
              <th className="table-th">Judul SPO</th>
              <th className="table-th">Nomor</th>
              <th className="table-th" style={{ width: 200 }}>Status</th>
              <th className="table-th whitespace-nowrap" style={{ width: 110 }}>Tgl Pengajuan</th>
              <th className="table-th" style={{ width: 60 }}>Detail</th>
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--c-border)' }}>
                {Array.from({ length: 6 }).map((_, j) => (
                  <td key={j} className="table-td"><div className="h-4 rounded animate-pulse" style={{ background: 'var(--c-hover)' }} /></td>
                ))}
              </tr>
            )) : data.length === 0 ? (
              <tr><td colSpan={6} className="py-20 text-center">
                <div className="flex flex-col items-center gap-3">
                  <FileText size={36} className="text-ink-faint" />
                  <p className="text-sm text-ink-faint">Belum ada pengajuan SPO</p>
                  <button onClick={openModal} className="btn-primary text-xs gap-1">
                    <Plus size={12} /> Buat Pengajuan Baru
                  </button>
                </div>
              </td></tr>
            ) : data.map((row, idx) => (
              <tr key={row.id} className="table-row">
                <td className="table-td text-xs text-center text-ink-faint">{idx + 1}</td>
                <td className="table-td font-medium text-ink">{row.judul}</td>
                <td className="table-td text-sm text-ink-muted">{row.nomor_dokumen}</td>
                <td className="table-td"><StatusBadge status={row.workflow_status} /></td>
                <td className="table-td text-sm text-ink-muted whitespace-nowrap">{fmtDate(row.submitted_at || row.created_at)}</td>
                <td className="table-td text-center">
                  <button onClick={() => navigate(`/spo/${row.id}`)}
                    className="text-xs px-2 py-1 rounded-md transition-all cursor-pointer"
                    style={{ background: 'rgba(1,92,128,0.08)', color: '#015c80' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(1,92,128,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(1,92,128,0.08)'}>
                    Lihat
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Pengajuan Baru */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Pengajuan SPO Baru" size="xl">
        <div>

          {/* Tab bar */}
          <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'var(--c-hover)' }}>
            {[
              { icon: <FileEdit size={13} />,   label: 'Informasi Dokumen' },
              { icon: <ShieldCheck size={13} />, label: 'Hak Akses', badge: hakAksesCount || null },
              { icon: <Users size={13} />,       label: 'Reviewer', badge: reviewerCount || null },
            ].map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setTab(i)}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-all cursor-pointer"
                style={tab === i
                  ? { background: '#015c80', color: '#fff', boxShadow: 'var(--shadow-sm)' }
                  : { color: 'var(--c-text-muted)' }}
              >
                {t.icon}
                {t.label}
                {t.badge ? (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: '10px' }}>
                    {t.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {/* TAB 0 — Informasi Dokumen */}
          {tab === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide block mb-1.5">
                    Nomor Dokumen
                    <span className="ml-1 normal-case font-normal text-ink-faint">(kosong = auto)</span>
                  </label>
                  <input
                    value={form.nomor_dokumen}
                    onChange={e => setForm(f => ({ ...f, nomor_dokumen: e.target.value }))}
                    placeholder="SPO/IGD/001"
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide block mb-1.5">Pemilik</label>
                  <select
                    value={form.pemilik}
                    onChange={e => setForm(f => ({ ...f, pemilik: e.target.value }))}
                    className="input-field w-full"
                  >
                    <option value="">-- Pilih Divisi Pemilik --</option>
                    {divisions.map(d => (
                      <option key={d.id} value={d.nama}>{d.nama}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide block mb-1.5">
                  Judul SPO <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.judul}
                  onChange={e => { setForm(f => ({ ...f, judul: e.target.value })); setErrors(r => ({ ...r, judul: '' })); }}
                  placeholder="Prosedur Penanganan Pasien Gawat Darurat"
                  className="input-field w-full"
                />
                {errors.judul && <p className="text-xs text-red-500 mt-1">{errors.judul}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide block mb-1.5">
                  File SPO <span className="text-red-500">*</span>
                  <span className="ml-1 normal-case font-normal text-ink-faint">(PDF, DOC, DOCX · maks 10 MB)</span>
                </label>
                {file ? (
                  <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border"
                    style={{ borderColor: 'var(--c-border)', background: 'var(--c-hover)' }}>
                    <div className="flex items-center gap-2">
                      <FileText size={16} style={{ color: '#015c80' }} />
                      <div>
                        <p className="text-sm font-medium text-ink">{file.name}</p>
                        <p className="text-xs text-ink-faint">{(file.size / 1024).toFixed(0)} KB</p>
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
                    onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                    onClick={() => fileRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-all py-6"
                    style={{ borderColor: dragOver ? '#015c80' : 'var(--c-border)', background: dragOver ? 'rgba(1,92,128,0.04)' : 'var(--c-hover)' }}
                  >
                    <UploadCloud size={22} style={{ color: dragOver ? '#015c80' : 'var(--c-text-faint)' }} />
                    <p className="text-sm text-ink-muted">Drag & drop atau <span style={{ color: '#015c80' }} className="font-semibold">pilih file</span></p>
                  </div>
                )}
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
                  onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }} />
                {fileError && <p className="text-xs text-red-500 mt-1">{fileError}</p>}
                {errors.file && <p className="text-xs text-red-500 mt-1">{errors.file}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide block mb-1.5">Keterangan</label>
                <textarea
                  value={form.keterangan}
                  onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
                  placeholder="Keterangan tambahan (opsional)"
                  rows={3}
                  className="input-field w-full resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 1 — Hak Akses */}
          {tab === 1 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-ink">Hak Akses Divisi</p>
                  <p className="text-xs text-ink-faint mt-0.5">
                    Pilih divisi yang bisa mengakses SPO ini — Kadiv dari divisi terpilih akan menjadi reviewer
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={selectAllHakAkses}
                    className="text-xs font-medium transition-colors cursor-pointer" style={{ color: '#015c80' }}>
                    Pilih semua
                  </button>
                  {form.hak_akses.length > 0 && (
                    <button type="button"
                      onClick={() => { setForm(f => ({ ...f, hak_akses: [] })); setSelected([]); }}
                      className="text-xs text-ink-faint hover:text-red-500 transition-colors cursor-pointer">
                      Hapus semua ({form.hak_akses.length})
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 p-3 rounded-xl border"
                style={{ borderColor: 'var(--c-border)', background: 'var(--c-hover)', minHeight: '120px' }}>
                {divisions.map(d => {
                  const active = form.hak_akses.includes(d.kode);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleHakAkses(d.kode)}
                      className="text-xs px-2.5 py-1 rounded-full font-medium transition-all cursor-pointer"
                      style={active
                        ? { background: '#015c80', color: '#fff', boxShadow: '0 2px 6px rgba(1,92,128,0.3)' }
                        : { background: 'var(--c-card)', color: 'var(--c-text-muted)', border: '1px solid var(--c-border)' }}
                    >
                      {d.kode}
                    </button>
                  );
                })}
                {!divisions.length && <span className="text-xs text-ink-faint">Memuat divisi...</span>}
              </div>
              {form.hak_akses.length > 0 && (
                <p className="text-xs text-ink-faint mt-2">
                  {form.hak_akses.length} divisi dipilih → reviewer pada tab berikutnya difilter otomatis
                </p>
              )}
            </div>
          )}

          {/* TAB 2 — Reviewer */}
          {tab === 2 && (
            <div>
              <div className="mb-3">
                <p className="text-sm font-semibold text-ink">Kadiv RS Reviewer</p>
                <p className="text-xs text-ink-faint mt-0.5">
                  {form.hak_akses.length > 0
                    ? `Menampilkan Kadiv RS dari divisi: ${form.hak_akses.join(', ')}`
                    : 'Semua Kadiv RS dari RS Anda'}
                  {' · '}{selected.length} dipilih
                </p>
              </div>
              {errors.reviewer && <p className="text-xs text-red-500 mb-2">{errors.reviewer}</p>}

              {filteredKadiv.length === 0 ? (
                <div className="py-8 text-center rounded-xl border" style={{ borderColor: 'var(--c-border)', background: 'var(--c-hover)' }}>
                  <p className="text-sm text-ink-faint">
                    {form.hak_akses.length === 0
                      ? 'Pilih divisi di tab Hak Akses terlebih dahulu untuk menampilkan reviewer.'
                      : 'Tidak ada Kadiv RS dari divisi yang dipilih. Coba pilih divisi lain di tab Hak Akses.'}
                  </p>
                  {form.hak_akses.length === 0 && (
                    <button type="button" onClick={() => setTab(1)}
                      className="mt-3 text-xs font-semibold"
                      style={{ color: '#015c80' }}>
                      ← Ke tab Hak Akses
                    </button>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--c-border)' }}>
                  {Object.entries(grouped).map(([divNama, members]) => {
                    const ids = members.map(m => m.id);
                    const allSel = ids.every(id => selected.includes(id));
                    const open = groupOpen[divNama] !== false;
                    return (
                      <div key={divNama}>
                        <button type="button"
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold"
                          style={{ background: 'var(--c-hover)', color: 'var(--c-text)', borderBottom: '1px solid var(--c-border)' }}
                          onClick={() => setGroupOpen(g => ({ ...g, [divNama]: !open }))}>
                          <span onClick={e => { e.stopPropagation(); toggleGroup(ids); }}>
                            {allSel
                              ? <CheckSquare size={14} style={{ color: '#015c80' }} />
                              : <Square size={14} style={{ color: 'var(--c-text-faint)' }} />}
                          </span>
                          <span className="flex-1 text-left">{divNama}</span>
                          <span className="font-normal text-ink-faint">{members.length} orang</span>
                          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                        {open && members.map(m => (
                          <label key={m.id} className="flex items-center gap-2.5 px-4 py-2.5 cursor-pointer"
                            style={{
                              background: selected.includes(m.id) ? 'rgba(1,92,128,0.04)' : 'var(--c-card)',
                              borderBottom: '1px solid var(--c-border)',
                            }}>
                            <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggleKadiv(m.id)} className="accent-[#015c80]" />
                            <div>
                              <p className="text-xs font-medium text-ink">{m.nama}</p>
                              <p className="text-xs text-ink-faint">{m.email}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-ink-faint mt-2">
                Kadiv Corp level akan di-assign otomatis berdasarkan divisi Kadiv RS yang dipilih
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-5 mt-2 border-t" style={{ borderColor: 'var(--c-border)' }}>
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Batal</button>
            {tab < 2 ? (
              <button type="button" onClick={() => setTab(t => t + 1)} className="btn-primary">
                Lanjut →
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={saving}
                className="btn-primary"
                style={{ opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Mengirim...' : 'Kirim Pengajuan'}
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

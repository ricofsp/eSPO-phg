import { useState, useEffect, useRef } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { UploadCloud, X, FileText, FileEdit, ShieldCheck } from 'lucide-react';

const EMPTY = { nomor_dokumen: '', pemilik: '', judul: '', divisi_id: [], keterangan: '', is_active: 1 };

export default function DocumentForm({ open, onClose, onSubmit, initialData, divisions }) {
  const [form,    setForm]    = useState(EMPTY);
  const [file,    setFile]    = useState(null);
  const [errors,  setErrors]  = useState({});
  const [saving,  setSaving]  = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [tab,     setTab]     = useState(0);
  const fileRef = useRef(null);

  const isEdit = !!initialData;

  useEffect(() => {
    if (open) {
      const kodes = initialData?.divisi_id
        ? initialData.divisi_id.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      setForm(initialData
        ? { nomor_dokumen: initialData.nomor_dokumen, pemilik: initialData.pemilik || '', judul: initialData.judul, divisi_id: kodes, keterangan: initialData.keterangan || '', is_active: initialData.is_active ?? 1 }
        : EMPTY
      );
      setFile(null);
      setErrors({});
      setTab(0);
    }
  }, [open, initialData]);

  const toggleDivisi = (id) => {
    setForm((f) => ({
      ...f,
      divisi_id: f.divisi_id.includes(id) ? f.divisi_id.filter((d) => d !== id) : [...f.divisi_id, id],
    }));
  };

  const handleFile = (f) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(ext)) { setErrors((e) => ({ ...e, file: 'Hanya PDF, DOC, atau DOCX' })); return; }
    if (f.size > 20 * 1024 * 1024) { setErrors((e) => ({ ...e, file: 'Ukuran file maks 20 MB' })); return; }
    setFile(f);
    setErrors((e) => ({ ...e, file: '' }));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const validate = () => {
    const e = {};
    if (!form.nomor_dokumen.trim()) e.nomor_dokumen = 'Wajib diisi';
    if (!form.judul.trim())         e.judul         = 'Wajib diisi';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('nomor_dokumen', form.nomor_dokumen.trim());
      fd.append('pemilik',       form.pemilik.trim());
      fd.append('judul',         form.judul.trim());
      fd.append('keterangan',    form.keterangan);
      fd.append('is_active',     form.is_active);
      form.divisi_id.forEach((id) => fd.append('divisi_id', id));
      if (file) fd.append('file', file);
      await onSubmit(fd);
      onClose();
    } catch (err) {
      setErrors({ _form: err.response?.data?.message || 'Terjadi kesalahan' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit SPO' : 'Tambah SPO'} size="xl">
      <form onSubmit={handleSubmit}>
        {/* Tab bar */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'var(--c-hover)' }}>
          {[
            { icon: <FileEdit size={13} />, label: 'Informasi Dokumen' },
            { icon: <ShieldCheck size={13} />, label: 'Hak Akses', badge: form.divisi_id.length || null },
          ].map((t, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setTab(i)}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-all cursor-pointer"
              style={tab === i
                ? { background: 'var(--c-card)', color: '#F97316', boxShadow: 'var(--shadow-sm)' }
                : { color: 'var(--c-text-muted)' }
              }
            >
              {t.icon}
              {t.label}
              {t.badge ? (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#F97316', color: '#fff', fontSize: '10px' }}>{t.badge}</span>
              ) : null}
            </button>
          ))}
        </div>

        {errors._form && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-500 mb-4">{errors._form}</div>
        )}

        {/* Tab 1 — Informasi Dokumen */}
        {tab === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide block mb-1.5">Nomor Dokumen <span className="text-red-500">*</span></label>
                <input
                  value={form.nomor_dokumen}
                  onChange={(e) => { setForm((f) => ({ ...f, nomor_dokumen: e.target.value })); setErrors((r) => ({ ...r, nomor_dokumen: '' })); }}
                  placeholder="SPO-IGD-001"
                  className="input-field w-full"
                />
                {errors.nomor_dokumen && <p className="text-xs text-red-500 mt-1">{errors.nomor_dokumen}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide block mb-1.5">Status</label>
                <select value={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: parseInt(e.target.value) }))} className="input-field w-full">
                  <option value={1}>Aktif</option>
                  <option value={0}>Nonaktif</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide block mb-1.5">Pemilik</label>
              <select value={form.pemilik} onChange={(e) => setForm((f) => ({ ...f, pemilik: e.target.value }))} className="input-field w-full">
                <option value="">-- Pilih Divisi Pemilik --</option>
                {(divisions || []).map((d) => (
                  <option key={d.id} value={d.nama}>{d.nama}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide block mb-1.5">Judul SPO <span className="text-red-500">*</span></label>
              <input
                value={form.judul}
                onChange={(e) => { setForm((f) => ({ ...f, judul: e.target.value })); setErrors((r) => ({ ...r, judul: '' })); }}
                placeholder="Prosedur Penanganan Pasien Gawat Darurat"
                className="input-field w-full"
              />
              {errors.judul && <p className="text-xs text-red-500 mt-1">{errors.judul}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide block mb-1.5">
                File Dokumen {isEdit && <span className="text-ink-faint normal-case font-normal">(kosongkan jika tidak diubah)</span>}
              </label>
              {file ? (
                <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border" style={{ borderColor: 'var(--c-border)', background: 'var(--c-hover)' }}>
                  <div className="flex items-center gap-2">
                    <FileText size={16} style={{ color: '#F97316' }} />
                    <div>
                      <p className="text-sm font-medium text-ink">{file.name}</p>
                      <p className="text-xs text-ink-faint">{(file.size / 1024).toFixed(0)} KB</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setFile(null)} className="text-ink-faint hover:text-red-500 transition-colors cursor-pointer"><X size={15} /></button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-all py-6"
                  style={{ borderColor: dragOver ? '#F97316' : 'var(--c-border)', background: dragOver ? 'rgba(249,115,22,0.04)' : 'var(--c-hover)' }}
                >
                  <UploadCloud size={22} style={{ color: dragOver ? '#F97316' : 'var(--c-text-faint)' }} />
                  <p className="text-sm text-ink-muted">Drag & drop atau <span style={{ color: '#F97316' }} className="font-semibold">pilih file</span></p>
                  <p className="text-xs text-ink-faint">PDF, DOC, DOCX · Maks 20 MB</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => { if (e.target.files[0]) handleFile(e.target.files[0]); }} />
              {errors.file && <p className="text-xs text-red-500 mt-1">{errors.file}</p>}
              {isEdit && initialData?.nama_dokumen && !file && (
                <p className="text-xs text-ink-faint mt-1.5">File saat ini: <span className="text-ink font-medium">{initialData.nama_dokumen}</span></p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide block mb-1.5">Keterangan</label>
              <textarea
                value={form.keterangan}
                onChange={(e) => setForm((f) => ({ ...f, keterangan: e.target.value }))}
                placeholder="Keterangan tambahan (opsional)"
                rows={3}
                className="input-field w-full resize-none"
              />
            </div>
          </div>
        )}

        {/* Tab 2 — Hak Akses */}
        {tab === 1 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-ink">Hak Akses Divisi</p>
                <p className="text-xs text-ink-faint mt-0.5">Pilih divisi yang dapat mengakses dokumen ini</p>
              </div>
              <div className="flex items-center gap-3">
                <button type="button"
                  onClick={() => setForm((f) => ({ ...f, divisi_id: (divisions || []).map((d) => d.kode) }))}
                  className="text-xs font-medium transition-colors cursor-pointer" style={{ color: '#F97316' }}>
                  Pilih semua
                </button>
                {form.divisi_id.length > 0 && (
                  <button type="button" onClick={() => setForm((f) => ({ ...f, divisi_id: [] }))}
                    className="text-xs text-ink-faint hover:text-red-500 transition-colors cursor-pointer">
                    Hapus semua ({form.divisi_id.length})
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 p-3 rounded-xl border" style={{ borderColor: 'var(--c-border)', background: 'var(--c-hover)', minHeight: '120px' }}>
              {(divisions || []).map((d) => {
                const active = form.divisi_id.includes(d.kode);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDivisi(d.kode)}
                    className="text-xs px-2.5 py-1 rounded-full font-medium transition-all cursor-pointer"
                    style={active
                      ? { background: '#F97316', color: '#fff', boxShadow: '0 2px 6px rgba(249,115,22,0.3)' }
                      : { background: 'var(--c-card)', color: 'var(--c-text-muted)', border: '1px solid var(--c-border)' }
                    }
                  >
                    {d.kode}
                  </button>
                );
              })}
              {!divisions?.length && <span className="text-xs text-ink-faint">Belum ada divisi</span>}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-5 mt-2 border-t" style={{ borderColor: 'var(--c-border)' }}>
          <Button variant="secondary" onClick={onClose} type="button">Batal</Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah SPO'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

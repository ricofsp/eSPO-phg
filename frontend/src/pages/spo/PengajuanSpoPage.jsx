import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, Download, Users, ChevronDown, ChevronUp, CheckSquare, Square } from 'lucide-react';
import toast from 'react-hot-toast';
import { spoService, divisionService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function PengajuanSpoPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [judul, setJudul]         = useState('');
  const [file, setFile]           = useState(null);
  const [dragging, setDragging]   = useState(false);
  const [kadivList, setKadivList] = useState([]);
  const [selected, setSelected]   = useState([]);
  const [groupOpen, setGroupOpen] = useState({});
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [divisiNama, setDivisiNama] = useState('');

  useEffect(() => {
    loadKadiv();
    loadTemplates();
    loadDivisi();
  }, []);

  async function loadDivisi() {
    if (!user?.divisi_id) return;
    try {
      const firstId = String(user.divisi_id).split(',')[0].trim();
      const { data } = await divisionService.getAll({ limit: 100 });
      const found = data.data?.find(d => String(d.id) === firstId);
      if (found) setDivisiNama(found.nama);
    } catch { /* ignore */ }
  }

  async function loadKadiv() {
    try {
      const { data } = await spoService.getKadivRs({ rs_id: user?.hospital_id });
      setKadivList(Array.isArray(data) ? data : (data.data || []));
    } catch { /* ignore */ }
  }

  async function loadTemplates() {
    try {
      const { data } = await spoService.getTemplates();
      setTemplates(Array.isArray(data) ? data : (data || []));
    } catch { /* ignore */ }
  }

  // Group kadiv by divisi
  const grouped = kadivList.reduce((acc, k) => {
    const key = k.divisi_nama || 'Tanpa Divisi';
    if (!acc[key]) acc[key] = [];
    acc[key].push(k);
    return acc;
  }, {});

  function toggleKadiv(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function toggleGroup(divisiNama, ids) {
    const allSelected = ids.every(id => selected.includes(id));
    setSelected(prev => allSelected
      ? prev.filter(id => !ids.includes(id))
      : [...new Set([...prev, ...ids])]
    );
  }

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!judul.trim())    return toast.error('Judul wajib diisi');
    if (!file)            return toast.error('File wajib diupload');
    if (!selected.length) return toast.error('Pilih minimal 1 Kadiv RS');

    setLoading(true);
    const fd = new FormData();
    fd.append('judul', judul.trim());
    fd.append('divisi_id', String(user?.divisi_id || '').split(',')[0]);
    fd.append('file', file);
    selected.forEach(id => fd.append('kadiv_reviewer_ids', id));

    try {
      await spoService.create(fd);
      toast.success('Pengajuan SPO berhasil dikirim');
      navigate('/spo/pengajuan-saya');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengirim pengajuan');
    }
    setLoading(false);
  }

  return (
    <div className="space-y-3" style={{ maxWidth: 760 }}>
      <div>
        <h1 className="text-lg font-bold" style={{ color: 'var(--c-text)' }}>Pengajuan SPO Baru</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--c-text-muted)' }}>
          Isi form berikut untuk mengajukan SPO baru ke proses approval
        </p>
      </div>

      {/* Template download */}
      {templates.length > 0 && (
        <div style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', padding: '12px 16px' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--c-text-muted)' }}>
            Template SPO tersedia ({templates.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {templates.map(t => (
              <a
                key={t.id}
                href={t.file_path}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary text-xs py-1 px-3"
              >
                <Download size={12} />
                {t.nama_template}
              </a>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Judul */}
        <div style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', padding: '16px' }}>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--c-text-muted)' }}>
            Judul SPO <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input
            className="input-field"
            placeholder="Masukkan judul SPO..."
            value={judul}
            onChange={e => setJudul(e.target.value)}
          />

          <div className="mt-3">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--c-text-muted)' }}>
              Departemen
            </label>
            <input
              className="input-field"
              value={divisiNama || user?.divisi_id || '-'}
              disabled
              style={{ opacity: 0.7, cursor: 'not-allowed' }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--c-text-faint)' }}>
              Departemen diambil otomatis dari akun Anda
            </p>
          </div>
        </div>

        {/* File upload */}
        <div style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', padding: '16px' }}>
          <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--c-text-muted)' }}>
            File SPO <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            style={{
              border: `2px dashed ${dragging ? '#F97316' : 'var(--c-border)'}`,
              borderRadius: 0,
              padding: '24px 16px',
              textAlign: 'center',
              background: dragging ? 'rgba(249,115,22,0.04)' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onClick={() => document.getElementById('spo-file-input').click()}
          >
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm font-medium" style={{ color: 'var(--c-text)' }}>{file.name}</span>
                <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }}
                  className="text-red-400 hover:text-red-600">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <Upload size={24} className="mx-auto mb-2" style={{ color: 'var(--c-text-faint)' }} />
                <p className="text-sm" style={{ color: 'var(--c-text-muted)' }}>
                  Drag & drop atau <span style={{ color: '#F97316', fontWeight: 600 }}>klik untuk pilih file</span>
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--c-text-faint)' }}>PDF, DOC, DOCX — maks. 10 MB</p>
              </>
            )}
          </div>
          <input
            id="spo-file-input"
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={e => setFile(e.target.files[0] || null)}
          />
        </div>

        {/* Kadiv RS Reviewer */}
        <div style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', padding: '16px' }}>
          <div className="flex items-center gap-2 mb-3">
            <Users size={15} style={{ color: 'var(--c-text-muted)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--c-text-muted)' }}>
              Kadiv RS Reviewer <span style={{ color: '#EF4444' }}>*</span>
            </span>
            {selected.length > 0 && (
              <span className="ml-auto text-xs font-semibold" style={{ color: '#F97316' }}>
                {selected.length} dipilih
              </span>
            )}
          </div>

          {kadivList.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--c-text-faint)' }}>
              Tidak ada Kadiv RS tersedia di RS Anda
            </p>
          ) : (
            <div className="space-y-2">
              {Object.entries(grouped).map(([divNama, members]) => {
                const ids = members.map(m => m.id);
                const allSel = ids.every(id => selected.includes(id));
                const open = groupOpen[divNama] !== false;
                return (
                  <div key={divNama} style={{ border: '1px solid var(--c-border)' }}>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold"
                      style={{ background: 'var(--c-hover)', color: 'var(--c-text)' }}
                      onClick={() => setGroupOpen(g => ({ ...g, [divNama]: !open }))}
                    >
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); toggleGroup(divNama, ids); }}
                        className="flex-shrink-0"
                      >
                        {allSel
                          ? <CheckSquare size={14} style={{ color: '#F97316' }} />
                          : <Square size={14} style={{ color: 'var(--c-text-faint)' }} />
                        }
                      </button>
                      <span className="flex-1 text-left">{divNama}</span>
                      <span style={{ color: 'var(--c-text-faint)', fontWeight: 400 }}>
                        {members.length} orang
                      </span>
                      {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    {open && (
                      <div className="divide-y" style={{ borderTop: '1px solid var(--c-border)' }}>
                        {members.map(m => (
                          <label key={m.id} className="flex items-center gap-2.5 px-4 py-2 cursor-pointer hover:bg-hover" style={{ background: 'var(--c-card)' }}>
                            <input
                              type="checkbox"
                              checked={selected.includes(m.id)}
                              onChange={() => toggleKadiv(m.id)}
                              className="accent-orange-500"
                            />
                            <div>
                              <p className="text-xs font-medium" style={{ color: 'var(--c-text)' }}>{m.nama}</p>
                              <p className="text-xs" style={{ color: 'var(--c-text-faint)' }}>{m.email}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs mt-2" style={{ color: 'var(--c-text-faint)' }}>
            Kadiv Corp akan di-assign otomatis berdasarkan divisi Kadiv RS yang dipilih
          </p>
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Mengirim...' : 'Kirim Pengajuan'}
          </button>
          <button type="button" onClick={() => navigate('/spo/pengajuan-saya')} className="btn-secondary">
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}

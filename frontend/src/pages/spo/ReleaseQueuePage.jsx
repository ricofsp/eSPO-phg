import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { spoService, hospitalService } from '../../services/api';
import { fmtDate } from './spoUtils.jsx';

export default function ReleaseQueuePage() {
  const navigate = useNavigate();
  const [rows, setRows]       = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [releasing, setReleasing] = useState(null); // spo id being released
  const [selectedRs, setSelectedRs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
    loadHospitals();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await spoService.getReleaseQueue();
      setRows(data.data || data);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function loadHospitals() {
    try {
      const { data } = await hospitalService.getAll({ limit: 100 });
      setHospitals(data.data || data);
    } catch { /* ignore */ }
  }

  function startRelease(id) {
    setReleasing(id);
    setSelectedRs([]);
  }

  function toggleRs(id) {
    setSelectedRs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function selectAll() {
    setSelectedRs(hospitals.map(h => h.id));
  }

  async function doRelease() {
    if (!selectedRs.length) return toast.error('Pilih minimal 1 RS');
    try {
      await spoService.release(releasing, { rs_ids: selectedRs });
      toast.success('SPO berhasil di-release');
      setReleasing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal release');
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-bold" style={{ color: 'var(--c-text)' }}>Rilis SPO</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--c-text-muted)' }}>
          SPO yang telah disetujui CEO dan siap diterbitkan ke RS
        </p>
      </div>

      <div style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', boxShadow: 'var(--shadow-sm)' }}>
        <table className="w-full">
          <thead style={{ borderBottom: '1px solid var(--c-border)', background: 'var(--c-hover)' }}>
            <tr>
              <th className="table-th" style={{ width: 40 }}>No</th>
              <th className="table-th">Judul SPO</th>
              <th className="table-th">Nomor</th>
              <th className="table-th">RS Pengaju</th>
              <th className="table-th">Tgl Pengajuan</th>
              <th className="table-th" style={{ width: 120 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="table-td text-center py-10" style={{ color: 'var(--c-text-faint)' }}>Memuat...</td></tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="table-td text-center py-12" style={{ color: 'var(--c-text-faint)' }}>
                  Tidak ada SPO dalam antrian release
                </td>
              </tr>
            ) : rows.map((r, i) => (
              <tr key={r.id} className="table-row">
                <td className="table-td text-center">{i + 1}</td>
                <td className="table-td font-medium" style={{ color: 'var(--c-text)' }}>
                  {r.judul}
                </td>
                <td className="table-td font-mono text-xs">{r.nomor_dokumen}</td>
                <td className="table-td">{r.rs_nama || '-'}</td>
                <td className="table-td">{fmtDate(r.submitted_at)}</td>
                <td className="table-td">
                  <div className="flex gap-1">
                    <button className="btn-secondary text-xs py-1 px-2" onClick={() => navigate(`/spo/${r.id}`)}>
                      Detail
                    </button>
                    <button
                      className="btn-primary text-xs py-1 px-2"
                      onClick={() => startRelease(r.id)}
                    >
                      <Send size={12} /> Release
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Release panel */}
      {releasing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }}>
          <div style={{
            background: 'var(--c-card)', border: '1px solid var(--c-border)',
            width: '100%', maxWidth: 860, maxHeight: '85vh',
            display: 'flex', flexDirection: 'column',
            boxShadow: 'var(--shadow-lg)',
          }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--c-border)' }}>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--c-text)' }}>Pilih RS Tujuan Rilis</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--c-text-faint)' }}>
                  {selectedRs.length > 0
                    ? `${selectedRs.length} dari ${hospitals.length} RS dipilih`
                    : `${hospitals.length} RS tersedia`}
                </p>
              </div>
              <button onClick={() => setReleasing(null)} className="btn-secondary text-xs py-1 px-3">✕ Batal</button>
            </div>

            {/* Select all */}
            <div className="px-5 py-2.5 flex items-center gap-3" style={{ borderBottom: '1px solid var(--c-border)', background: 'var(--c-hover)' }}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedRs.length === hospitals.length && hospitals.length > 0}
                  onChange={() => selectedRs.length === hospitals.length ? setSelectedRs([]) : selectAll()}
                  className="accent-orange-500"
                />
                <span className="text-xs font-semibold" style={{ color: 'var(--c-text)' }}>
                  Pilih Semua RS ({hospitals.length})
                </span>
              </label>
              {selectedRs.length > 0 && selectedRs.length < hospitals.length && (
                <button onClick={() => setSelectedRs([])}
                  className="text-xs" style={{ color: 'var(--c-text-faint)' }}>
                  Hapus pilihan
                </button>
              )}
            </div>

            {/* Grid RS */}
            <div className="flex-1 overflow-y-auto p-4">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {hospitals.map(h => {
                  const checked = selectedRs.includes(h.id);
                  return (
                    <label key={h.id} className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors"
                      style={{
                        border: `1px solid ${checked ? 'rgba(249,115,22,0.4)' : 'var(--c-border)'}`,
                        background: checked ? 'rgba(249,115,22,0.06)' : 'var(--c-card)',
                      }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRs(h.id)}
                        className="accent-orange-500 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--c-text)' }}>{h.nama}</p>
                        {h.singkatan && (
                          <p className="text-xs font-mono" style={{ color: checked ? '#F97316' : 'var(--c-text-faint)' }}>
                            {h.singkatan}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 flex items-center justify-between gap-3" style={{ borderTop: '1px solid var(--c-border)' }}>
              <p className="text-xs" style={{ color: 'var(--c-text-faint)' }}>
                SPO akan diterbitkan dan langsung tersedia di menu SPO untuk RS yang dipilih
              </p>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setReleasing(null)} className="btn-secondary">Batal</button>
                <button onClick={doRelease} className="btn-primary" disabled={!selectedRs.length}>
                  <Send size={14} /> Rilis ke {selectedRs.length || '...'} RS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

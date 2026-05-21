import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { spoService } from '../../services/api';
import { StatusBadge, fmtDate } from './spoUtils.jsx';
import { useAuth } from '../../context/AuthContext';

const ROLE_LABELS = {
  kadiv:       'Anda sebagai Kadiv RS — setujui atau tolak SPO dari RS Anda',
  direktur_rs: 'Anda sebagai Direktur RS — setujui atau tolak SPO dari RS Anda',
  kadiv_corp:  'Anda sebagai Kadiv Corp — setujui atau tolak SPO secara korporat',
  mutu_corp:   'Anda sebagai Mutu Corp — review akhir sebelum ke CEO',
  ceo:         'Anda sebagai CEO — persetujuan final SPO',
  admin:       'Tampilan admin — semua SPO yang perlu tindakan',
};

export default function ReviewSpoPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows]     = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await spoService.getForReview();
      setRows(data.data || data);
    } catch { /* ignore */ }
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold text-ink font-display">Review & Approval SPO</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--c-text-muted)' }}>
          {ROLE_LABELS[user?.role] || 'SPO yang memerlukan tindakan Anda'}
        </p>
      </div>

      <div style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', boxShadow: 'var(--shadow-sm)' }}>
        <table className="w-full">
          <thead style={{ borderBottom: '1px solid var(--c-border)', background: 'var(--c-hover)' }}>
            <tr>
              <th className="table-th" style={{ width: 40 }}>No</th>
              <th className="table-th">Judul SPO</th>
              <th className="table-th">RS / Departemen</th>
              <th className="table-th">Tgl Pengajuan</th>
              <th className="table-th">Status</th>
              {user?.role === 'kadiv' || user?.role === 'kadiv_corp' ? (
                <th className="table-th">Status Saya</th>
              ) : null}
              <th className="table-th" style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="table-td text-center py-10" style={{ color: 'var(--c-text-faint)' }}>Memuat...</td></tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="table-td text-center py-12" style={{ color: 'var(--c-text-faint)' }}>
                  Tidak ada SPO yang perlu ditinjau saat ini
                </td>
              </tr>
            ) : rows.map((r, i) => (
              <tr key={r.id} className="table-row">
                <td className="table-td text-center">{i + 1}</td>
                <td className="table-td">
                  <p className="font-medium" style={{ color: 'var(--c-text)' }}>{r.judul}</p>
                  <p className="text-xs" style={{ color: 'var(--c-text-faint)' }}>{r.nomor_dokumen}</p>
                </td>
                <td className="table-td">
                  <div style={{ color: 'var(--c-text)' }}>{r.rs_singkatan || r.rs_nama || '-'}</div>
                  <div className="text-xs" style={{ color: 'var(--c-text-faint)' }}>{r.departemen_nama}</div>
                </td>
                <td className="table-td">{fmtDate(r.submitted_at)}</td>
                <td className="table-td"><StatusBadge status={r.workflow_status} /></td>
                {(user?.role === 'kadiv' || user?.role === 'kadiv_corp') && (
                  <td className="table-td">
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px',
                      background: r.my_status === 'Approved' ? 'rgba(22,163,74,0.1)'
                        : r.my_status === 'Rejected' ? 'rgba(239,68,68,0.1)'
                        : 'rgba(217,119,6,0.1)',
                      color: r.my_status === 'Approved' ? '#16A34A'
                        : r.my_status === 'Rejected' ? '#EF4444'
                        : '#D97706',
                    }}>
                      {r.my_status || 'Pending'}
                    </span>
                  </td>
                )}
                <td className="table-td">
                  <button
                    className="btn-secondary text-xs py-1 px-3"
                    onClick={() => navigate(`/spo/${r.id}`)}
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

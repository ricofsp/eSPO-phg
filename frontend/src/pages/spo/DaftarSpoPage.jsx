import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { spoService } from '../../services/api';
import { StatusBadge, fmtDate } from './spoUtils.jsx';

export default function DaftarSpoPage() {
  const navigate = useNavigate();
  const [rows, setRows]     = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage]     = useState(1);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(false);
  const LIMIT = 15;

  useEffect(() => {
    load();
  }, [search, status, page]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await spoService.getAll({ search, status, page, limit: LIMIT });
      setRows(data.data);
      setTotal(data.pagination.total);
    } catch { /* ignore */ }
    setLoading(false);
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--c-text)' }}>Daftar SPO</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--c-text-muted)' }}>Semua pengajuan SPO dan status proses approval</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-faint)' }} />
          <input
            className="input-field pl-8 text-sm"
            style={{ width: 240 }}
            placeholder="Cari judul SPO..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="input-field text-sm"
          style={{ width: 200 }}
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">Semua Status</option>
          <option value="Pending_Kadiv_RS">Menunggu Kadiv RS</option>
          <option value="Pending_Dir_RS">Menunggu Dir RS</option>
          <option value="Pending_Kadiv_Corp">Menunggu Kadiv Corp</option>
          <option value="Pending_Mutu_Corp">Menunggu Mutu Corp</option>
          <option value="Pending_CEO">Menunggu CEO</option>
          <option value="Approved_CEO">Disetujui CEO</option>
          <option value="Released">Released</option>
          <option value="Rejected_By_Kadiv_RS">Ditolak Kadiv RS</option>
          <option value="Rejected_By_Dir_RS">Ditolak Dir RS</option>
          <option value="Rejected_By_Kadiv_Corp">Ditolak Kadiv Corp</option>
          <option value="Rejected_By_Mutu_Corp">Ditolak Mutu Corp</option>
          <option value="Rejected_By_CEO">Dikembalikan CEO</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', boxShadow: 'var(--shadow-sm)' }}>
        <table className="w-full">
          <thead style={{ borderBottom: '1px solid var(--c-border)', background: 'var(--c-hover)' }}>
            <tr>
              <th className="table-th" style={{ width: 40 }}>No</th>
              <th className="table-th">Judul SPO</th>
              <th className="table-th">Nomor</th>
              <th className="table-th">RS / Departemen</th>
              <th className="table-th">Tgl Pengajuan</th>
              <th className="table-th">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="table-td text-center py-10" style={{ color: 'var(--c-text-faint)' }}>Memuat...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="table-td text-center py-10" style={{ color: 'var(--c-text-faint)' }}>Tidak ada data</td></tr>
            ) : rows.map((r, i) => (
              <tr
                key={r.id}
                className="table-row cursor-pointer"
                onClick={() => navigate(`/spo/${r.id}`)}
              >
                <td className="table-td text-center">{(page - 1) * LIMIT + i + 1}</td>
                <td className="table-td font-medium" style={{ color: 'var(--c-text)' }}>{r.judul}</td>
                <td className="table-td font-mono text-xs">{r.nomor_dokumen}</td>
                <td className="table-td">
                  <div style={{ color: 'var(--c-text)' }}>{r.rs_singkatan || r.rs_nama || '-'}</div>
                  <div className="text-xs" style={{ color: 'var(--c-text-faint)' }}>{r.departemen_nama}</div>
                </td>
                <td className="table-td">{fmtDate(r.submitted_at || r.created_at)}</td>
                <td className="table-td"><StatusBadge status={r.workflow_status} /></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--c-border)' }}>
            <span className="text-xs" style={{ color: 'var(--c-text-faint)' }}>
              Total {total} data
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="btn-secondary px-2 py-1 text-xs" style={{ minWidth: 28 }}>
                <ChevronLeft size={13} />
              </button>
              <span className="text-xs px-2" style={{ color: 'var(--c-text-muted)' }}>{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="btn-secondary px-2 py-1 text-xs" style={{ minWidth: 28 }}>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

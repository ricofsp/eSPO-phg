import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, ClipboardCheck, FileText } from 'lucide-react';
import { formulirService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from './StatusBadge';

function formatDate(str) {
  if (!str) return '-';
  const d = new Date(str);
  const pad = n => String(n).padStart(2,'0');
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
}

const ROLE_LABEL = {
  mutu_rs:     'Mutu RS',
  mutu_corp:   'Mutu Corp',
  design_corp: 'Design Corp',
  admin:       'Admin',
};

export default function ReviewDashboardPage() {
  const navigate = useNavigate();
  const { user }  = useAuth();
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data: r } = await formulirService.getForReview();
      setData(r.data || []);
    } catch(e) {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const roleLabel = ROLE_LABEL[user?.role] || user?.role;

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink font-display">Review & Approval</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Formulir yang perlu ditindaklanjuti oleh <strong>{roleLabel}</strong>
          </p>
        </div>
        <button onClick={load} className="btn-secondary !px-3" title="Refresh">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {data.length > 0 && !loading && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border"
          style={{ background:'rgba(249,115,22,0.04)', borderColor:'rgba(249,115,22,0.2)' }}>
          <ClipboardCheck size={15} style={{ color:'#F97316' }} />
          <p className="text-sm" style={{ color:'#EA6B0C' }}>
            <strong>{data.length}</strong> formulir menunggu tindakan Anda
          </p>
        </div>
      )}

      <div className="rounded-xl border overflow-hidden" style={{ background:'var(--c-card)', borderColor:'var(--c-border)' }}>
        <table className="w-full" style={{ minWidth: 700 }}>
          <thead>
            <tr style={{ background:'var(--c-hover)', borderBottom:'1px solid var(--c-border)' }}>
              <th className="table-th w-8">No</th>
              <th className="table-th">Nama Formulir</th>
              <th className="table-th">Departemen</th>
              <th className="table-th">RS Pengaju</th>
              <th className="table-th" style={{ width: 160 }}>Status</th>
              <th className="table-th" style={{ width: 100 }}>Tgl Masuk</th>
              <th className="table-th" style={{ width: 80 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({length:4}).map((_,i) => (
              <tr key={i} style={{ borderBottom:'1px solid var(--c-border)' }}>
                {Array.from({length:7}).map((_,j) => (
                  <td key={j} className="table-td"><div className="h-4 rounded animate-pulse" style={{ background:'var(--c-hover)' }} /></td>
                ))}
              </tr>
            )) : data.length === 0 ? (
              <tr><td colSpan={7} className="py-20 text-center">
                <div className="flex flex-col items-center gap-2">
                  <ClipboardCheck size={36} className="text-ink-faint" />
                  <p className="text-sm text-ink-faint">Tidak ada formulir yang perlu ditindaklanjuti</p>
                </div>
              </td></tr>
            ) : data.map((row, idx) => (
              <tr key={row.id} className="table-row cursor-pointer" onClick={() => navigate(`/formulir/${row.id}`)}>
                <td className="table-td text-xs text-center text-ink-faint">{idx+1}</td>
                <td className="table-td font-medium text-ink">{row.nama_formulir}</td>
                <td className="table-td text-sm text-ink-muted">{row.departemen_nama || '-'}</td>
                <td className="table-td text-sm text-ink-muted">{row.rs_singkatan || '-'}</td>
                <td className="table-td"><StatusBadge status={row.status} /></td>
                <td className="table-td text-sm text-ink-muted">{formatDate(row.created_at)}</td>
                <td className="table-td" onClick={e => e.stopPropagation()}>
                  <button onClick={() => navigate(`/formulir/${row.id}`)}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-all text-white"
                    style={{ background:'#F97316' }}
                    onMouseEnter={e => e.currentTarget.style.background='#EA6B0C'}
                    onMouseLeave={e => e.currentTarget.style.background='#F97316'}>
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

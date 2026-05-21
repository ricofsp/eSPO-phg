import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, FileText, Filter, ExternalLink, RefreshCw } from 'lucide-react';
import { formulirService } from '../../services/api';
import { divisionService, hospitalService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from './StatusBadge';

function formatDate(str) {
  if (!str) return '-';
  const d = new Date(str);
  const pad = n => String(n).padStart(2,'0');
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
}

export default function DaftarFormulirPage() {
  const navigate = useNavigate();
  const { user }  = useAuth();
  const isCorp    = ['admin','mutu_corp','design_corp','corp_monitor'].includes(user?.role);

  const [data,       setData]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [divisions,  setDivisions]  = useState([]);
  const [hospitals,  setHospitals]  = useState([]);
  const [search,     setSearch]     = useState('');
  const [divFilter,  setDivFilter]  = useState('');
  const [rsFilter,   setRsFilter]   = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1, limit: 10 });

  useEffect(() => {
    divisionService.getAll({ all:'1' }).then(({ data: r }) => setDivisions(r.data || [])).catch(()=>{});
    if (isCorp) hospitalService.getAll({ all:'1' }).then(({ data: r }) => setHospitals(r.data || [])).catch(()=>{});
  }, [isCorp]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search, divFilter, rsFilter, pagination.page, pagination.limit]);

  async function load() {
    setLoading(true);
    try {
      const { data: r } = await formulirService.getAll({
        search, departemen_id: divFilter, rs_id: rsFilter,
        page: pagination.page, limit: pagination.limit,
      });
      setData(r.data);
      setPagination(p => ({ ...p, ...r.pagination }));
    } catch(e) {} finally { setLoading(false); }
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink font-display">Daftar Formulir</h1>
          <p className="text-sm text-ink-muted mt-0.5">Formulir yang telah dirilis dan tersedia</p>
        </div>
        <button onClick={load} className="btn-secondary !px-3" title="Refresh">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border" style={{ background:'var(--c-card)', borderColor:'var(--c-border)', boxShadow:'var(--shadow-sm)' }}>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPagination(p=>({...p,page:1})); }}
            placeholder="Cari nama formulir..." className="input-field pl-9 w-full" />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-ink-faint" />
          <select value={divFilter} onChange={e => { setDivFilter(e.target.value); setPagination(p=>({...p,page:1})); }} className="input-field !w-auto">
            <option value="">Semua Departemen</option>
            {divisions.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
          </select>
          {isCorp && (
            <select value={rsFilter} onChange={e => { setRsFilter(e.target.value); setPagination(p=>({...p,page:1})); }} className="input-field !w-auto">
              <option value="">Semua RS</option>
              {hospitals.map(h => <option key={h.id} value={h.id}>{h.singkatan} — {h.nama}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background:'var(--c-card)', borderColor:'var(--c-border)', boxShadow:'var(--shadow-sm)' }}>
        <table className="w-full" style={{ minWidth: 700 }}>
          <thead>
            <tr style={{ background:'var(--c-hover)', borderBottom:'1px solid var(--c-border)' }}>
              <th className="table-th w-8">No</th>
              <th className="table-th w-14">Baca</th>
              <th className="table-th">Nama Formulir</th>
              <th className="table-th">Departemen</th>
              {isCorp && <th className="table-th">RS</th>}
              <th className="table-th whitespace-nowrap" style={{ width: 110 }}>Tgl Released</th>
              <th className="table-th" style={{ width: 60 }}>Detail</th>
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({length:5}).map((_,i) => (
              <tr key={i} style={{ borderBottom:'1px solid var(--c-border)' }}>
                {Array.from({length: isCorp ? 6 : 5}).map((_,j) => (
                  <td key={j} className="table-td"><div className="h-4 rounded animate-pulse" style={{ background:'var(--c-hover)' }} /></td>
                ))}
              </tr>
            )) : data.length === 0 ? (
              <tr><td colSpan={isCorp ? 6 : 5} className="py-20 text-center">
                <div className="flex flex-col items-center gap-2">
                  <FileText size={36} className="text-ink-faint" />
                  <p className="text-sm text-ink-faint">Belum ada formulir tersedia</p>
                </div>
              </td></tr>
            ) : data.map((row, idx) => {
              const filePath = row.file_pdf_path || row.file_docx_path;
              const fileName = row.file_pdf_name || row.file_docx_name;
              const isPdf    = !!row.file_pdf_path;
              return (
                <tr key={row.id} className="table-row cursor-pointer" onClick={() => navigate(`/formulir/${row.id}`)}>
                  <td className="table-td text-xs text-center text-ink-faint">{(pagination.page-1)*pagination.limit+idx+1}</td>
                  <td className="table-td text-center" onClick={e => e.stopPropagation()}>
                    {filePath ? (
                      <a href={filePath} target="_blank" rel="noreferrer"
                        className="w-8 h-8 flex items-center justify-center rounded-md border mx-auto transition-all cursor-pointer"
                        style={{ borderColor:'var(--c-border)', color:'var(--c-text-muted)' }}
                        onMouseEnter={e => { e.currentTarget.style.background='rgba(249,115,22,0.08)'; e.currentTarget.style.color='#F97316'; e.currentTarget.style.borderColor='#F97316'; }}
                        onMouseLeave={e => { e.currentTarget.style.background=''; e.currentTarget.style.color=''; e.currentTarget.style.borderColor=''; }}
                        title={fileName}>
                        <Eye size={13} />
                      </a>
                    ) : <span className="text-xs text-ink-faint">—</span>}
                  </td>
                  <td className="table-td font-medium text-ink">{row.nama_formulir}</td>
                  <td className="table-td text-sm text-ink-muted">{row.departemen_nama || '-'}</td>
                  {isCorp && <td className="table-td text-sm text-ink-muted">{row.rs_singkatan || '-'}</td>}
                  <td className="table-td text-sm text-ink-muted whitespace-nowrap">{formatDate(row.released_at)}</td>
                  <td className="table-td text-center" onClick={e => e.stopPropagation()}>
                    <button onClick={() => navigate(`/formulir/${row.id}`)}
                      className="w-7 h-7 flex items-center justify-center rounded-md border transition-all cursor-pointer mx-auto"
                      style={{ borderColor:'var(--c-border)', color:'var(--c-text-muted)' }}
                      onMouseEnter={e => { e.currentTarget.style.background='rgba(249,115,22,0.08)'; e.currentTarget.style.color='#F97316'; e.currentTarget.style.borderColor='#F97316'; }}
                      onMouseLeave={e => { e.currentTarget.style.background=''; e.currentTarget.style.color=''; e.currentTarget.style.borderColor=''; }}
                      title="Lihat detail & proses approval">
                      <ExternalLink size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor:'var(--c-border)', background:'var(--c-hover)' }}>
            <p className="text-xs text-ink-faint">
              {(pagination.page-1)*pagination.limit+1}–{Math.min(pagination.page*pagination.limit, pagination.total)} dari {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              {Array.from({length: pagination.totalPages}, (_,i) => i+1)
                .filter(p => p===1 || p===pagination.totalPages || Math.abs(p-pagination.page)<=1)
                .reduce((acc,p,i,arr) => { if(i>0 && arr[i-1]!==p-1) acc.push('...'); acc.push(p); return acc; },[])
                .map((p,i) => p==='...'
                  ? <span key={`e${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-ink-faint">…</span>
                  : <button key={p} onClick={() => setPagination(prev=>({...prev,page:p}))}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-xs font-semibold transition-all cursor-pointer"
                      style={p===pagination.page ? {background:'#F97316',color:'#fff'} : {color:'var(--c-text-muted)'}}>
                      {p}
                    </button>
                )
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

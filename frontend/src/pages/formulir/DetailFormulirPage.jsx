import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Download, CheckCircle, XCircle, UploadCloud, X, Clock, Send, Palette, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { formulirService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from './StatusBadge';
import Modal from '../../components/ui/Modal';

const STEPS = ['RS','Mutu_RS','Mutu_Corp','Design_Corp','Done'];
const STEP_LABELS = { RS:'Pengajuan', Mutu_RS:'Mutu RS', Mutu_Corp:'Mutu Corp', Design_Corp:'Design', Done:'Released' };

function pad(n) { return String(n).padStart(2,'0'); }
function fmt(str) {
  if (!str) return '-';
  const d = new Date(str);
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtRel(str) {
  if (!str) return '';
  const diff = Date.now() - new Date(str);
  const m = Math.floor(diff/60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m/60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h/24)} hari lalu`;
}

const ACTION_META = {
  Submit:        { icon:'✓', color:'#22C55E', bg:'rgba(34,197,94,0.12)' },
  Approve:       { icon:'✓', color:'#22C55E', bg:'rgba(34,197,94,0.12)' },
  Reject:        { icon:'✗', color:'#EF4444', bg:'rgba(239,68,68,0.12)' },
  Replace_File:  { icon:'✓', color:'#22C55E', bg:'rgba(34,197,94,0.12)' },
  Submit_Design: { icon:'✓', color:'#22C55E', bg:'rgba(34,197,94,0.12)' },
  Release:       { icon:'✓', color:'#22C55E', bg:'rgba(34,197,94,0.12)' },
};

export default function DetailFormulirPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formulir, setFormulir] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('info');

  // Approve modal
  const [approveModal, setApproveModal] = useState(false);
  const [approving,    setApproving]    = useState(false);

  // Reject modal
  const [rejectModal,  setRejectModal]  = useState(false);
  const [rejectComment,setRejectComment] = useState('');
  const [rejecting,    setRejecting]    = useState(false);

  // Resubmit
  const [resubFile,    setResubFile]    = useState(null);
  const [resubNote,    setResubNote]    = useState('');
  const [resubbing,    setResubbing]    = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await formulirService.getOne(id);
      setFormulir(data);
    } catch(e) { toast.error('Gagal memuat data'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#015c80] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!formulir) return <div className="text-center py-20 text-ink-faint">Formulir tidak ditemukan</div>;

  const f = formulir;
  const role = user?.role;

  const canApprove   = (role==='mutu_rs' && f.current_step==='Mutu_RS') || (role==='mutu_corp' && f.current_step==='Mutu_Corp');
  const canReject    = canApprove;
  const canResubmit  = ['Rejected_By_Mutu_RS','Rejected_By_Mutu_Corp'].includes(f.status) && (f.created_by===user?.id || user?.hospital_id===f.rs_pengaju_id);
  const canDesign    = (role==='design_corp' || role==='admin') && f.current_step==='Design_Corp';

  const stepIdx = STEPS.indexOf(f.current_step);

  async function doApprove() {
    setApproving(true);
    try {
      await formulirService.approve(id, {});
      toast.success('Berhasil di-approve');
      setApproveModal(false);
      load();
    } catch(e) { toast.error(e.response?.data?.message || 'Gagal'); } finally { setApproving(false); }
  }

  async function doReject() {
    if (rejectComment.trim().length < 10) { toast.error('Komentar minimal 10 karakter'); return; }
    setRejecting(true);
    try {
      await formulirService.reject(id, { comment: rejectComment });
      toast.success('Berhasil di-reject');
      setRejectModal(false);
      setRejectComment('');
      load();
    } catch(e) { toast.error(e.response?.data?.message || 'Gagal'); } finally { setRejecting(false); }
  }

  async function doResubmit(e) {
    e.preventDefault();
    if (!resubFile) { toast.error('File wajib diupload'); return; }
    setResubbing(true);
    try {
      const fd = new FormData();
      fd.append('file', resubFile);
      if (resubNote) fd.append('note', resubNote);
      await formulirService.resubmit(id, fd);
      toast.success('Pengajuan ulang berhasil dikirim');
      setResubFile(null);
      setResubNote('');
      load();
    } catch(e) { toast.error(e.response?.data?.message || 'Gagal'); } finally { setResubbing(false); }
  }

  const latestDraft = f.drafts?.[0];

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(-1)} className="mt-1 text-ink-faint hover:text-ink transition-colors cursor-pointer">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-ink font-display">{f.nama_formulir}</h1>
          <p className="text-sm text-ink-muted mt-0.5">{f.departemen_nama} · {f.rs_nama}</p>
        </div>
        <StatusBadge status={f.status} size="md" />
      </div>

      {/* Progress stepper */}
      <div className="rounded-xl border p-5 overflow-x-auto" style={{ background:'var(--c-card)', borderColor:'var(--c-border)' }}>
        <div className="flex items-center min-w-max gap-0">
          {STEPS.map((step, i) => {
            const done    = i < stepIdx || f.current_step === 'Done';
            const active  = step === f.current_step && f.current_step !== 'Done';
            const histItem = step === 'Done'
              ? f.history?.find(h => h.action === 'Release')
              : f.history?.find(h => h.step === step && ['Approve','Release','Submit','Submit_Design'].includes(h.action));
            return (
              <div key={step} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    done ? 'bg-green-500 text-white' : active ? 'text-white ring-4 ring-[#7fb8cc]' : 'bg-gray-100 text-gray-400'
                  } ${active ? 'animate-pulse' : ''}`}
                    style={active ? { background:'#015c80' } : {}}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span className="text-xs font-semibold whitespace-nowrap" style={{ color: done ? '#16A34A' : active ? '#015c80' : 'var(--c-text-faint)' }}>
                    {STEP_LABELS[step]}
                  </span>
                  {histItem && (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-2xs text-ink-faint whitespace-nowrap">{fmt(histItem.created_at)}</span>
                      {histItem.actor_nama && <span className="text-2xs font-medium whitespace-nowrap" style={{ color: done ? '#16A34A' : '#015c80' }}>{histItem.actor_nama}</span>}
                    </div>
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-20 h-0.5 mx-2 mb-7" style={{ background: i < stepIdx || f.current_step === 'Done' ? '#22C55E' : 'var(--c-border)' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Left: tabs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-1 p-1 rounded-xl border" style={{ background:'var(--c-hover)', borderColor:'var(--c-border)' }}>
            {[['info','Info'],['drafts','Draft Versi'],['history','Riwayat']].map(([k,l]) => (
              <button key={k} onClick={() => setTab(k)}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
                style={tab===k ? { background:'#015c80', color:'#fff', boxShadow:'0 2px 8px rgba(1,92,128,0.3)' } : { color:'var(--c-text-muted)' }}>
                {l}
              </button>
            ))}
          </div>

          {tab === 'info' && (
            <div className="rounded-xl border overflow-hidden" style={{ background:'var(--c-card)', borderColor:'var(--c-border)' }}>
              {[
                ['Nama Formulir', f.nama_formulir],
                ['Departemen',    f.departemen_nama],
                ['RS Pengaju',    f.rs_nama],
                ['Diajukan oleh', f.created_by_nama],
                ['Tanggal Ajuan', fmt(f.created_at)],
                ['Status',        <StatusBadge status={f.status} />],
                f.released_at ? ['Tgl Released', fmt(f.released_at)] : ['Tgl Released', <span className="text-ink-faint">—</span>],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center gap-4 px-5 border-b last:border-0" style={{ borderColor:'var(--c-border)', height:'44px' }}>
                  <span className="text-xs text-ink-faint w-32 flex-shrink-0">{k}</span>
                  <span className="text-sm text-ink">{v}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'drafts' && (
            <div className="rounded-xl border overflow-hidden" style={{ background:'var(--c-card)', borderColor:'var(--c-border)' }}>
              {!f.drafts?.length ? (
                <div className="py-16 text-center text-sm text-ink-faint">Belum ada file draft</div>
              ) : f.drafts.map((d) => (
                <div key={d.id} className="flex items-center justify-between px-5 py-4 border-b last:border-0" style={{ borderColor:'var(--c-border)' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:'rgba(1,92,128,0.1)', color:'#015c80' }}>v{d.version}</span>
                    <div>
                      <p className="text-sm font-medium text-ink">{d.file_name}</p>
                      <p className="text-xs text-ink-faint">{d.uploader_nama} · {fmt(d.created_at)} · {d.uploaded_role}</p>
                    </div>
                  </div>
                  <a href={d.file_path} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                    style={{ background:'rgba(1,92,128,0.08)', color:'#015c80' }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(1,92,128,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.background='rgba(1,92,128,0.08)'}>
                    <Download size={11} /> Unduh
                  </a>
                </div>
              ))}
            </div>
          )}

          {tab === 'files' && (
            <div className="rounded-xl border overflow-hidden" style={{ background:'var(--c-card)', borderColor:'var(--c-border)' }}>
              {!f.files?.length ? (
                <div className="py-16 text-center text-sm text-ink-faint">Belum ada file final</div>
              ) : (
                <div className="grid grid-cols-2 divide-x" style={{ borderColor:'var(--c-border)' }}>
                  {[f.files.slice(0,4), f.files.slice(4)].map((col, ci) => (
                    <div key={ci}>
                      <div className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-ink-faint border-b" style={{ background:'var(--c-hover)', borderColor:'var(--c-border)' }}>
                        RS Code &nbsp;·&nbsp; File
                      </div>
                      {col.map((ff, ri) => {
                        const filePath = ff.file_pdf_path || ff.file_docx_path;
                        const fileName = ff.file_pdf_name || ff.file_docx_name;
                        const isPdf    = !!ff.file_pdf_path;
                        return (
                          <div key={ff.id} className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor:'var(--c-border)', background: ri % 2 === 0 ? 'transparent' : 'var(--c-hover)' }}>
                            <span className="font-mono text-sm text-ink w-16">{ff.rs_code}</span>
                            {filePath ? (
                              <a href={filePath} target="_blank" rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md"
                                style={isPdf ? { background:'rgba(239,68,68,0.08)', color:'#DC2626' } : { background:'rgba(59,130,246,0.08)', color:'#2563EB' }}>
                                <Download size={11} /> {fileName}
                              </a>
                            ) : <span className="text-xs text-ink-faint">—</span>}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'history' && (
            <div className="rounded-xl border overflow-hidden" style={{ background:'var(--c-card)', borderColor:'var(--c-border)' }}>
              {!f.history?.length ? (
                <div className="py-16 text-center text-sm text-ink-faint">Belum ada riwayat</div>
              ) : (
                <div className="px-5 py-4">
                  {f.history.map((h, i) => {
                    const isLast    = i === f.history.length - 1;
                    const isReject  = h.action === 'Reject';
                    const isCurrent = isLast && f.status !== 'Released';
                    const dot = isReject ? { bg:'#EF4444', border:'#EF4444', text:'#fff', icon:'✗' }
                      : isCurrent ? { bg:'#F59E0B', border:'#F59E0B', text:'#fff', icon:'●' }
                      : { bg:'#22C55E', border:'#22C55E', text:'#fff', icon:'✓' };
                    const ACTION_LABEL = { Submit:'Pengajuan dikirim', Approve:'Disetujui', Reject:'Ditolak', Replace_File:'File diganti', Submit_Design:'Design disubmit', Release:'Formulir dirilis' };
                    return (
                      <div key={h.id} className="flex gap-4">
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mt-0.5"
                            style={{ background: dot.bg, border:`2px solid ${dot.border}`, color: dot.text }}>{dot.icon}</div>
                          {!isLast && <div className="w-0.5 flex-1 my-1" style={{ background:'var(--c-border)', minHeight:'24px' }} />}
                        </div>
                        <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-5'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm text-ink">{h.actor_nama}</p>
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 inline-block"
                                style={isReject ? { background:'rgba(239,68,68,0.1)', color:'#EF4444' } : isCurrent ? { background:'rgba(245,158,11,0.1)', color:'#D97706' } : { background:'rgba(34,197,94,0.1)', color:'#16A34A' }}>
                                {ACTION_LABEL[h.action] || h.action}
                              </span>
                            </div>
                            <span className="text-xs text-ink-faint flex-shrink-0 mt-1">{fmt(h.created_at)}</span>
                          </div>
                          {h.comment && <div className="mt-2 px-3 py-2 rounded-lg text-xs text-ink-muted" style={{ background:'var(--c-hover)', borderLeft:'3px solid #015c80' }}>{h.comment}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4">

          {/* File Final */}
          <div className="space-y-4">
          <div className="flex items-center px-4 border rounded-xl" style={{ borderColor:'var(--c-border)', background:'var(--c-hover)', height:'44px' }}>
            <p className="text-xs font-semibold text-ink-faint uppercase tracking-wide">File Final</p>
          </div>
          <div className="rounded-xl border overflow-hidden" style={{ background:'var(--c-card)', borderColor:'var(--c-border)' }}>
            {['PHG','PEVH','PHBP','PHBW','PHPC','PHRA','PHSW'].map(code => {
              const ff       = f.files?.find(x => x.rs_code === code);
              const filePath = ff?.file_pdf_path || ff?.file_docx_path;
              const fileName = ff?.file_pdf_name || ff?.file_docx_name;
              const isPdf    = !!ff?.file_pdf_path;
              return (
                <div key={code} className="flex items-center justify-between px-4 border-b last:border-0" style={{ borderColor:'var(--c-border)', height:'44px' }}>
                  <span className="font-mono text-xs text-ink">{code}</span>
                  {filePath ? (
                    <a href={filePath} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded"
                      style={isPdf ? { background:'rgba(239,68,68,0.08)', color:'#DC2626' } : { background:'rgba(59,130,246,0.08)', color:'#2563EB' }}>
                      <Download size={10} /> {fileName?.split('.').pop().toUpperCase()}
                    </a>
                  ) : <span className="text-xs text-ink-faint">—</span>}
                </div>
              );
            })}
          </div>
          </div>

          {/* Tindakan */}
          {(canApprove || canReject || canDesign || canResubmit) && (
            <div className="rounded-xl border p-4 space-y-3" style={{ background:'var(--c-card)', borderColor:'var(--c-border)' }}>
              <p className="text-xs font-semibold text-ink-faint uppercase tracking-wide">Tindakan</p>

              {canApprove && (
                <button onClick={() => setApproveModal(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 cursor-pointer transition-all"
                  style={{ background:'#16A34A' }}
                  onMouseEnter={e => e.currentTarget.style.background='#15803D'}
                  onMouseLeave={e => e.currentTarget.style.background='#16A34A'}>
                  <CheckCircle size={15} /> Approve
                </button>
              )}
              {canReject && (
                <button onClick={() => setRejectModal(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 cursor-pointer transition-all"
                  style={{ background:'#DC2626' }}
                  onMouseEnter={e => e.currentTarget.style.background='#B91C1C'}
                  onMouseLeave={e => e.currentTarget.style.background='#DC2626'}>
                  <XCircle size={15} /> Reject
                </button>
              )}
              {canDesign && (
                <button onClick={() => navigate(`/formulir/${id}/design`)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 cursor-pointer transition-all"
                  style={{ background:'#8B5CF6' }}
                  onMouseEnter={e => e.currentTarget.style.background='#7C3AED'}
                  onMouseLeave={e => e.currentTarget.style.background='#8B5CF6'}>
                  <Palette size={15} /> Upload File Design
                </button>
              )}

              {/* Resubmit form */}
              {canResubmit && (
                <div className="space-y-2 pt-2 border-t" style={{ borderColor:'var(--c-border)' }}>
                  <p className="text-xs text-ink-faint">Ajukan ulang dengan file baru:</p>
                  <form onSubmit={doResubmit} className="space-y-2">
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-all"
                      style={{ borderColor:'var(--c-border)', background:'var(--c-hover)' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor='#015c80'}
                      onMouseLeave={e => e.currentTarget.style.borderColor='var(--c-border)'}>
                      <UploadCloud size={14} className="text-ink-faint flex-shrink-0" />
                      <span className="text-ink-muted truncate">{resubFile ? resubFile.name : 'Pilih file baru...'}</span>
                      <input type="file" accept=".pdf,.doc,.docx" className="hidden"
                        onChange={e => { if(e.target.files[0]) setResubFile(e.target.files[0]); }} />
                    </label>
                    <input value={resubNote} onChange={e => setResubNote(e.target.value)}
                      placeholder="Catatan (opsional)" className="input-field w-full text-xs" />
                    <button type="submit" disabled={!resubFile || resubbing}
                      className="w-full py-2 rounded-xl text-sm font-semibold text-white cursor-pointer transition-all"
                      style={{ background: resubFile ? '#015c80' : '#9CA3AF' }}>
                      {resubbing ? 'Mengirim...' : 'Kirim Ulang'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Approve modal */}
      <Modal open={approveModal} onClose={() => setApproveModal(false)} title="Konfirmasi Approve" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">Yakin ingin meng-approve formulir <strong className="text-ink">{f.nama_formulir}</strong>?</p>
          <p className="text-xs text-ink-faint">Formulir akan diteruskan ke step berikutnya.</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setApproveModal(false)} className="btn-secondary">Batal</button>
            <button onClick={doApprove} disabled={approving}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
              style={{ background:'#16A34A' }}>
              {approving ? 'Memproses...' : 'Ya, Approve'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject modal */}
      <Modal open={rejectModal} onClose={() => setRejectModal(false)} title="Reject Formulir" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">Berikan alasan penolakan untuk formulir ini:</p>
          <textarea
            value={rejectComment}
            onChange={e => setRejectComment(e.target.value)}
            placeholder="Tuliskan alasan penolakan (minimal 10 karakter)..."
            rows={4}
            className="input-field w-full resize-none"
          />
          {rejectComment.length > 0 && rejectComment.length < 10 && (
            <p className="text-xs text-red-500">Minimal 10 karakter ({rejectComment.length}/10)</p>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={() => { setRejectModal(false); setRejectComment(''); }} className="btn-secondary">Batal</button>
            <button onClick={doReject} disabled={rejecting || rejectComment.trim().length < 10}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer transition-all"
              style={{ background: rejectComment.trim().length >= 10 ? '#DC2626' : '#9CA3AF' }}>
              {rejecting ? 'Memproses...' : 'Reject'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

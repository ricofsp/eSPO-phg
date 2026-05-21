import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, CheckCircle, XCircle, UploadCloud, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { spoService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/ui/Modal';
import { StatusBadge } from './spoUtils.jsx';

const STEPS = [
  { key: 'Submit',     label: 'Submit RS' },
  { key: 'Kadiv_RS',  label: 'Kadiv RS' },
  { key: 'Dir_RS',    label: 'Dir RS' },
  { key: 'Kadiv_Corp',label: 'Kadiv Corp' },
  { key: 'Mutu_Corp', label: 'Mutu Corp' },
  { key: 'CEO',       label: 'CEO' },
  { key: 'Release',   label: 'Released' },
];

function pad(n) { return String(n).padStart(2, '0'); }
function fmt(str) {
  if (!str) return '-';
  const d = new Date(str);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtShort(str) {
  if (!str) return '';
  const d = new Date(str);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

const ACTION_LABEL = {
  Submit: 'Pengajuan dikirim', Approve: 'Disetujui', Reject: 'Ditolak',
  Replace_File: 'File diganti', Release: 'Dirilis',
};

export default function DetailSpoPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [spo, setSpo]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('info');

  const [approveModal, setApproveModal] = useState(false);
  const [approving, setApproving]       = useState(false);
  const [rejectModal, setRejectModal]   = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [rejecting, setRejecting]       = useState(false);

  const [resubFile, setResubFile] = useState(null);
  const [resubNote, setResubNote] = useState('');
  const [resubbing, setResubbing] = useState(false);
  const [replaceFile, setReplaceFile] = useState(null);
  const [replaceNote, setReplaceNote] = useState('');
  const [replacing, setReplacing]     = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await spoService.getOne(id);
      setSpo(data);
    } catch { toast.error('Gagal memuat data'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!spo) return <div className="text-center py-20 text-ink-faint">SPO tidak ditemukan</div>;

  const role      = user?.role;
  const stepIdx   = STEPS.findIndex(s => s.key === spo.current_step);
  const isReleased = spo.workflow_status === 'Released';

  // Can approve?
  const myKadivRS   = spo.reviewers?.find(r => r.reviewer_role === 'Kadiv_RS'   && r.user_id === user?.id && r.status === 'Pending');
  const myKadivCorp = spo.reviewers?.find(r => r.reviewer_role === 'Kadiv_Corp' && r.user_id === user?.id && r.status === 'Pending');
  const canApprove = (
    (spo.current_step === 'Kadiv_RS'   && role === 'kadiv'       && !!myKadivRS) ||
    (spo.current_step === 'Dir_RS'     && role === 'direktur_rs') ||
    (spo.current_step === 'Kadiv_Corp' && role === 'kadiv_corp'  && !!myKadivCorp) ||
    (spo.current_step === 'Mutu_Corp'  && role === 'mutu_corp')  ||
    (spo.current_step === 'CEO'        && role === 'ceo')         ||
    role === 'admin'
  );
  const canReject    = canApprove && !isReleased;
  const canResubmit  = spo.workflow_status?.startsWith('Rejected') && spo.created_by === user?.id;
  const canReplace   = (spo.current_step === 'Mutu_Corp' || spo.workflow_status === 'Rejected_By_CEO') && role === 'mutu_corp';

  async function doApprove() {
    setApproving(true);
    try {
      await spoService.approve(id, {});
      toast.success('Berhasil di-approve');
      setApproveModal(false);
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); } finally { setApproving(false); }
  }

  async function doReject() {
    if (rejectComment.trim().length < 10) { toast.error('Komentar minimal 10 karakter'); return; }
    setRejecting(true);
    try {
      await spoService.reject(id, { comment: rejectComment });
      toast.success('Berhasil di-reject');
      setRejectModal(false);
      setRejectComment('');
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); } finally { setRejecting(false); }
  }

  async function doResubmit(e) {
    e.preventDefault();
    if (!resubFile) { toast.error('File wajib diupload'); return; }
    setResubbing(true);
    const fd = new FormData();
    fd.append('file', resubFile);
    if (resubNote) fd.append('note', resubNote);
    try {
      await spoService.resubmit(id, fd);
      toast.success('Pengajuan ulang berhasil dikirim');
      setResubFile(null); setResubNote('');
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); } finally { setResubbing(false); }
  }

  async function doReplace(e) {
    e.preventDefault();
    if (!replaceFile) { toast.error('File wajib diupload'); return; }
    setReplacing(true);
    const fd = new FormData();
    fd.append('file', replaceFile);
    if (replaceNote) fd.append('note', replaceNote);
    try {
      await spoService.replaceFile(id, fd);
      toast.success('File berhasil diganti');
      setReplaceFile(null); setReplaceNote('');
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); } finally { setReplacing(false); }
  }

  const latestFile = spo.versions?.[0];

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(-1)} className="mt-1 text-ink-faint hover:text-ink transition-colors cursor-pointer">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-ink font-display">{spo.judul}</h1>
          <p className="text-sm text-ink-muted mt-0.5">{spo.departemen_nama} · {spo.rs_nama || 'Corp'}</p>
        </div>
        <StatusBadge status={spo.workflow_status} />
      </div>

      {/* Stepper */}
      <div className="rounded-xl border p-5 overflow-x-auto" style={{ background: 'var(--c-card)', borderColor: 'var(--c-border)' }}>
        <div className="flex items-start min-w-max gap-0">
          {STEPS.map((step, i) => {
            const done   = i < stepIdx || isReleased;
            const active = step.key === spo.current_step && !isReleased;
            const isReject = active && spo.workflow_status?.startsWith('Rejected');

            // history for this step
            const histItem = step.key === 'Release'
              ? spo.history?.find(h => h.action === 'Release')
              : spo.history?.find(h => h.step === step.key && ['Approve', 'Release', 'Submit'].includes(h.action));

            // parallel reviewer summary
            const revRole     = step.key === 'Kadiv_RS' ? 'Kadiv_RS' : step.key === 'Kadiv_Corp' ? 'Kadiv_Corp' : null;
            const revs        = revRole ? (spo.reviewers || []).filter(r => r.reviewer_role === revRole) : [];
            const revApproved = revs.filter(r => r.status === 'Approved');

            return (
              <div key={step.key} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    done ? 'bg-green-500 text-white'
                    : active && !isReject ? 'text-white ring-4 ring-[#FED7AA]'
                    : active && isReject ? 'text-white'
                    : 'text-gray-400'
                  } ${active && !isReject ? 'animate-pulse' : ''}`}
                    style={{
                      background: done ? '#22C55E' : active && !isReject ? '#F97316' : active && isReject ? '#EF4444' : 'var(--c-hover)',
                    }}>
                    {done ? '✓' : active && isReject ? '✗' : i + 1}
                  </div>
                  <span className="text-xs font-semibold whitespace-nowrap"
                    style={{ color: done ? '#16A34A' : active ? (isReject ? '#EF4444' : '#F97316') : 'var(--c-text-faint)' }}>
                    {step.label}
                  </span>

                  {/* Saat aktif dan parallel: tampilkan N/M approve */}
                  {revs.length > 0 && active && (
                    <span className="text-2xs whitespace-nowrap" style={{ color: 'var(--c-text-faint)' }}>
                      {revApproved.length}/{revs.length} approve
                    </span>
                  )}

                  {/* Saat done dan parallel: tampilkan semua nama yang approve */}
                  {revs.length > 0 && done && revApproved.length > 0 && (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-2xs text-ink-faint whitespace-nowrap">{fmtShort(histItem?.created_at)}</span>
                      {revApproved.map(r => (
                        <span key={r.id} className="text-2xs font-medium whitespace-nowrap" style={{ color: '#16A34A' }}>
                          {r.user_nama}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Step non-parallel yang done: tampilkan 1 nama dari history */}
                  {revs.length === 0 && histItem && (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-2xs text-ink-faint whitespace-nowrap">{fmtShort(histItem.created_at)}</span>
                      {histItem.actor_nama && (
                        <span className="text-2xs font-medium whitespace-nowrap"
                          style={{ color: done ? '#16A34A' : '#F97316' }}>
                          {histItem.actor_nama}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-16 h-0.5 mx-2 mb-7"
                    style={{ background: (i < stepIdx || isReleased) ? '#22C55E' : 'var(--c-border)' }} />
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
          <div className="flex gap-1 p-1 rounded-xl border" style={{ background: 'var(--c-hover)', borderColor: 'var(--c-border)' }}>
            {[['info', 'Info'], ['versi', 'Versi File'], ['history', 'Riwayat']].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
                style={tab === k
                  ? { background: '#F97316', color: '#fff', boxShadow: '0 2px 8px rgba(249,115,22,0.3)' }
                  : { color: 'var(--c-text-muted)' }}>
                {l}
              </button>
            ))}
          </div>

          {/* Info */}
          {tab === 'info' && (
            <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--c-card)', borderColor: 'var(--c-border)' }}>
              {[
                ['Judul SPO',     spo.judul],
                ['Nomor Dokumen', spo.nomor_dokumen],
                ['Departemen',    spo.departemen_nama],
                ['RS Pengaju',    spo.rs_nama || 'Corp'],
                ['Diajukan oleh', spo.created_by_nama],
                ['Tgl Pengajuan', fmt(spo.submitted_at || spo.created_at)],
                ['Status',        <StatusBadge status={spo.workflow_status} />],
                ['Tgl Release',   spo.released_at ? fmt(spo.released_at) : <span className="text-ink-faint">—</span>],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center gap-4 px-5 border-b last:border-0"
                  style={{ borderColor: 'var(--c-border)', height: '44px' }}>
                  <span className="text-xs text-ink-faint w-36 flex-shrink-0">{k}</span>
                  <span className="text-sm text-ink">{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* Versi File */}
          {tab === 'versi' && (
            <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--c-card)', borderColor: 'var(--c-border)' }}>
              {!spo.versions?.length ? (
                <div className="py-16 text-center text-sm text-ink-faint">Belum ada file</div>
              ) : spo.versions.map(v => (
                <div key={v.id} className="flex items-center justify-between px-5 py-4 border-b last:border-0"
                  style={{ borderColor: 'var(--c-border)' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-2 py-1 rounded-full"
                      style={{ background: 'rgba(249,115,22,0.1)', color: '#F97316' }}>
                      v{v.version}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-ink">{v.file_name}</p>
                      <p className="text-xs text-ink-faint">{v.uploader_nama} · {fmt(v.created_at)} · {v.uploaded_role}</p>
                    </div>
                  </div>
                  <a href={v.file_path} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                    style={{ background: 'rgba(249,115,22,0.08)', color: '#F97316' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(249,115,22,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(249,115,22,0.08)'}>
                    <Download size={11} /> Unduh
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Riwayat */}
          {tab === 'history' && (
            <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--c-card)', borderColor: 'var(--c-border)' }}>
              {!spo.history?.length ? (
                <div className="py-16 text-center text-sm text-ink-faint">Belum ada riwayat</div>
              ) : (
                <div className="px-5 py-4">
                  {spo.history.map((h, i) => {
                    const isLast   = i === spo.history.length - 1;
                    const isReject = h.action === 'Reject';
                    // Orange hanya untuk Submit terakhir (menunggu review), bukan saat sudah Approve
                    const isCurr   = isLast && !isReleased && !['Approve', 'Release'].includes(h.action);
                    const dot = isReject ? { bg: '#EF4444', icon: '✗' }
                      : isCurr ? { bg: '#F59E0B', icon: '●' }
                      : { bg: '#22C55E', icon: '✓' };
                    return (
                      <div key={i} className="flex gap-4">
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mt-0.5 text-white"
                            style={{ background: dot.bg }}>
                            {dot.icon}
                          </div>
                          {!isLast && <div className="w-0.5 flex-1 my-1" style={{ background: 'var(--c-border)', minHeight: '24px' }} />}
                        </div>
                        <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-5'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm text-ink">{h.actor_nama}</p>
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 inline-block"
                                style={isReject
                                  ? { background: 'rgba(239,68,68,0.1)', color: '#EF4444' }
                                  : isCurr
                                    ? { background: 'rgba(245,158,11,0.1)', color: '#D97706' }
                                    : { background: 'rgba(34,197,94,0.1)', color: '#16A34A' }}>
                                {ACTION_LABEL[h.action] || h.action}
                              </span>
                              <span className="ml-2 text-xs text-ink-faint">{h.step?.replace('_', ' ')}</span>
                            </div>
                            <span className="text-xs text-ink-faint flex-shrink-0 mt-1">{fmt(h.created_at)}</span>
                          </div>
                          {h.comment && (
                            <div className="mt-2 px-3 py-2 rounded-lg text-xs text-ink-muted"
                              style={{ background: 'var(--c-hover)', borderLeft: '3px solid #F97316' }}>
                              {h.comment}
                            </div>
                          )}
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

          {/* File Terkini */}
          <div className="space-y-4">
            <div className="flex items-center px-4 border rounded-xl"
              style={{ borderColor: 'var(--c-border)', background: 'var(--c-hover)', height: '44px' }}>
              <p className="text-xs font-semibold text-ink-faint uppercase tracking-wide">File Terkini</p>
            </div>
            <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--c-card)', borderColor: 'var(--c-border)' }}>
              {latestFile ? (
                <div className="px-4 py-3 flex items-center gap-3">
                  <FileText size={16} style={{ color: '#F97316', flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-ink truncate">{latestFile.file_name}</p>
                    <p className="text-xs text-ink-faint">v{latestFile.version} · {latestFile.uploader_nama}</p>
                  </div>
                  <a href={latestFile.file_path} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-xs px-2 py-1"
                    style={{ background: 'rgba(249,115,22,0.08)', color: '#F97316' }}>
                    <Download size={10} /> Unduh
                  </a>
                </div>
              ) : (
                <div className="px-4 py-4 text-xs text-center text-ink-faint">Belum ada file</div>
              )}
              {/* Release scope */}
              {spo.scope?.length > 0 && (
                <div className="border-t px-4 py-3" style={{ borderColor: 'var(--c-border)' }}>
                  <p className="text-xs font-semibold text-ink-faint mb-1.5">RS Tujuan ({spo.scope.length})</p>
                  {spo.scope.map(s => (
                    <div key={s.id} className="flex items-center gap-1.5 text-xs text-ink-muted mb-0.5">
                      <CheckCircle size={10} style={{ color: '#22C55E' }} />
                      {s.rs_nama} {s.singkatan ? `(${s.singkatan})` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tindakan */}
          {(canApprove || canReject || canResubmit || canReplace) && (
            <div className="rounded-xl border p-4 space-y-3" style={{ background: 'var(--c-card)', borderColor: 'var(--c-border)' }}>
              <p className="text-xs font-semibold text-ink-faint uppercase tracking-wide">Tindakan</p>

              {canApprove && (
                <button onClick={() => setApproveModal(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 cursor-pointer transition-all"
                  style={{ background: '#16A34A' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#15803D'}
                  onMouseLeave={e => e.currentTarget.style.background = '#16A34A'}>
                  <CheckCircle size={15} /> Approve
                </button>
              )}

              {canReject && (
                <button onClick={() => setRejectModal(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 cursor-pointer transition-all"
                  style={{ background: '#DC2626' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#B91C1C'}
                  onMouseLeave={e => e.currentTarget.style.background = '#DC2626'}>
                  <XCircle size={15} /> Reject
                </button>
              )}

              {canReplace && (
                <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--c-border)' }}>
                  <p className="text-xs text-ink-faint">Ganti file SPO:</p>
                  <form onSubmit={doReplace} className="space-y-2">
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-all"
                      style={{ borderColor: 'var(--c-border)', background: 'var(--c-hover)' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#F97316'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--c-border)'}>
                      <UploadCloud size={14} className="text-ink-faint flex-shrink-0" />
                      <span className="text-ink-muted truncate">{replaceFile ? replaceFile.name : 'Pilih file baru...'}</span>
                      <input type="file" accept=".pdf,.doc,.docx" className="hidden"
                        onChange={e => { if (e.target.files[0]) setReplaceFile(e.target.files[0]); }} />
                    </label>
                    <input value={replaceNote} onChange={e => setReplaceNote(e.target.value)}
                      placeholder="Catatan (opsional)" className="input-field w-full text-xs" />
                    <button type="submit" disabled={!replaceFile || replacing}
                      className="w-full py-2 rounded-xl text-sm font-semibold text-white cursor-pointer transition-all"
                      style={{ background: replaceFile ? '#F97316' : '#9CA3AF' }}>
                      {replacing ? 'Mengganti...' : 'Ganti File'}
                    </button>
                  </form>
                </div>
              )}

              {canResubmit && (
                <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--c-border)' }}>
                  <p className="text-xs text-ink-faint">Ajukan ulang dengan file baru:</p>
                  <form onSubmit={doResubmit} className="space-y-2">
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-all"
                      style={{ borderColor: 'var(--c-border)', background: 'var(--c-hover)' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#F97316'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--c-border)'}>
                      <UploadCloud size={14} className="text-ink-faint flex-shrink-0" />
                      <span className="text-ink-muted truncate">{resubFile ? resubFile.name : 'Pilih file baru...'}</span>
                      <input type="file" accept=".pdf,.doc,.docx" className="hidden"
                        onChange={e => { if (e.target.files[0]) setResubFile(e.target.files[0]); }} />
                    </label>
                    <input value={resubNote} onChange={e => setResubNote(e.target.value)}
                      placeholder="Catatan (opsional)" className="input-field w-full text-xs" />
                    <button type="submit" disabled={!resubFile || resubbing}
                      className="w-full py-2 rounded-xl text-sm font-semibold text-white cursor-pointer transition-all"
                      style={{ background: resubFile ? '#F97316' : '#9CA3AF' }}>
                      {resubbing ? 'Mengirim...' : 'Kirim Ulang'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Approve Modal */}
      <Modal open={approveModal} onClose={() => setApproveModal(false)} title="Konfirmasi Approve" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            Yakin ingin meng-approve SPO <strong className="text-ink">{spo.judul}</strong>?
          </p>
          <p className="text-xs text-ink-faint">SPO akan diteruskan ke step berikutnya.</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setApproveModal(false)} className="btn-secondary">Batal</button>
            <button onClick={doApprove} disabled={approving}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
              style={{ background: '#16A34A' }}>
              {approving ? 'Memproses...' : 'Ya, Approve'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal open={rejectModal} onClose={() => { setRejectModal(false); setRejectComment(''); }} title="Reject SPO" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">Berikan alasan penolakan untuk SPO ini:</p>
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

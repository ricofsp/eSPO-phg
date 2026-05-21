export const STATUS_LABELS = {
  Pending_Kadiv_RS:    'Menunggu Kadiv RS',
  Pending_Dir_RS:      'Menunggu Direktur RS',
  Pending_Kadiv_Corp:  'Menunggu Kadiv Corp',
  Pending_Mutu_Corp:   'Menunggu Mutu Corp',
  Pending_CEO:         'Menunggu CEO',
  Approved_CEO:        'Disetujui CEO',
  Released:            'Released',
  Rejected_By_Kadiv_RS:   'Ditolak Kadiv RS',
  Rejected_By_Dir_RS:     'Ditolak Dir RS',
  Rejected_By_Kadiv_Corp: 'Ditolak Kadiv Corp',
  Rejected_By_Mutu_Corp:  'Ditolak Mutu Corp',
  Rejected_By_CEO:        'Dikembalikan CEO',
};

export const STATUS_COLOR = {
  Pending_Kadiv_RS:    { bg: 'rgba(217,119,6,0.1)',    color: '#D97706', border: 'rgba(217,119,6,0.25)' },
  Pending_Dir_RS:      { bg: 'rgba(217,119,6,0.1)',    color: '#D97706', border: 'rgba(217,119,6,0.25)' },
  Pending_Kadiv_Corp:  { bg: 'rgba(217,119,6,0.1)',    color: '#D97706', border: 'rgba(217,119,6,0.25)' },
  Pending_Mutu_Corp:   { bg: 'rgba(59,130,246,0.1)',   color: '#3B82F6', border: 'rgba(59,130,246,0.25)' },
  Pending_CEO:         { bg: 'rgba(139,92,246,0.1)',   color: '#8B5CF6', border: 'rgba(139,92,246,0.25)' },
  Approved_CEO:        { bg: 'rgba(34,197,94,0.1)',    color: '#22C55E', border: 'rgba(34,197,94,0.25)' },
  Released:            { bg: 'rgba(22,163,74,0.1)',    color: '#16A34A', border: 'rgba(22,163,74,0.25)' },
  Rejected_By_Kadiv_RS:   { bg: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'rgba(239,68,68,0.25)' },
  Rejected_By_Dir_RS:     { bg: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'rgba(239,68,68,0.25)' },
  Rejected_By_Kadiv_Corp: { bg: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'rgba(239,68,68,0.25)' },
  Rejected_By_Mutu_Corp:  { bg: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'rgba(239,68,68,0.25)' },
  Rejected_By_CEO:        { bg: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'rgba(239,68,68,0.25)' },
};

export function StatusBadge({ status }) {
  const label = STATUS_LABELS[status] || status;
  const col   = STATUS_COLOR[status]  || { bg: 'rgba(100,116,139,0.1)', color: '#64748B', border: 'rgba(100,116,139,0.25)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', fontSize: 11, fontWeight: 600,
      background: col.bg, color: col.color,
      border: `1px solid ${col.border}`,
    }}>
      {label}
    </span>
  );
}

export const STEPS = [
  { key: 'Submit',     label: 'Submit RS' },
  { key: 'Kadiv_RS',  label: 'Kadiv RS' },
  { key: 'Dir_RS',    label: 'Dir RS' },
  { key: 'Kadiv_Corp',label: 'Kadiv Corp' },
  { key: 'Mutu_Corp', label: 'Mutu Corp' },
  { key: 'CEO',       label: 'CEO' },
  { key: 'Release',   label: 'Release' },
];

export function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
}

export function fmtDateTime(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

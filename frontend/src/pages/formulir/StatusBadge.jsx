import { Clock, CheckCircle, XCircle, Palette, Send, AlertCircle } from 'lucide-react';

const CONFIG = {
  Submitted:             { label: 'Submitted',         color: '#3B82F6', bg: 'rgba(59,130,246,0.10)', Icon: Send },
  Pending_Mutu_RS:       { label: 'Pending Mutu RS',   color: '#D97706', bg: 'rgba(217,119,6,0.10)',  Icon: Clock },
  Pending_Mutu_Corp:     { label: 'Pending Mutu Corp', color: '#D97706', bg: 'rgba(217,119,6,0.10)',  Icon: Clock },
  In_Design:             { label: 'In Design',         color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)', Icon: Palette },
  Released:              { label: 'Released',          color: '#16A34A', bg: 'rgba(22,163,74,0.10)',  Icon: CheckCircle },
  Rejected_By_Mutu_RS:   { label: 'Ditolak Mutu RS',   color: '#DC2626', bg: 'rgba(220,38,38,0.10)',  Icon: XCircle },
  Rejected_By_Mutu_Corp: { label: 'Ditolak Mutu Corp', color: '#DC2626', bg: 'rgba(220,38,38,0.10)',  Icon: XCircle },
};

export default function StatusBadge({ status, size = 'sm' }) {
  const cfg = CONFIG[status] || { label: status, color: '#6B7280', bg: 'rgba(107,114,128,0.10)', Icon: AlertCircle };
  const { Icon } = cfg;
  const px = size === 'sm' ? '6px' : '10px';
  const py = size === 'sm' ? '3px' : '5px';
  const fs = size === 'sm' ? '11px' : '13px';
  const iconSize = size === 'sm' ? 10 : 13;
  return (
    <span className="inline-flex items-center gap-1 font-medium rounded-full whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color, padding: `${py} ${px}`, fontSize: fs }}>
      <Icon size={iconSize} />
      {cfg.label}
    </span>
  );
}

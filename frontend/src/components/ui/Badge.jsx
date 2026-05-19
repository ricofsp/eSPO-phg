const STATUS_MAP = {
  Aktif:   { cls: 'badge-aktif',   dot: 'bg-green-400'  },
  Pending: { cls: 'badge-pending', dot: 'bg-yellow-400' },
  Arsip:   { cls: 'badge-arsip',   dot: 'bg-gray-400'   },
};

export default function Badge({ status }) {
  const cfg = STATUS_MAP[status] || STATUS_MAP.Arsip;
  return (
    <span className={cfg.cls}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
}

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { FileText, TrendingUp, Clock, Archive, Calendar, Download, MoreHorizontal, HelpCircle } from 'lucide-react';
import Badge from '../components/ui/Badge';

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Mock data
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const MONTHLY = [
  { month: 'JAN', masuk: 8,  keluar: 5  },
  { month: 'FEB', masuk: 14, keluar: 9  },
  { month: 'MAR', masuk: 10, keluar: 7  },
  { month: 'APR', masuk: 20, keluar: 13 },
  { month: 'MEI', masuk: 17, keluar: 11 },
  { month: 'JUN', masuk: 28, keluar: 18 },
  { month: 'JUL', masuk: 24, keluar: 16 },
  { month: 'AGU', masuk: 33, keluar: 22 },
  { month: 'SEP', masuk: 27, keluar: 19 },
  { month: 'OKT', masuk: 38, keluar: 25 },
  { month: 'NOV', masuk: 34, keluar: 23 },
  { month: 'DES', masuk: 42, keluar: 29 },
];
const WEEKLY = [
  { month: 'Sen', masuk: 5, keluar: 3 },
  { month: 'Sel', masuk: 8, keluar: 5 },
  { month: 'Rab', masuk: 6, keluar: 4 },
  { month: 'Kam', masuk: 9, keluar: 6 },
  { month: 'Jum', masuk: 7, keluar: 4 },
  { month: 'Sab', masuk: 3, keluar: 2 },
  { month: 'Min', masuk: 2, keluar: 1 },
];
const YEARLY = [
  { month: '2020', masuk: 120, keluar: 80  },
  { month: '2021', masuk: 180, keluar: 110 },
  { month: '2022', masuk: 240, keluar: 160 },
  { month: '2023', masuk: 310, keluar: 205 },
  { month: '2024', masuk: 280, keluar: 190 },
  { month: '2025', masuk: 156, keluar: 98  },
];
const DISTRIBUSI = [
  { name: 'Surat Masuk',  value: 42 },
  { name: 'Surat Keluar', value: 35 },
  { name: 'Memo',         value: 18 },
  { name: 'Laporan',      value: 25 },
  { name: 'Proposal',     value: 14 },
  { name: 'Lainnya',      value: 10 },
];
const RECENT = [
  { id: '04910', nomor: 'DOC-2025-041', judul: 'Surat Permohonan Dana',       jenis: 'Surat Masuk',  status: 'Aktif',   tanggal: '12 Mei 2025' },
  { id: '04911', nomor: 'DOC-2025-042', judul: 'Laporan Bulanan April',        jenis: 'Laporan',      status: 'Aktif',   tanggal: '10 Mei 2025' },
  { id: '04912', nomor: 'DOC-2025-043', judul: 'Memo Rapat Koordinasi',        jenis: 'Memo',         status: 'Pending', tanggal: '08 Mei 2025' },
  { id: '04913', nomor: 'DOC-2025-044', judul: 'Proposal Pengembangan Sistem', jenis: 'Proposal',     status: 'Pending', tanggal: '05 Mei 2025' },
  { id: '04914', nomor: 'DOC-2025-040', judul: 'Surat Balasan Kerjasama',      jenis: 'Surat Keluar', status: 'Arsip',   tanggal: '01 Mei 2025' },
];
const PERIOD = { Mingguan: WEEKLY, Bulanan: MONTHLY, Tahunan: YEARLY };

const SPARK = [3, 5, 4, 7, 5, 9, 7, 10, 9, 12, 10, 14, 12, 15, 16];

function SparkBar({ color }) {
  const max = Math.max(...SPARK);
  const H   = 28;
  const bw  = 3;
  const gap = 1.5;
  const total = SPARK.length * (bw + gap) - gap;
  return (
    <svg width={total} height={H} style={{ display: 'block', flexShrink: 0 }}>
      {SPARK.map((v, i) => {
        const bh = Math.max(2, Math.round((v / max) * H));
        return (
          <rect key={i} x={i * (bw + gap)} y={H - bh} width={bw} height={bh} rx={1}
            fill={color} opacity={0.15 + (i / (SPARK.length - 1)) * 0.45} />
        );
      })}
    </svg>
  );
}

const BLOCK_GAP = 2;
function BlockBar(props) {
  const { x, y, width, height, fill } = props;
  if (!height || height <= 0 || !width || width <= 0) return null;
  const bw        = Math.max(1, width - 2);
  const blockSize = bw;
  const unit      = blockSize + BLOCK_GAP;
  const count     = Math.max(1, Math.floor(height / unit));
  return (
    <g>
      {Array.from({ length: count }).map((_, i) => (
        <rect key={i} x={x + 1} y={y + height - (i + 1) * unit + BLOCK_GAP}
          width={bw} height={blockSize} fill={fill} rx={1} />
      ))}
    </g>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-3 border text-sm"
      style={{ background: 'var(--c-card)', borderColor: 'var(--c-border)', boxShadow: 'var(--shadow-md)' }}>
      <p className="font-semibold text-ink mb-1.5 font-display">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.fill }} />
          <span className="text-ink-muted">{p.dataKey === 'masuk' ? 'Surat Masuk' : p.dataKey === 'keluar' ? 'Surat Keluar' : 'Jumlah'}:</span>
          <span className="font-semibold text-ink">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState('Bulanan');
  const chartData = PERIOD[period];
  const totalTren = chartData.reduce((s, d) => s + d.masuk + d.keluar, 0);

  const STATS = [
    { label: 'Total Dokumen', value: '1,024', sub: '+0.94 bulan lalu', icon: FileText,   color: '#F97316', bg: 'rgba(249,115,22,0.10)'    },
    { label: 'Surat Masuk',   value: '428',   sub: '+0.94 bulan lalu', icon: TrendingUp, color: '#FB923C', bg: 'rgba(249,115,22,0.10)'   },
    { label: 'Pending',       value: '86',    sub: '+0.94 bulan lalu', icon: Clock,      color: '#D97706', bg: 'rgba(217,119,6,0.10)'   },
    { label: 'Diarsipkan',    value: '312',   sub: '+0.94 bulan lalu', icon: Archive,    color: '#64748B', bg: 'rgba(100,116,139,0.10)' },
  ];

  return (
    <div className="space-y-3 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink font-display">Selamat datang, Admin</h1>
          <p className="text-sm text-ink-muted mt-0.5">Ringkasan pengelolaan dokumen SPO rumah sakit</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button className="btn-secondary text-xs gap-1.5 !px-3">
            <Calendar size={13} />
            6 Mei 2025
          </button>
          <button className="btn-primary text-xs gap-1.5 !px-3">
            <Download size={13} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <div key={s.label} className="stat-card !py-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-ink-faint uppercase tracking-widest leading-tight">{s.label}</p>
              <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: s.bg, color: s.color }}>
                <s.icon size={12} />
              </div>
            </div>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-2xl font-bold text-ink font-display leading-none">{s.value}</p>
                <p className="text-xs mt-1.5" style={{ color: s.color }}>▲ {s.sub}</p>
              </div>
              <SparkBar color={s.color} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Tren Dokumen */}
        <div className="lg:col-span-2 rounded-xl border p-5"
          style={{ background: 'var(--c-card)', borderColor: 'var(--c-border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-semibold text-ink-faint uppercase tracking-widest">Tren Dokumen</p>
                <HelpCircle size={12} className="text-ink-faint" />
              </div>
              <div className="flex items-center gap-4">
                <p className="text-2xl font-bold text-ink font-display">{totalTren.toLocaleString()}</p>
                <div className="flex items-center gap-3 text-xs text-ink-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: '#F97316', display: 'inline-block' }} />
                    Surat Masuk
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: '#FED7AA', display: 'inline-block' }} />
                    Surat Keluar
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center rounded-lg p-0.5 text-xs"
              style={{ background: 'var(--c-hover)', border: '1px solid var(--c-border)' }}>
              {Object.keys(PERIOD).map((p) => (
                <button key={p} type="button" onClick={() => setPeriod(p)}
                  className="px-3 py-1.5 rounded-md font-medium transition-all duration-150 cursor-pointer"
                  style={period === p
                    ? { background: 'var(--c-card)', color: 'var(--c-text)', boxShadow: 'var(--shadow-sm)' }
                    : { color: 'var(--c-text-muted)' }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={1} barCategoryGap="4%">
                <CartesianGrid stroke="var(--c-border)" strokeWidth={1} horizontal={true} vertical={true} />
                <XAxis dataKey="month" axisLine={false} tickLine={false}
                  tick={{ fill: 'var(--c-text-faint)', fontSize: 11, fontFamily: 'Inter' }} dy={6} />
                <YAxis axisLine={false} tickLine={false} width={28}
                  tick={{ fill: 'var(--c-text-faint)', fontSize: 11, fontFamily: 'Inter' }} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--c-hover)', radius: 4 }} />
                <Bar dataKey="masuk"  fill="#F97316" shape={<BlockBar />} />
                <Bar dataKey="keluar" fill="#FED7AA" shape={<BlockBar />} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribusi Jenis */}
        <div className="rounded-xl border p-5 flex flex-col"
          style={{ background: 'var(--c-card)', borderColor: 'var(--c-border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-semibold text-ink-faint uppercase tracking-widest">Distribusi Jenis</p>
                <HelpCircle size={12} className="text-ink-faint" />
              </div>
              <p className="text-2xl font-bold text-ink font-display">
                {DISTRIBUSI.reduce((s, d) => s + d.value, 0)}
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-ink-faint">
              <Calendar size={11} />
              <span>Jan – Des</span>
            </div>
          </div>
          <div style={{ flex: 1, height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DISTRIBUSI} barCategoryGap="30%">
                <CartesianGrid stroke="var(--c-border)" strokeWidth={1} horizontal={true} vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false}
                  tick={{ fill: 'var(--c-text-faint)', fontSize: 10, fontFamily: 'Inter' }}
                  dy={6} interval={0} tickFormatter={(v) => v.split(' ')[0]} />
                <YAxis axisLine={false} tickLine={false} width={24}
                  tick={{ fill: 'var(--c-text-faint)', fontSize: 10, fontFamily: 'Inter' }} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--c-hover)', radius: 4 }} />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {DISTRIBUSI.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? '#F97316' : '#FED7AA'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent */}
      <div className="rounded-xl border overflow-hidden"
        style={{ background: 'var(--c-card)', borderColor: 'var(--c-border)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--c-border)' }}>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-ink font-display">Dokumen Terbaru</p>
            <HelpCircle size={13} className="text-ink-faint" />
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: 'var(--c-hover)', color: 'var(--c-text-muted)', border: '1px solid var(--c-border)' }}>
              {RECENT.length} dokumen
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input type="text" placeholder="Cari dokumen..." className="input-field !py-1.5 text-xs w-44" />
            <button className="btn-primary text-xs !px-3 !py-1.5 gap-1">+ Tambah</button>
            <button className="w-7 h-7 flex items-center justify-center rounded-md cursor-pointer text-ink-faint transition-all"
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--c-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}>
              <MoreHorizontal size={14} />
            </button>
          </div>
        </div>
        <table className="w-full" style={{ minWidth: 700 }}>
          <thead>
            <tr style={{ background: 'var(--c-hover)', borderBottom: '1px solid var(--c-border)' }}>
              <th className="table-th w-10"><input type="checkbox" className="rounded cursor-pointer accent-[#F97316]" /></th>
              <th className="table-th">ID</th>
              <th className="table-th">No. Dokumen</th>
              <th className="table-th">Judul</th>
              <th className="table-th">Jenis</th>
              <th className="table-th">Status</th>
              <th className="table-th">Tanggal</th>
              <th className="table-th text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {RECENT.map((doc) => (
              <tr key={doc.id} className="table-row">
                <td className="table-td"><input type="checkbox" className="rounded cursor-pointer accent-[#F97316]" /></td>
                <td className="table-td"><span className="font-mono text-xs text-ink-faint">#{doc.id}</span></td>
                <td className="table-td font-semibold text-ink">{doc.nomor}</td>
                <td className="table-td max-w-[220px]"><span className="block truncate text-ink">{doc.judul}</span></td>
                <td className="table-td">
                  <span className="text-xs rounded-md px-2 py-1 font-medium"
                    style={{ background: 'var(--c-hover)', border: '1px solid var(--c-border)', color: 'var(--c-text-muted)' }}>
                    {doc.jenis}
                  </span>
                </td>
                <td className="table-td"><Badge status={doc.status} /></td>
                <td className="table-td text-ink-muted">{doc.tanggal}</td>
                <td className="table-td text-right">
                  <button className="w-7 h-7 inline-flex items-center justify-center rounded-md cursor-pointer text-ink-faint transition-all"
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--c-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}>
                    <MoreHorizontal size={13} />
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

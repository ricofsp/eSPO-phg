import { useState } from 'react';
import { Send, ClipboardList } from 'lucide-react';
import PengajuanSayaSpoPage  from './spo/PengajuanSayaSpoPage';
import PengajuanSayaPage     from './formulir/PengajuanSayaPage';
import { useAuth } from '../context/AuthContext';

// RS roles yang bisa submit SPO
const SPO_ROLES     = ['user','mutu_rs','kadiv','direktur_rs'];
// Roles yang bisa submit Formulir
const FORMULIR_ROLES = ['user','kadiv'];

export default function PengajuanPage() {
  const { user } = useAuth();
  const canSpo      = SPO_ROLES.includes(user?.role) || user?.role === 'admin';
  const canFormulir = FORMULIR_ROLES.includes(user?.role) || user?.role === 'admin';

  const defaultTab  = canSpo ? 'spo' : 'formulir';
  const [tab, setTab] = useState(defaultTab);

  const tabs = [
    canSpo      && { key: 'spo',      label: 'SPO',      icon: Send },
    canFormulir && { key: 'formulir', label: 'Formulir', icon: ClipboardList },
  ].filter(Boolean);

  if (tabs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm" style={{ color: 'var(--c-text-faint)' }}>
          Anda tidak memiliki akses untuk melakukan pengajuan.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Tab selector — tarik ke atas sejajar dengan padding layout */}
      {tabs.length > 1 && (
        <div className="flex gap-0" style={{ borderBottom: '2px solid var(--c-border)', marginBottom: 12, marginTop: 8 }}>
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all cursor-pointer"
              style={{
                color:       tab === t.key ? '#015c80' : 'var(--c-text-muted)',
                borderBottom: tab === t.key ? '2px solid #015c80' : '2px solid transparent',
                marginBottom: -2,
                background:  'none',
              }}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab content — both mount, hidden saat tidak aktif agar tidak re-load */}
      {canSpo && (
        <div style={{ display: tab === 'spo' ? 'block' : 'none' }}>
          <PengajuanSayaSpoPage />
        </div>
      )}
      {canFormulir && (
        <div style={{ display: tab === 'formulir' ? 'block' : 'none' }}>
          <PengajuanSayaPage />
        </div>
      )}
    </div>
  );
}

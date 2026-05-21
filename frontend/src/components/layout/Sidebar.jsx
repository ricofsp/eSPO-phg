import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Building2, GitBranch,
  Users, Settings, HelpCircle, ChevronLeft, ChevronRight,
  Hospital, ClipboardList, PlusSquare, ListChecks, CheckSquare,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const MENU_ALL = [
  {
    label: 'Menu Utama',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
      { icon: FileText,        label: 'SPO',        path: '/documents' },
    ],
  },
  {
    label: 'Formulir',
    items: [
      { icon: ClipboardList, label: 'Daftar Formulir',  path: '/formulir',                exact: true },
      { icon: ListChecks,    label: 'Pengajuan',        path: '/formulir/pengajuan-saya', roles: ['user','kadiv'] },
      { icon: CheckSquare,   label: 'Review & Approval',path: '/formulir/review',         roles: ['mutu_rs','mutu_corp','design_corp','admin'] },
    ],
  },
  {
    label: 'Master Data',
    adminOnly: true,
    items: [
      { icon: Hospital,   label: 'Rumah Sakit', path: '/hospitals' },
      { icon: GitBranch,  label: 'Divisi',      path: '/divisions' },
    ],
  },
  {
    label: 'Pengguna',
    adminOnly: true,
    items: [
      { icon: Users, label: 'Daftar Pengguna', path: '/users' },
    ],
  },
  {
    label: 'Pengaturan',
    items: [
      { icon: Settings,   label: 'Sistem',  path: '/settings', disabled: true },
      { icon: HelpCircle, label: 'Bantuan', path: '/help',     disabled: true },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle }) {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { user }   = useAuth();
  const isAdmin    = user?.role === 'admin';
  const userRole   = user?.role;

  const MENU = MENU_ALL
    .filter((s) => !s.adminOnly || isAdmin)
    .map((s) => ({
      ...s,
      items: s.items.filter((item) => !item.roles || item.roles.includes(userRole) || isAdmin),
    }))
    .filter((s) => s.items.length > 0);

  return (
    <aside
      className="flex flex-col select-none overflow-hidden"
      style={{
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        width: collapsed ? 64 : 220,
        transition: 'width 0.25s ease',
        background: 'var(--c-surface)',
        borderRight: '1px solid var(--c-border)',
        zIndex: 30,
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center flex-shrink-0"
        style={{ height: 56, padding: '0 14px', borderBottom: '1px solid var(--c-border)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #FB923C, #F97316)' }}
        >
          <FileText size={15} className="text-white" />
        </div>
        <div
          className="ml-3 overflow-hidden"
          style={{
            opacity: collapsed ? 0 : 1,
            maxWidth: collapsed ? 0 : 200,
            transition: 'opacity 0.2s ease, max-width 0.25s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <p className="text-2xs font-medium text-ink-faint leading-none mb-0.5 uppercase tracking-widest">Sistem</p>
          <p className="text-sm font-bold text-ink leading-none font-display">SPO Digital</p>
        </div>
      </div>

      {/* Toggle button */}
      <button
        type="button"
        onClick={onToggle}
        title={collapsed ? 'Perluas sidebar' : 'Perkecil sidebar'}
        className="absolute flex items-center justify-center transition-all duration-150 cursor-pointer z-10"
        style={{
          width: 22, height: 22, borderRadius: '50%',
          top: 17, right: -11,
          background: 'var(--c-card)',
          border: '1px solid var(--c-border)',
          color: 'var(--c-text-faint)',
          boxShadow: 'var(--shadow-sm)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#F97316'; e.currentTarget.style.borderColor = '#F97316'; e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--c-card)'; e.currentTarget.style.borderColor = 'var(--c-border)'; e.currentTarget.style.color = 'var(--c-text-faint)'; }}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-4">
        {MENU.map((section) => (
          <div key={section.label}>
            <div
              style={{
                maxHeight: collapsed ? 0 : 20,
                opacity: collapsed ? 0 : 1,
                overflow: 'hidden',
                transition: 'max-height 0.2s ease, opacity 0.15s ease',
                marginBottom: collapsed ? 0 : 6,
              }}
            >
              <p className="text-2xs font-semibold text-ink-faint uppercase tracking-widest px-2">
                {section.label}
              </p>
            </div>

            <ul className="space-y-0.5">
              {section.items.map((item) => {
                // Cek apakah sedang di halaman detail formulir (/formulir/<uuid>)
                const isFormulirDetail = /^\/formulir\/[0-9a-f-]{30,}/.test(location.pathname);
                const isReviewRole = ['mutu_rs','mutu_corp','design_corp','admin'].includes(userRole);

                const isActive = item.path && (
                  item.exact
                    ? location.pathname === item.path
                    : location.pathname.startsWith(item.path) && item.path !== '/'
                ) || (
                  isFormulirDetail && (
                    (item.path === '/formulir/pengajuan-saya' && !isReviewRole) ||
                    (item.path === '/formulir/review' && isReviewRole)
                  )
                );
                return (
                  <li key={item.label}>
                    <button
                      type="button"
                      title={collapsed ? item.label : undefined}
                      onClick={() => !item.disabled && item.path && navigate(item.path)}
                      className={`sidebar-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`}
                      style={{
                        minHeight: 36,
                        opacity: item.disabled ? 0.4 : 1,
                        cursor: item.disabled ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <item.icon size={16} className="flex-shrink-0" />
                      <span
                        className="text-sm overflow-hidden whitespace-nowrap"
                        style={{
                          maxWidth: collapsed ? 0 : 160,
                          opacity: collapsed ? 0 : 1,
                          transition: 'max-width 0.25s ease, opacity 0.15s ease',
                        }}
                      >
                        {item.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User info at bottom */}
      <div
        className="flex-shrink-0 overflow-hidden"
        style={{ borderTop: '1px solid var(--c-border)', padding: '10px 12px' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #F97316, #EA6B0C)' }}
          >
            {user?.nama?.[0]?.toUpperCase() || 'U'}
          </div>
          <div
            className="overflow-hidden"
            style={{
              opacity: collapsed ? 0 : 1,
              maxWidth: collapsed ? 0 : 160,
              transition: 'opacity 0.2s ease, max-width 0.25s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <p className="text-xs font-semibold text-ink truncate">{user?.nama}</p>
            <p className="text-2xs text-ink-faint capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

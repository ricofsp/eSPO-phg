import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, GitBranch,
  Users, Settings, HelpCircle, ChevronLeft, ChevronRight,
  Hospital, ClipboardList, ListChecks, CheckSquare,
  Send, FolderOpen, Inbox,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const RS_ROLES        = ['user','mutu_rs','kadiv','direktur_rs'];
const REVIEW_ROLES    = ['kadiv','direktur_rs','kadiv_corp','mutu_corp','ceo','admin'];
const FORMULIR_REVIEW = ['mutu_rs','mutu_corp','design_corp','admin'];

const MENU_ALL = [
  {
    label: 'Menu Utama',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
      { icon: FileText,        label: 'SPO',        path: '/documents' },
      { icon: ClipboardList,   label: 'Formulir',   path: '/formulir', exact: true },
    ],
  },
  {
    label: 'Pengajuan',
    items: [
      { icon: Send, label: 'Pengajuan', path: '/pengajuan', roles: RS_ROLES },
    ],
  },
  {
    label: 'Persetujuan',
    items: [
      { icon: CheckSquare, label: 'Review SPO',      path: '/spo/review',        roles: REVIEW_ROLES },
      { icon: ListChecks,  label: 'Review Formulir', path: '/formulir/review',   roles: FORMULIR_REVIEW },
      { icon: Inbox,       label: 'Rilis SPO',       path: '/spo/release-queue', roles: ['mutu_corp','admin'] },
    ],
  },
  {
    label: 'Referensi',
    items: [
      { icon: FolderOpen, label: 'Template SPO', path: '/spo/template' },
    ],
  },
  {
    label: 'Master Data',
    adminOnly: true,
    items: [
      { icon: Hospital,  label: 'Rumah Sakit', path: '/hospitals' },
      { icon: GitBranch, label: 'Divisi',      path: '/divisions' },
      { icon: Users,     label: 'Users',       path: '/users' },
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
        boxShadow: '4px 0 20px rgba(15,23,42,0.08), 1px 0 4px rgba(15,23,42,0.05)',
        zIndex: 30,
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center flex-shrink-0"
        style={{
          height: 56, padding: '0 14px',
          borderBottom: '1px solid var(--c-border)',
          background: 'linear-gradient(135deg, rgba(1,92,128,0.06) 0%, transparent 100%)',
        }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #2a7fa0, #015c80)' }}
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
        onMouseEnter={(e) => { e.currentTarget.style.background = '#015c80'; e.currentTarget.style.borderColor = '#015c80'; e.currentTarget.style.color = '#fff'; }}
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
                const isFormulirDetail = /^\/formulir\/[0-9a-f-]{30,}/.test(location.pathname);
                const isFormulirReview = FORMULIR_REVIEW.includes(userRole);
                const isSpoDetail      = /^\/spo\/[0-9]+$/.test(location.pathname);
                const isSpoReview      = REVIEW_ROLES.includes(userRole);
                const isRsRole         = RS_ROLES.includes(userRole);

                const isActive = !!(item.path && (
                  item.exact
                    ? location.pathname === item.path
                    : location.pathname.startsWith(item.path) && item.path !== '/'
                )) || (
                  // SPO detail page: Pengajuan active for RS roles, Review SPO active for reviewers
                  isSpoDetail && (
                    (item.path === '/pengajuan'    && isRsRole && !isSpoReview) ||
                    (item.path === '/spo/review'   && isSpoReview)
                  )
                ) || (
                  // Formulir detail: Pengajuan active for submitters, Review Formulir active for reviewers
                  isFormulirDetail && (
                    (item.path === '/pengajuan'        && isRsRole && !isFormulirReview) ||
                    (item.path === '/formulir/review'  && isFormulirReview)
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
            style={{ background: 'linear-gradient(135deg, #015c80, #014d6b)' }}
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

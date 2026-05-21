import { useState, useRef, useEffect } from 'react';
import { Search, ChevronRight, LogOut, ChevronDown, Sun, Moon } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

const ROUTE_MAP = {
  '/dashboard':         { section: 'Dashboard',    label: 'Overview' },
  '/documents':         { section: 'SPO',          label: 'Dokumen SPO' },
  '/formulir':          { section: 'Formulir',     label: 'Daftar Formulir' },
  '/formulir/review':   { section: 'Formulir',     label: 'Review Formulir' },
  '/formulir/baru':     { section: 'Formulir',     label: 'Pengajuan Baru' },
  '/pengajuan':         { section: 'Pengajuan',    label: 'Pengajuan' },
  '/spo/review':        { section: 'SPO',          label: 'Review SPO' },
  '/spo/release-queue': { section: 'SPO',          label: 'Rilis SPO' },
  '/spo/template':      { section: 'SPO',          label: 'Template SPO' },
  '/hospitals':         { section: 'Master Data',  label: 'Rumah Sakit' },
  '/divisions':         { section: 'Master Data',  label: 'Divisi' },
  '/users':             { section: 'Master Data',  label: 'Users' },
};

function getRouteInfo(pathname) {
  if (ROUTE_MAP[pathname]) return ROUTE_MAP[pathname];
  if (pathname.startsWith('/formulir/') && pathname.endsWith('/design'))
    return { section: 'Formulir', label: 'Upload Design' };
  if (pathname.startsWith('/formulir/')) return { section: 'Formulir', label: 'Detail Formulir' };
  if (pathname.startsWith('/spo/'))      return { section: 'SPO',      label: 'Detail SPO' };
  return { section: 'Dashboard', label: 'Overview' };
}

export default function Header() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const { pathname } = useLocation();
  const { section, label } = getRouteInfo(pathname);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => { setOpen(false); logout(); toast.success('Berhasil keluar'); };

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user?.nama
    ? user.nama.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'AD';

  return (
    <header
      className="h-14 sticky top-0 z-20 flex items-center justify-between px-6"
      style={{
        background: 'var(--c-header-bg)',
        borderBottom: '1px solid var(--c-border)',
        backdropFilter: 'blur(8px)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-display" style={{ color: 'var(--c-text-faint)' }}>{section}</span>
        <ChevronRight size={13} style={{ color: 'var(--c-text-faint)' }} />
        <span className="font-semibold font-display" style={{ color: 'var(--c-text)' }}>{label}</span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden md:flex items-center">
          <Search size={14} className="absolute left-3 pointer-events-none" style={{ color: 'var(--c-text-faint)' }} />
          <input
            type="text"
            placeholder="Cari..."
            className="rounded-lg pl-9 pr-10 py-1.5 text-sm focus:outline-none w-44 transition-all border"
            style={{
              background: 'var(--c-card)',
              borderColor: 'var(--c-border)',
              color: 'var(--c-text)',
            }}
            onFocus={(e) => { e.target.style.borderColor = '#015c80'; e.target.style.boxShadow = '0 0 0 3px rgba(1,92,128,0.12)'; }}
            onBlur={(e)  => { e.target.style.borderColor = 'var(--c-border)'; e.target.style.boxShadow = 'none'; }}
          />
          <kbd
            className="absolute right-2.5 text-2xs rounded px-1 py-0.5 font-mono select-none"
            style={{ color: 'var(--c-text-faint)', background: 'var(--c-hover)', border: '1px solid var(--c-border)' }}
          >⌘K</kbd>
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggle}
          title={dark ? 'Ganti ke Light Mode' : 'Ganti ke Dark Mode'}
          className="w-8 h-8 flex items-center justify-center rounded-lg border transition-all duration-150 cursor-pointer hover:scale-105"
          style={{ background: 'var(--c-card)', borderColor: 'var(--c-border)', color: 'var(--c-text-muted)' }}
        >
          {dark ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-lg border transition-all duration-150 cursor-pointer"
            style={{
              background: open ? 'var(--c-hover)' : 'transparent',
              borderColor: open ? 'var(--c-border-hover)' : 'transparent',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--c-hover)'; e.currentTarget.style.borderColor = 'var(--c-border)'; }}
            onMouseLeave={(e) => { if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; } }}
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#2a7fa0] to-[#015c80] flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
            <span className="hidden md:block text-sm font-medium" style={{ color: 'var(--c-text)' }}>{user?.nama || 'Admin'}</span>
            <ChevronDown
              size={13}
              className="transition-transform duration-200"
              style={{ color: 'var(--c-text-faint)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>

          {open && (
            <div
              className="absolute right-0 top-full mt-2 w-52 rounded-xl animate-slide-up overflow-hidden z-50 border"
              style={{ background: 'var(--c-card)', borderColor: 'var(--c-border)', boxShadow: 'var(--shadow-lg)' }}
            >
              <div className="px-4 py-3.5 border-b" style={{ borderColor: 'var(--c-border)' }}>
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--c-text)' }}>{user?.nama}</p>
                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--c-text-faint)' }}>{user?.email}</p>
              </div>
              <div className="p-1.5">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-all duration-150 cursor-pointer"
                  style={{ color: 'var(--c-text-muted)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#EF4444'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = ''; }}
                >
                  <LogOut size={14} />
                  Keluar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

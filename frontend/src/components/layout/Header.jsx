import { useState, useRef, useEffect } from 'react';
import { Search, ChevronRight, LogOut, ChevronDown, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNav } from '../../context/NavigationContext';
import toast from 'react-hot-toast';

const PAGE_LABEL = { dashboard: 'Overview', documents: 'Dokumen' };

export default function Header() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const { page } = useNav();
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
      className="h-14 border-b sticky top-0 z-20 flex items-center justify-between px-6 backdrop-blur-sm"
      style={{ background: 'var(--c-header-bg)', borderColor: 'var(--c-border)' }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-ink-faint font-display">Dashboard</span>
        <ChevronRight size={13} className="text-ink-faint" />
        <span className="font-semibold font-display" style={{ color: '#F97316' }}>{PAGE_LABEL[page] ?? page}</span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden md:flex items-center">
          <Search size={14} className="absolute left-3 text-ink-faint pointer-events-none" />
          <input
            type="text"
            placeholder="Cari..."
            className="rounded-lg pl-9 pr-10 py-1.5 text-sm focus:outline-none w-44 transition-all border"
            style={{
              background: 'var(--c-hover)',
              borderColor: 'var(--c-border)',
              color: 'var(--c-text)',
            }}
            onFocus={(e) => { e.target.style.background = 'var(--c-card)'; e.target.style.borderColor = '#F97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.12)'; }}
            onBlur={(e)  => { e.target.style.background = 'var(--c-hover)'; e.target.style.borderColor = 'var(--c-border)'; e.target.style.boxShadow = 'none'; }}
          />
          <kbd
            className="absolute right-2.5 text-2xs rounded px-1 py-0.5 font-mono select-none"
            style={{ color: 'var(--c-text-faint)', background: 'var(--c-card)', border: '1px solid var(--c-border)' }}
          >⌘K</kbd>
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggle}
          title={dark ? 'Ganti ke Light Mode' : 'Ganti ke Dark Mode'}
          className="w-8 h-8 flex items-center justify-center rounded-lg border transition-all duration-150 cursor-pointer hover:scale-105"
          style={{ background: 'var(--c-hover)', borderColor: 'var(--c-border)', color: 'var(--c-text-muted)' }}
        >
          {dark
            ? <Sun size={15} className="text-[#F97316]" />
            : <Moon size={15} className="text-slate-500" />
          }
        </button>

        {/* Profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-lg border transition-all duration-150 cursor-pointer"
            style={{
              background: open ? 'var(--c-hover)' : 'transparent',
              borderColor: open ? 'var(--c-border)' : 'transparent',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--c-hover)'; e.currentTarget.style.borderColor = 'var(--c-border)'; }}
            onMouseLeave={(e) => { if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; } }}
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FB923C] to-[#F97316] flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
            <span className="hidden md:block text-sm font-medium text-ink">{user?.nama || 'Admin'}</span>
            <ChevronDown
              size={13}
              className="text-ink-faint transition-transform duration-200"
              style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>

          {open && (
            <div
              className="absolute right-0 top-full mt-2 w-52 rounded-xl animate-slide-up overflow-hidden z-50 border"
              style={{ background: 'var(--c-card)', borderColor: 'var(--c-border)', boxShadow: 'var(--shadow-lg)' }}
            >
              <div className="px-4 py-3.5 border-b" style={{ borderColor: 'var(--c-border)' }}>
                <p className="text-sm font-semibold text-ink truncate">{user?.nama}</p>
                <p className="text-xs text-ink-faint truncate mt-0.5">{user?.email}</p>
              </div>
              <div className="p-1.5">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-all duration-150 cursor-pointer text-ink-muted"
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

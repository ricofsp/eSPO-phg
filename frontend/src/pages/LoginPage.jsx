import { useState } from 'react';
import { Eye, EyeOff, FileText, Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [show,    setShow]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Email dan password wajib diisi.'); return; }
    setLoading(true);
    try {
      await login(form.email, form.password);
    } catch (err) {
      setError(err.response?.data?.message || 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--c-bg)' }}
    >
      {/* Decorative blobs */}
      <div
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-[0.07] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #F97316, transparent)' }}
      />
      <div
        className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-[0.05] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #F97316, transparent)' }}
      />

      <div className="w-full max-w-[400px] relative z-10 animate-slide-up">
        {/* Card */}
        <div
          className="rounded-2xl overflow-hidden border"
          style={{ background: 'var(--c-card)', borderColor: 'var(--c-border)', boxShadow: 'var(--shadow-lg)' }}
        >
          {/* Accent bar */}
          <div className="h-1 bg-gradient-to-r from-[#FB923C] via-[#F97316] to-[#013D56]" />

          <div className="px-8 py-8">
            {/* Brand */}
            <div className="flex flex-col items-center mb-7">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'linear-gradient(135deg, #FB923C, #F97316)', boxShadow: '0 8px 20px rgba(249,115,22,0.3)' }}
              >
                <FileText size={22} className="text-white" />
              </div>
              <h1 className="text-xl font-bold text-ink">DocSystem</h1>
              <p className="text-sm text-ink-faint mt-1">Sistem Pengelolaan Dokumen</p>
            </div>

            <div className="mb-5">
              <h2 className="text-base font-semibold text-ink">Masuk ke Akun Anda</h2>
              <p className="text-sm text-ink-faint mt-0.5">Masukkan kredensial untuk melanjutkan</p>
            </div>

            {error && (
              <div
                className="flex items-center gap-2.5 rounded-lg px-4 py-3 mb-5 border"
                style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)' }}
              >
                <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-ink-muted">Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
                  <input
                    type="email"
                    placeholder="admin@docsystem.com"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    className="input-field pl-9 w-full"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-ink-muted">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
                  <input
                    type={show ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    className="input-field pl-9 pr-10 w-full"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors cursor-pointer text-ink-faint hover:text-ink-muted"
                    tabIndex={-1}
                  >
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary justify-center py-3 mt-1"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Memproses...
                  </span>
                ) : 'Masuk'}
              </button>
            </form>
          </div>

          <div
            className="px-8 py-4 border-t text-center"
            style={{ background: 'var(--c-hover)', borderColor: 'var(--c-border)' }}
          >
            <p className="text-xs text-ink-faint">
              Demo:&nbsp;
              <span className="font-medium text-ink-muted">admin@docsystem.com</span>
              &nbsp;/&nbsp;
              <span className="font-medium text-ink-muted">admin123</span>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-ink-faint mt-5">
          &copy; {new Date().getFullYear()} DocSystem. All rights reserved.
        </p>
      </div>
    </div>
  );
}

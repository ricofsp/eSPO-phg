import { useState, useEffect } from 'react';
import { Plus, Search, RefreshCw, Pencil, Trash2, UserCircle, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import useTable from '../hooks/useTable';
import { userService, hospitalService, divisionService } from '../services/api';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

const EMPTY = { username: '', nama: '', email: '', password: '', role: 'user', hospital_id: '', divisi_id: [], is_active: 1 };

export default function UsersPage() {
  const { data, pagination, loading, error, filters, create, update, remove, setPage, setSearch, setFilter, refetch } = useTable(userService);

  const [hospitals, setHospitals] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [formOpen,     setFormOpen]     = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [form,         setForm]         = useState(EMPTY);
  const [showPw,       setShowPw]       = useState(false);

  useEffect(() => {
    hospitalService.getAll({ all: '1' }).then(({ data: r }) => setHospitals(r.data || [])).catch(() => {});
    divisionService.getAll({ all: '1' }).then(({ data: r }) => setDivisions(r.data || [])).catch(() => {});
  }, []);

  const openCreate = () => { setForm(EMPTY); setEditTarget(null); setShowPw(false); setFormOpen(true); };
  const openEdit   = (row) => {
    const ids = row.divisi_id ? row.divisi_id.split(',').map(Number).filter(Boolean) : [];
    setForm({ username: row.username, nama: row.nama, email: row.email, password: '', role: row.role, hospital_id: row.hospital_id || '', divisi_id: ids, is_active: row.is_active });
    setEditTarget(row);
    setShowPw(false);
    setFormOpen(true);
  };

  const toggleDivisi = (id) => {
    setForm((f) => ({
      ...f,
      divisi_id: f.divisi_id.includes(id) ? f.divisi_id.filter((d) => d !== id) : [...f.divisi_id, id],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, hospital_id: form.hospital_id || null };
      if (!payload.password) delete payload.password;
      if (editTarget) {
        await update(editTarget.id, payload);
        toast.success('User berhasil diperbarui');
      } else {
        await create(payload);
        toast.success('User berhasil ditambahkan');
      }
      setFormOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan data');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await remove(deleteTarget.id);
      toast.success('User berhasil dihapus');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus');
    } finally {
      setDeleting(false);
    }
  };

  const field = (key) => ({ value: form[key], onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })) });

  const divisiLabel = (ids) => {
    if (!ids) return '-';
    const arr = ids.split(',').map(Number).filter(Boolean);
    if (!arr.length) return '-';
    const names = arr.map((id) => divisions.find((d) => d.id === id)?.nama).filter(Boolean);
    return names.length ? names.join(', ') : ids;
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink font-display">Pengguna</h1>
          <p className="text-sm text-ink-muted mt-0.5">Kelola akun pengguna sistem SPO</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={refetch} className="btn-secondary !px-3"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
          <Button variant="primary" onClick={openCreate}><Plus size={15} /> Tambah</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border" style={{ background: 'var(--c-card)', borderColor: 'var(--c-border)' }}>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
          <input type="text" placeholder="Cari nama, username, email..." value={filters.search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-9 w-full" />
        </div>
        <select value={filters.role || ''} onChange={(e) => setFilter('role', e.target.value)} className="input-field !w-auto">
          <option value="">Semua Role</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--c-card)', borderColor: 'var(--c-border)' }}>
        <table className="w-full" style={{ minWidth: 700 }}>
          <thead>
            <tr style={{ background: 'var(--c-hover)', borderBottom: '1px solid var(--c-border)' }}>
              <th className="table-th">Pengguna</th>
              <th className="table-th">Email</th>
              <th className="table-th">Role</th>
              <th className="table-th">Divisi</th>
              <th className="table-th">Status</th>
              <th className="table-th text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="table-td text-center text-ink-faint py-10">Memuat data...</td></tr>}
            {!loading && data.length === 0 && <tr><td colSpan={6} className="table-td text-center text-ink-faint py-10">Belum ada data</td></tr>}
            {!loading && data.map((row) => (
              <tr key={row.id} className="table-row">
                <td className="table-td">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}>
                      {row.nama?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-ink text-sm">{row.nama}</p>
                      <p className="text-xs text-ink-faint">@{row.username}</p>
                    </div>
                  </div>
                </td>
                <td className="table-td text-ink-muted text-sm">{row.email}</td>
                <td className="table-td">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${row.role === 'admin' ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-600'}`}>
                    {row.role}
                  </span>
                </td>
                <td className="table-td text-xs text-ink-muted max-w-[180px] truncate" title={divisiLabel(row.divisi_id)}>
                  {divisiLabel(row.divisi_id)}
                </td>
                <td className="table-td">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${row.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {row.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="table-td text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(row)} className="w-7 h-7 inline-flex items-center justify-center rounded-md text-ink-faint hover:bg-[var(--c-hover)] transition-all cursor-pointer"><Pencil size={13} /></button>
                    <button onClick={() => setDeleteTarget(row)} className="w-7 h-7 inline-flex items-center justify-center rounded-md text-red-400 hover:bg-red-50 transition-all cursor-pointer"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t text-sm" style={{ borderColor: 'var(--c-border)' }}>
            <span className="text-ink-faint">Total: {pagination.total} pengguna</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 rounded-md text-xs font-medium transition-all ${p === pagination.page ? 'bg-[#F97316] text-white' : 'text-ink-muted hover:bg-[var(--c-hover)]'}`}>{p}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editTarget ? 'Edit Pengguna' : 'Tambah Pengguna'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide block mb-1.5">Username <span className="text-red-500">*</span></label>
              <input {...field('username')} required placeholder="john.doe" className="input-field w-full" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide block mb-1.5">Nama Lengkap <span className="text-red-500">*</span></label>
              <input {...field('nama')} required placeholder="John Doe" className="input-field w-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide block mb-1.5">Email <span className="text-red-500">*</span></label>
              <input {...field('email')} required type="email" placeholder="john@rs.co.id" className="input-field w-full" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide block mb-1.5">
                Password {!editTarget && <span className="text-red-500">*</span>}
                {editTarget && <span className="text-ink-faint normal-case font-normal">(kosongkan jika tidak diubah)</span>}
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required={!editTarget}
                  placeholder="••••••••"
                  className="input-field w-full pr-9"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint cursor-pointer">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide block mb-1.5">Role</label>
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="input-field w-full">
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide block mb-1.5">Rumah Sakit</label>
              <select value={form.hospital_id} onChange={(e) => setForm((f) => ({ ...f, hospital_id: e.target.value }))} className="input-field w-full">
                <option value="">-- Pilih RS --</option>
                {hospitals.map((h) => <option key={h.id} value={h.id}>{h.nama}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide">Akses Divisi</label>
              <div className="flex items-center gap-3">
                <button type="button"
                  onClick={() => setForm((f) => ({ ...f, divisi_id: divisions.map((d) => d.id) }))}
                  className="text-xs font-medium cursor-pointer transition-colors" style={{ color: '#F97316' }}>
                  Pilih semua
                </button>
                {form.divisi_id.length > 0 && (
                  <button type="button"
                    onClick={() => setForm((f) => ({ ...f, divisi_id: [] }))}
                    className="text-xs text-ink-faint hover:text-red-500 transition-colors cursor-pointer">
                    Hapus semua ({form.divisi_id.length})
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-3 rounded-xl border" style={{ borderColor: 'var(--c-border)', background: 'var(--c-hover)', minHeight: '60px' }}>
              {divisions.map((d) => {
                const active = form.divisi_id.includes(d.id);
                return (
                  <button key={d.id} type="button" onClick={() => toggleDivisi(d.id)}
                    className="text-xs px-2.5 py-1 rounded-full font-medium transition-all cursor-pointer"
                    style={active
                      ? { background: '#F97316', color: '#fff', boxShadow: '0 2px 6px rgba(249,115,22,0.3)' }
                      : { background: 'var(--c-card)', color: 'var(--c-text-muted)', border: '1px solid var(--c-border)' }
                    }>
                    {d.kode}
                  </button>
                );
              })}
              {divisions.length === 0 && <span className="text-xs text-ink-faint">Belum ada divisi</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide block mb-1.5">Status</label>
              <select value={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: parseInt(e.target.value) }))} className="input-field w-full">
                <option value={1}>Aktif</option>
                <option value={0}>Nonaktif</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Batal</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus Pengguna" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">Yakin ingin menghapus pengguna <span className="font-semibold text-ink">{deleteTarget?.nama}</span>?</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <button type="button" onClick={handleDelete} disabled={deleting} className="btn-primary" style={{ background: '#DC2626' }}>
              {deleting ? 'Menghapus...' : 'Ya, Hapus'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

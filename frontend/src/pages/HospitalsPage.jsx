import { useState } from 'react';
import { Plus, Search, RefreshCw, Pencil, Trash2, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import useTable from '../hooks/useTable';
import { hospitalService } from '../services/api';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

const EMPTY = { kode: '', singkatan: '', nama: '', direktur: '', direktur_email: '', is_active: 1 };

export default function HospitalsPage() {
  const { data, pagination, loading, error, filters, create, update, remove, setPage, setSearch, refetch } = useTable(hospitalService);

  const [formOpen,     setFormOpen]     = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [form,         setForm]         = useState(EMPTY);

  const openCreate = () => { setForm(EMPTY); setEditTarget(null); setFormOpen(true); };
  const openEdit   = (row) => { setForm({ kode: row.kode, singkatan: row.singkatan || '', nama: row.nama, direktur: row.direktur || '', direktur_email: row.direktur_email || '', is_active: row.is_active }); setEditTarget(row); setFormOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editTarget) {
        await update(editTarget.id, form);
        toast.success('Rumah sakit berhasil diperbarui');
      } else {
        await create(form);
        toast.success('Rumah sakit berhasil ditambahkan');
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
      toast.success('Rumah sakit berhasil dihapus');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus');
    } finally {
      setDeleting(false);
    }
  };

  const field = (key) => ({ value: form[key], onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })) });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink font-display">Rumah Sakit</h1>
          <p className="text-sm text-ink-muted mt-0.5">Kelola data rumah sakit dalam sistem</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={refetch} className="btn-secondary !px-3" title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <Button variant="primary" onClick={openCreate}>
            <Plus size={15} /> Tambah
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ background: 'var(--c-card)', borderColor: 'var(--c-border)' }}>
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
          <input type="text" placeholder="Cari kode atau nama..." value={filters.search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-9 w-full" />
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--c-card)', borderColor: 'var(--c-border)' }}>
        <table className="w-full" style={{ minWidth: 640 }}>
          <thead>
            <tr style={{ background: 'var(--c-hover)', borderBottom: '1px solid var(--c-border)' }}>
              <th className="table-th">Kode</th>
              <th className="table-th">Singkatan</th>
              <th className="table-th">Nama Rumah Sakit</th>
              <th className="table-th">Direktur</th>
              <th className="table-th">Email Direktur</th>
              <th className="table-th">Status</th>
              <th className="table-th text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="table-td text-center text-ink-faint py-10">Memuat data...</td></tr>
            )}
            {!loading && data.length === 0 && (
              <tr><td colSpan={7} className="table-td text-center text-ink-faint py-10">Belum ada data</td></tr>
            )}
            {!loading && data.map((row) => (
              <tr key={row.id} className="table-row">
                <td className="table-td font-mono text-sm font-semibold text-ink">{row.kode}</td>
                <td className="table-td text-sm text-ink-muted">{row.singkatan || '-'}</td>
                <td className="table-td">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(249,115,22,0.1)', color: '#F97316' }}>
                      <Building2 size={13} />
                    </div>
                    <span className="font-medium text-ink">{row.nama}</span>
                  </div>
                </td>
                <td className="table-td text-ink-muted">{row.direktur || '-'}</td>
                <td className="table-td text-ink-muted text-sm">{row.direktur_email || '-'}</td>
                <td className="table-td">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${row.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {row.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="table-td text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(row)} className="w-7 h-7 inline-flex items-center justify-center rounded-md text-ink-faint hover:bg-[var(--c-hover)] transition-all cursor-pointer" title="Edit">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setDeleteTarget(row)} className="w-7 h-7 inline-flex items-center justify-center rounded-md text-red-400 hover:bg-red-50 transition-all cursor-pointer" title="Hapus">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t text-sm" style={{ borderColor: 'var(--c-border)' }}>
            <span className="text-ink-faint">Total: {pagination.total} data</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 rounded-md text-xs font-medium transition-all ${p === pagination.page ? 'bg-[#F97316] text-white' : 'text-ink-muted hover:bg-[var(--c-hover)]'}`}>{p}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editTarget ? 'Edit Rumah Sakit' : 'Tambah Rumah Sakit'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide block mb-1.5">Kode <span className="text-red-500">*</span></label>
              <input {...field('kode')} required placeholder="RSU-001" className="input-field w-full" style={{ textTransform: 'uppercase' }} />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide block mb-1.5">Singkatan</label>
              <input {...field('singkatan')} placeholder="RSUPN" className="input-field w-full" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide block mb-1.5">Status</label>
              <select value={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: parseInt(e.target.value) }))} className="input-field w-full">
                <option value={1}>Aktif</option>
                <option value={0}>Nonaktif</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide block mb-1.5">Nama Rumah Sakit <span className="text-red-500">*</span></label>
            <input {...field('nama')} required placeholder="RS Umum Pusat..." className="input-field w-full" />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide block mb-1.5">Direktur</label>
            <input {...field('direktur')} placeholder="Dr. Nama, Sp.PD" className="input-field w-full" />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide block mb-1.5">Email Direktur</label>
            <input {...field('direktur_email')} type="email" placeholder="direktur@rs.co.id" className="input-field w-full" />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Batal</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus Rumah Sakit" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">Yakin ingin menghapus <span className="font-semibold text-ink">{deleteTarget?.nama}</span>? Tindakan ini tidak dapat dibatalkan.</p>
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

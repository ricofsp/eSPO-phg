import { useState, useEffect } from 'react';
import { Plus, Search, RefreshCw, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import useDocuments from '../hooks/useDocuments';
import { divisionService, documentService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import DocumentTable from '../components/documents/DocumentTable';
import DocumentForm from '../components/documents/DocumentForm';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

export default function DocumentsPage() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'admin';
  const {
    documents, pagination, loading, error,
    filters, create, update, remove,
    setPage, setSearch, setFilter, refetch,
  } = useDocuments();

  const [divisions,    setDivisions]    = useState([]);
  const [pemilikList,  setPemilikList]  = useState([]);
  const [formOpen,     setFormOpen]     = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  useEffect(() => {
    divisionService.getAll({ all: '1' }).then(({ data }) => {
      const all = data.data || [];
      if (isAdmin) {
        setDivisions(all);
      } else {
        const userDivIds = (user?.divisi_id || '').split(',').map(Number).filter(Boolean);
        setDivisions(all.filter((d) => userDivIds.includes(d.id)));
      }
    }).catch(() => {});
    if (!isAdmin) {
      documentService.getPemilikList().then(({ data }) => setPemilikList(data || [])).catch(() => {});
    }
  }, [isAdmin, user?.divisi_id]);

  const openCreate = () => { setEditTarget(null); setFormOpen(true); };
  const openEdit   = (doc) => { setEditTarget(doc); setFormOpen(true); };

  const handleSubmit = async (formData) => {
    if (editTarget) {
      await update(editTarget.id, formData);
      toast.success('SPO berhasil diperbarui');
    } else {
      await create(formData);
      toast.success('SPO berhasil ditambahkan');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await remove(deleteTarget.id);
      toast.success('SPO berhasil dihapus');
      setDeleteTarget(null);
    } catch {
      toast.error('Gagal menghapus SPO');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink font-display">Dokumen SPO</h1>
          <p className="text-sm text-ink-muted mt-0.5">Standard Operating Procedure — kelola seluruh dokumen prosedur</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button type="button" onClick={refetch} className="btn-secondary !px-3" title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {isAdmin && (
            <Button variant="primary" onClick={openCreate}>
              <Plus size={15} /> Tambah SPO
            </Button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 rounded-xl border" style={{ background: 'var(--c-card)', borderColor: 'var(--c-border)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nomor atau judul SPO..."
            value={filters.search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 w-full"
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Filter size={14} className="text-ink-faint" />
          <select
            value={filters.divisi_id}
            onChange={(e) => setFilter('divisi_id', e.target.value)}
            className="input-field !w-auto min-w-[160px]"
          >
            <option value="">Semua Divisi</option>
            {divisions.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
          </select>
          {!isAdmin && (
            <select
              value={filters.pemilik}
              onChange={(e) => setFilter('pemilik', e.target.value)}
              className="input-field !w-auto min-w-[160px]"
            >
              <option value="">Semua Pemilik</option>
              {pemilikList.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <DocumentTable
        documents={documents}
        pagination={pagination}
        loading={loading}
        divisions={divisions}
        isAdmin={isAdmin}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
        onPageChange={setPage}
      />

      <DocumentForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        initialData={editTarget}
        divisions={divisions}
      />

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus SPO" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            Yakin ingin menghapus SPO{' '}
            <span className="font-semibold text-ink">{deleteTarget?.nomor_dokumen}</span>?{' '}
            Tindakan ini tidak dapat dibatalkan.
          </p>
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

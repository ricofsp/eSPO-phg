import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { spoService, divisionService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { fmtDate } from './spoUtils.jsx';

const CORP_ROLES = ['mutu_corp', 'kadiv_corp', 'admin'];

export default function TemplateSpoPage() {
  const { user } = useAuth();
  const canManage = CORP_ROLES.includes(user?.role);

  const [templates, setTemplates]   = useState([]);
  const [divisions, setDivisions]   = useState([]);
  const [loading, setLoading]       = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm] = useState({ nama_template: '', deskripsi: '', departemen_id: '' });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); loadDivisions(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await spoService.getTemplates();
      setTemplates(Array.isArray(data) ? data : (data || []));
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function loadDivisions() {
    try {
      const { data } = await divisionService.getAll({ limit: 200 });
      setDivisions(data.data || data);
    } catch { /* ignore */ }
  }

  function openAdd() {
    setEditing(null);
    setForm({ nama_template: '', deskripsi: '', departemen_id: '' });
    setFile(null);
    setShowForm(true);
  }

  function openEdit(t) {
    setEditing(t);
    setForm({ nama_template: t.nama_template, deskripsi: t.deskripsi || '', departemen_id: t.departemen_id || '' });
    setFile(null);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.nama_template.trim()) return toast.error('Nama template wajib diisi');
    if (!editing && !file) return toast.error('File wajib diupload untuk template baru');
    setSaving(true);
    try {
      if (editing) {
        await spoService.updateTemplate(editing.id, form);
      } else {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, v));
        fd.append('file', file);
        await spoService.createTemplate(fd);
      }
      toast.success(editing ? 'Template diperbarui' : 'Template ditambahkan');
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan');
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Hapus template ini?')) return;
    try {
      await spoService.deleteTemplate(id);
      toast.success('Template dihapus');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus');
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--c-text)' }}>Template SPO</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--c-text-muted)' }}>
            Kelola template SPO yang dapat diunduh oleh pengaju
          </p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={openAdd}>
            <Plus size={15} /> Tambah Template
          </button>
        )}
      </div>

      <div style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', boxShadow: 'var(--shadow-sm)' }}>
        <table className="w-full">
          <thead style={{ borderBottom: '1px solid var(--c-border)', background: 'var(--c-hover)' }}>
            <tr>
              <th className="table-th" style={{ width: 40 }}>No</th>
              <th className="table-th">Nama Template</th>
              <th className="table-th">Deskripsi</th>
              <th className="table-th">Departemen</th>
              <th className="table-th">Diunggah</th>
              <th className="table-th">Status</th>
              <th className="table-th" style={{ width: 120 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="table-td text-center py-10" style={{ color: 'var(--c-text-faint)' }}>Memuat...</td></tr>
            ) : templates.length === 0 ? (
              <tr>
                <td colSpan={7} className="table-td text-center py-12" style={{ color: 'var(--c-text-faint)' }}>
                  Belum ada template
                </td>
              </tr>
            ) : templates.map((t, i) => (
              <tr key={t.id} className="table-row">
                <td className="table-td text-center">{i + 1}</td>
                <td className="table-td font-medium" style={{ color: 'var(--c-text)' }}>{t.nama_template}</td>
                <td className="table-td">{t.deskripsi || '-'}</td>
                <td className="table-td">{t.departemen_nama || '-'}</td>
                <td className="table-td">
                  <div>{t.uploader_nama}</div>
                  <div className="text-xs" style={{ color: 'var(--c-text-faint)' }}>{fmtDate(t.created_at)}</div>
                </td>
                <td className="table-td">
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px',
                    background: t.is_active ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)',
                    color: t.is_active ? '#16A34A' : '#EF4444',
                  }}>
                    {t.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="table-td">
                  <div className="flex gap-1">
                    <a href={t.file_path} target="_blank" rel="noreferrer" className="btn-secondary text-xs py-1 px-2">
                      <Download size={12} />
                    </a>
                    {canManage && <>
                      <button className="btn-secondary text-xs py-1 px-2" onClick={() => openEdit(t)}>
                        <Edit2 size={12} />
                      </button>
                      <button className="btn-danger text-xs py-1 px-2" onClick={() => handleDelete(t.id)}>
                        <Trash2 size={12} />
                      </button>
                    </>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--c-card)', border: '1px solid var(--c-border)',
            width: 480, boxShadow: 'var(--shadow-lg)',
          }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--c-border)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--c-text)' }}>
                {editing ? 'Edit Template' : 'Tambah Template'}
              </h3>
              <button onClick={() => setShowForm(false)} className="btn-secondary text-xs py-1 px-2">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--c-text-muted)' }}>
                  Nama Template *
                </label>
                <input
                  className="input-field"
                  value={form.nama_template}
                  onChange={e => setForm(f => ({ ...f, nama_template: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--c-text-muted)' }}>
                  Departemen
                </label>
                <select
                  className="input-field"
                  value={form.departemen_id}
                  onChange={e => setForm(f => ({ ...f, departemen_id: e.target.value }))}
                >
                  <option value="">Semua Departemen</option>
                  {divisions.map(d => (
                    <option key={d.id} value={d.id}>{d.nama}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--c-text-muted)' }}>
                  Deskripsi
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={form.deskripsi}
                  onChange={e => setForm(f => ({ ...f, deskripsi: e.target.value }))}
                />
              </div>
              {!editing && (
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--c-text-muted)' }}>
                    File Template *
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="input-field text-xs"
                    onChange={e => setFile(e.target.files[0] || null)}
                  />
                </div>
              )}
              {editing && (
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--c-text-muted)' }}>Status</label>
                  <select
                    className="input-field"
                    value={form.is_active ?? 1}
                    onChange={e => setForm(f => ({ ...f, is_active: Number(e.target.value) }))}
                  >
                    <option value={1}>Aktif</option>
                    <option value={0}>Nonaktif</option>
                  </select>
                </div>
              )}
            </div>
            <div className="px-4 py-3 flex gap-2 justify-end" style={{ borderTop: '1px solid var(--c-border)' }}>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Batal</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Tambah Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

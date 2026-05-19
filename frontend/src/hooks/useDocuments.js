import { useState, useEffect, useCallback } from 'react';
import { documentService } from '../services/api';

export default function useDocuments() {
  const [documents, setDocuments]   = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  const [filters, setFilters] = useState({ search: '', divisi_id: '', pemilik: '', page: 1, limit: 10 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await documentService.getAll(filters);
      setDocuments(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const create = async (formData) => {
    const { data } = await documentService.create(formData);
    await fetchData();
    return data;
  };

  const update = async (id, formData) => {
    const { data } = await documentService.update(id, formData);
    await fetchData();
    return data;
  };

  const remove = async (id) => {
    await documentService.remove(id);
    await fetchData();
  };

  const setPage   = (page)        => setFilters((f) => ({ ...f, page }));
  const setSearch = (search)      => setFilters((f) => ({ ...f, search, page: 1 }));
  const setFilter = (key, value)  => setFilters((f) => ({ ...f, [key]: value, page: 1 }));

  return {
    documents, pagination, loading, error, filters,
    create, update, remove,
    setPage, setSearch, setFilter, refetch: fetchData,
  };
}

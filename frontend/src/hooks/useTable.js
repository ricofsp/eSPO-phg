import { useState, useEffect, useCallback } from 'react';

export default function useTable(service) {
  const [data, setData]             = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [filters, setFilters]       = useState({ search: '', page: 1, limit: 10 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await service.getAll(filters);
      setData(res.data);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [filters, service]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const create = async (payload) => {
    const { data: res } = await service.create(payload);
    await fetchData();
    return res;
  };

  const update = async (id, payload) => {
    const { data: res } = await service.update(id, payload);
    await fetchData();
    return res;
  };

  const remove = async (id) => {
    await service.remove(id);
    await fetchData();
  };

  const setPage   = (page)       => setFilters((f) => ({ ...f, page }));
  const setSearch = (search)     => setFilters((f) => ({ ...f, search, page: 1 }));
  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value, page: 1 }));

  return {
    data, pagination, loading, error, filters,
    create, update, remove,
    setPage, setSearch, setFilter, refetch: fetchData,
  };
}

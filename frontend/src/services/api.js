import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('docsystem_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('docsystem_token');
      localStorage.removeItem('docsystem_user');
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

export const documentService = {
  getAll:       (params)      => api.get('/documents', { params }),
  getOne:       (id)          => api.get(`/documents/${id}`),
  getPemilikList: ()          => api.get('/documents/pemilik-list'),
  getStats:       ()          => api.get('/documents/stats'),
  create:       (formData)    => api.post('/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update:       (id, formData)=> api.put(`/documents/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  remove:       (id)          => api.delete(`/documents/${id}`),
};

export const hospitalService = {
  getAll:  (params) => api.get('/hospitals', { params }),
  getOne:  (id)     => api.get(`/hospitals/${id}`),
  create:  (data)   => api.post('/hospitals', data),
  update:  (id, d)  => api.put(`/hospitals/${id}`, d),
  remove:  (id)     => api.delete(`/hospitals/${id}`),
};

export const divisionService = {
  getAll:  (params) => api.get('/divisions', { params }),
  getOne:  (id)     => api.get(`/divisions/${id}`),
  create:  (data)   => api.post('/divisions', data),
  update:  (id, d)  => api.put(`/divisions/${id}`, d),
  remove:  (id)     => api.delete(`/divisions/${id}`),
};

export const userService = {
  getAll:  (params) => api.get('/users', { params }),
  getOne:  (id)     => api.get(`/users/${id}`),
  create:  (data)   => api.post('/users', data),
  update:  (id, d)  => api.put(`/users/${id}`, d),
  remove:  (id)     => api.delete(`/users/${id}`),
};

export const formulirService = {
  getAll:          (params)   => api.get('/formulir', { params }),
  getOne:          (id)       => api.get(`/formulir/${id}`),
  checkUnique:     (params)   => api.get('/formulir/check-unique', { params }),
  getForReview:    ()         => api.get('/formulir/for-review'),
  getMySubmissions:()         => api.get('/formulir/my-submissions'),
  getKadivList:    (params)   => api.get('/formulir/kadiv-list', { params }),
  getFiles:        (id)       => api.get(`/formulir/${id}/files`),
  create:          (fd)       => api.post('/formulir', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  approve:         (id, data) => api.post(`/formulir/${id}/approve`, data),
  reject:          (id, data) => api.post(`/formulir/${id}/reject`, data),
  resubmit:        (id, fd)   => api.post(`/formulir/${id}/resubmit`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  replaceDraft:    (id, fd)   => api.post(`/formulir/${id}/replace-draft`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  submitDesign:    (id, fd)   => api.post(`/formulir/${id}/submit-design`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export default api;

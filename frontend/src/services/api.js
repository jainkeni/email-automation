import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 responses (expired/invalid token)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminData');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    register: (name, email, password) => api.post('/auth/register', { name, email, password }),
    getMe: () => api.get('/auth/me'),
};

// Requests API
export const requestsAPI = {
    getAll: (params) => api.get('/requests', { params }),
    getStats: () => api.get('/requests/stats'),
    getById: (id) => api.get(`/requests/${id}`),
    approve: (id, replyText) => api.put(`/requests/${id}/approve`, { replyText }),
    reject: (id, reason) => api.put(`/requests/${id}/reject`, { reason }),
    regenerate: (id) => api.post(`/requests/${id}/regenerate`),
};

// Settings API
export const settingsAPI = {
    get: () => api.get('/settings'),
    update: (data) => api.put('/settings', data),
};

// Products API
export const productsAPI = {
    getAll: (params) => api.get('/products', { params }),
    getFilters: () => api.get('/products/filters'),
    getById: (id) => api.get(`/products/${id}`),
    create: (data) => api.post('/products', data),
    uploadBulk: (products) => api.post('/products/bulk', { products }),
    update: (id, data) => api.put(`/products/${id}`, data),
    delete: (id) => api.delete(`/products/${id}`),
};

// Customers API
export const customersAPI = {
    getAll: (params) => api.get('/customers', { params }),
    getById: (id) => api.get(`/customers/${id}`),
    getPurchaseHistory: (id) => api.get(`/customers/${id}/purchase-history`),
    create: (data) => api.post('/customers', data),
    update: (id, data) => api.put(`/customers/${id}`, data),
};

// Quotations API
export const quotationsAPI = {
    analyze: (inquiryId) => api.post(`/quotations/analyze/${inquiryId}`),
    getAll: (params) => api.get('/quotations', { params }),
    getById: (id) => api.get(`/quotations/${id}`),
    update: (id, data) => api.put(`/quotations/${id}`, data),
    updateItem: (quotationId, itemId, data) => api.put(`/quotations/${quotationId}/items/${itemId}`, data),
    deleteItem: (quotationId, itemId) => api.delete(`/quotations/${quotationId}/items/${itemId}`),
    approve: (id) => api.post(`/quotations/${id}/approve`),
    reject: (id, reason) => api.post(`/quotations/${id}/reject`, { reason }),
    send: (id) => api.post(`/quotations/${id}/send`),
    getAudit: (id) => api.get(`/quotations/${id}/audit`),
    getMetrics: () => api.get('/quotations/metrics/dashboard'),
};

export default api;

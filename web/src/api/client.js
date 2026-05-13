import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

// Auto-attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Unified error message
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.message || err.message || 'Lỗi mạng';
    return Promise.reject(new Error(msg));
  }
);

// ---- API Endpoints ----
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }).then(r => r.data),
  register: (data) => api.post('/auth/register', data).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
};

export const movieApi = {
  list: (params) => api.get('/movies', { params }).then(r => r.data),
  detail: (id) => api.get(`/movies/${id}`).then(r => r.data),
  showtimes: (id, params) => api.get(`/movies/${id}/showtimes`, { params }).then(r => r.data),
  reviews: (id) => api.get(`/movies/${id}/reviews`).then(r => r.data),
};

export const showtimeApi = {
  detail: (id) => api.get(`/showtimes/${id}`).then(r => r.data),
  seats: (id) => api.get(`/showtimes/${id}/seats`).then(r => r.data),
  // admin hủy suất (auto refund)
  cancelShowtime: (id, reason) =>
    api.patch(`/showtimes/${id}/cancel`, { reason }).then(r => r.data),
};

// Hold ghế tạm 8 phút
export const holdApi = {
  create: (showtimeId, seat_ids) =>
    api.post(`/showtimes/${showtimeId}/holds`, { seat_ids }).then(r => r.data),
  myHolds: (showtimeId) =>
    api.get(`/showtimes/${showtimeId}/holds`).then(r => r.data),
  release: (showtimeId, sessionId) =>
    api.delete(`/showtimes/${showtimeId}/holds/${sessionId}`).then(r => r.data),
};

// Room layout (admin + public)
export const roomApi = {
  getLayout: (id) => api.get(`/rooms/${id}/layout`).then(r => r.data),
  saveLayout: (id, layout) =>
    api.post(`/admin/rooms/${id}/layout`, layout).then(r => r.data),
  listForAdmin: () => api.get('/admin/rooms').then(r => r.data),
};

export const bookingApi = {
  create: (data) => api.post('/bookings', data).then(r => r.data),       // legacy
  // convert hold → booking khi user vào trang thanh toán
  createFromHold: (data) => api.post('/bookings/from-hold', data).then(r => r.data),
  mine: () => api.get('/bookings/mine').then(r => r.data),
  detail: (id) => api.get(`/bookings/${id}`).then(r => r.data),
  // Không có cancel - hệ thống không hỗ trợ khách tự hủy vé
};

export const paymentApi = {
  methods: () => api.get('/payments/methods').then(r => r.data),
  pay: (data) => api.post('/payments', data).then(r => r.data),
};

export const couponApi = {
  list: () => api.get('/coupons').then(r => r.data),
  validate: (data) => api.post('/coupons/validate', data).then(r => r.data),
};

export const contentApi = {
  banners: () => api.get('/banners').then(r => r.data),
  promotions: (params) => api.get('/promotions', { params }).then(r => r.data),
  promotionDetail: (id) => api.get(`/promotions/${id}`).then(r => r.data),
  news: (params) => api.get('/news', { params }).then(r => r.data),
  newsDetail: (id) => api.get(`/news/${id}`).then(r => r.data),
};

export const cinemaApi = {
  list: (params) => api.get('/cinemas', { params }).then(r => r.data),
  cities: () => api.get('/cinemas/cities').then(r => r.data),
  detail: (id) => api.get(`/cinemas/${id}`).then(r => r.data),
};

export default api;

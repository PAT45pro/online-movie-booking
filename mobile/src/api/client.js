import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ⚠️ Lưu ý: Khi chạy trên thiết bị thật (Expo Go), localhost của máy tính
// không phải là localhost của điện thoại. Thay bằng IP LAN của máy chạy backend.
// Ví dụ: const HOST = '192.168.1.10';
const HOST = Platform.select({
  ios: 'localhost',       // iOS simulator dùng được localhost
  android: '10.0.2.2',    // Android emulator dùng 10.0.2.2
  default: 'localhost',
});

export const API_BASE = `http://${HOST}:3000/api`;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

// Auto-attach JWT token
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
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

export const cinemaApi = {
  list: (params) => api.get('/cinemas', { params }).then(r => r.data),
  cities: () => api.get('/cinemas/cities').then(r => r.data),
  detail: (id) => api.get(`/cinemas/${id}`).then(r => r.data),
};

export const showtimeApi = {
  detail: (id) => api.get(`/showtimes/${id}`).then(r => r.data),
  seats: (id) => api.get(`/showtimes/${id}/seats`).then(r => r.data),
};

export const bookingApi = {
  create: (data) => api.post('/bookings', data).then(r => r.data),
  mine: () => api.get('/bookings/mine').then(r => r.data),
  detail: (id) => api.get(`/bookings/${id}`).then(r => r.data),
  cancel: (id) => api.patch(`/bookings/${id}/cancel`).then(r => r.data),
};

export const paymentApi = {
  methods: () => api.get('/payments/methods').then(r => r.data),
  pay: (data) => api.post('/payments', data).then(r => r.data),
};

export const couponApi = {
  list: () => api.get('/coupons').then(r => r.data),
  validate: (data) => api.post('/coupons/validate', data).then(r => r.data),
};

export default api;

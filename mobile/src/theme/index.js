export const colors = {
  primary: '#E11D48',       // đỏ rạp chiếu phim
  primaryDark: '#BE123C',
  background: '#0F172A',    // xanh đen nền
  surface: '#1E293B',
  surfaceLight: '#334155',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#334155',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  // Màu ghế
  seatAvailable: '#64748B',
  seatSelected: '#E11D48',
  seatBooked: '#1E293B',
  seatVIP: '#F59E0B',
  seatCouple: '#EC4899',
  seatSweetbox: '#A855F7',
  seatDisabled: '#475569',
};

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32,
};

export const fontSize = {
  xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 24, xxxl: 32,
};

export const radius = { sm: 4, md: 8, lg: 12, xl: 16, xxl: 24 };

export const formatCurrency = (n) => {
  if (n == null) return '';
  return Number(n).toLocaleString('vi-VN') + 'đ';
};

export const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
};

export const formatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
};

export const formatDateTime = (iso) => {
  if (!iso) return '';
  return formatDate(iso) + ' ' + formatTime(iso);
};

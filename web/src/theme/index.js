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

export const formatDateTime = (iso) =>
  iso ? `${formatDate(iso)} ${formatTime(iso)}` : '';

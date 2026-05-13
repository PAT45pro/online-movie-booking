// Mã đặt vé: BK + YYYYMMDD + 5 chữ số ngẫu nhiên
exports.genBookingCode = () => {
  const d = new Date();
  const ymd = d.getFullYear().toString()
           + String(d.getMonth() + 1).padStart(2, '0')
           + String(d.getDate()).padStart(2, '0');
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `BK${ymd}${rand}`;
};

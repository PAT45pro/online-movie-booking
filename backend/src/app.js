const express = require('express');
const cors = require('cors');
require('dotenv').config();

const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Middlewares chung
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log request đơn giản
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.get('/', (req, res) => res.json({ message: 'Cinema Booking API — đang chạy', version: '1.0.0' }));
app.use('/api', routes);

// 404
app.use((req, res) => res.status(404).json({ message: 'Không tìm thấy endpoint' }));

// Error handler (luôn để sau cùng)
app.use(errorHandler);

// ====== Scheduled job: dọn đơn hết hạn ======
const db = require('./config/db');
setInterval(async () => {
  try {
    const [r] = await db.query(`
      UPDATE bookings SET status = 'expired'
      WHERE status IN ('pending','awaiting_payment')
        AND expired_at < NOW()
    `);
    if (r.affectedRows) console.log(`⏱ Đã hủy ${r.affectedRows} đơn hết hạn`);
  } catch (e) {
    console.error('Lỗi job dọn đơn:', e.message);
  }
}, 60 * 1000);  // mỗi phút

module.exports = app;

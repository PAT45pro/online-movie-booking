const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cinema_booking',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  timezone: '+07:00',
});

// Kiểm tra kết nối khi khởi động
pool.getConnection()
  .then(conn => {
    console.log('✔ Đã kết nối MySQL:', process.env.DB_NAME);
    conn.release();
  })
  .catch(err => {
    console.error('✘ Lỗi kết nối MySQL:', err.message);
  });

module.exports = pool;

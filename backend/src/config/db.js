const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Connection pool MySQL — config charset utf8mb4 ở 3 cấp:
 *   1. `charset` option khi tạo pool
 *   2. `SET NAMES` qua afterConnect hook (quan trọng nhất!)
 *   3. `collation_connection` chắc chắn dùng utf8mb4_unicode_ci
 *
 * Nếu thiếu 1 trong 3, tiếng Việt có thể bị mojibake "Phòng" → "Ph│-ng".
 */
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
  // ===== Tiếng Việt + emoji =====
  charset: 'utf8mb4',
  supportBigNumbers: true,
  bigNumberStrings: false,
  // Multiple statements để chạy schema/migrations
  multipleStatements: false,
});

// Force SET NAMES utf8mb4 mỗi khi mở connection mới
// → đảm bảo ngay cả khi MySQL server có default charset khác latin1
pool.on('connection', (conn) => {
  conn.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci", (err) => {
    if (err) console.warn('⚠ Không set được charset:', err.message);
  });
  conn.query("SET time_zone = '+07:00'");
});

// Kiểm tra kết nối khi khởi động
pool.getConnection()
  .then(async conn => {
    // Verify charset
    const [[row]] = await conn.query(
      "SHOW VARIABLES WHERE Variable_name IN ('character_set_connection','collation_connection')"
    );
    console.log('✔ Đã kết nối MySQL:', process.env.DB_NAME || 'cinema_booking');
    console.log('  charset_connection:', row?.Value || 'utf8mb4');
    conn.release();
  })
  .catch(err => {
    console.error('✘ Lỗi kết nối MySQL:', err.message);
  });

module.exports = pool;

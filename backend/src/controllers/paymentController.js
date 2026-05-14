const db = require('../config/db');
const { asyncHandler, httpError } = require('../middleware/errorHandler');

// GET /api/payments/methods
exports.listMethods = asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    'SELECT * FROM payment_methods WHERE is_active = 1 ORDER BY display_order'
  );
  res.json(rows);
});

// POST /api/payments
// body: { booking_id, method_code }
// GHI CHÚ: trong dự án thực, bước này sẽ gọi SDK của VNPay/MoMo và redirect.
// Ở đây mock: tự động đánh dấu thành công sau 1s.
exports.pay = asyncHandler(async (req, res) => {
  const { booking_id, method_code } = req.body;
  const userId = req.user.user_id;

  const [[booking]] = await db.query(
    'SELECT * FROM bookings WHERE booking_id = ? AND user_id = ?',
    [booking_id, userId]);
  if (!booking) throw httpError(404, 'Không tìm thấy đơn');
  if (booking.status !== 'pending' && booking.status !== 'awaiting_payment') {
    throw httpError(400, `Đơn đang ở trạng thái ${booking.status}, không thể thanh toán`);
  }
  if (new Date(booking.expired_at) < new Date()) {
    throw httpError(400, 'Đơn đã hết hạn giữ chỗ');
  }

  const [[method]] = await db.query(
    'SELECT * FROM payment_methods WHERE code = ? AND is_active = 1',
    [method_code]);
  if (!method) throw httpError(400, 'Phương thức thanh toán không hợp lệ');

  // Mô phỏng giao dịch thanh toán thành công
  const transactionId = 'MOCK-' + Date.now();

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Tạo payment
    await conn.query(`
      INSERT INTO payments (booking_id, method_id, amount, transaction_id, status, completed_at)
      VALUES (?, ?, ?, ?, 'success', NOW())`,
      [booking_id, method.method_id, booking.final_amount, transactionId]);

    // Cập nhật booking
    await conn.query(`
      UPDATE bookings
      SET status = 'paid',
          paid_at = NOW(),
          qr_code = CONCAT('TICKET-', booking_code),
          points_earned = FLOOR(final_amount / 10000)
      WHERE booking_id = ?`, [booking_id]);

    // Cộng điểm cho user
    const earned = Math.floor(parseFloat(booking.final_amount) / 10000);
    await conn.query(
      'UPDATE users SET loyalty_points = loyalty_points + ? WHERE user_id = ?',
      [earned, userId]);

    // Nếu có coupon → log usage + tăng used_count
    if (booking.coupon_id) {
      await conn.query(`
        INSERT INTO coupon_usages (coupon_id, user_id, booking_id, discount_amount)
        VALUES (?, ?, ?, ?)`,
        [booking.coupon_id, userId, booking_id, booking.discount_amount]);
      await conn.query(
        'UPDATE coupons SET used_count = used_count + 1 WHERE coupon_id = ?',
        [booking.coupon_id]);
    }

    await conn.commit();
    res.json({
      message: 'Thanh toán thành công',
      transaction_id: transactionId,
      booking_status: 'paid',
      points_earned: earned,
    });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
});

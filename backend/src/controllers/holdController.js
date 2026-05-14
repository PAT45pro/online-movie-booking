const db = require('../config/db');
const { asyncHandler, httpError } = require('../middleware/errorHandler');
const crypto = require('crypto');

const HOLD_MINUTES = parseInt(process.env.HOLD_MINUTES || '8', 10);

/**
 * TẠO HOLD - giữ ghế tạm thời (thay thế Redis SETNX)
 *
 * POST /api/showtimes/:id/holds
 * Body: { seat_ids: [1, 2, 3] }
 * Returns: { session_id, holds: [...], expires_at }
 *
 * Cơ chế: dùng MySQL UNIQUE(showtime_id, seat_id) để chống double-hold.
 * Nếu 2 user cùng INSERT 1 ghế → 1 thành công, 1 nhận lỗi 1062 → 409 Conflict.
 * Sau HOLD_MINUTES phút, cron job tự xóa hold quá hạn để giải phóng ghế.
 */
exports.createHolds = asyncHandler(async (req, res) => {
  const showtimeId = parseInt(req.params.id, 10);
  const { seat_ids } = req.body;
  const userId = req.user.user_id;

  if (!Array.isArray(seat_ids) || seat_ids.length === 0) {
    throw httpError(400, 'Phải chọn ít nhất 1 ghế');
  }
  if (seat_ids.length > 8) {
    throw httpError(400, 'Tối đa 8 ghế mỗi đơn');
  }

  // Verify showtime tồn tại và còn bán vé
  const [[show]] = await db.query(
    'SELECT showtime_id, status, start_time FROM showtimes WHERE showtime_id = ?',
    [showtimeId]);
  if (!show) throw httpError(404, 'Suất chiếu không tồn tại');
  if (!['scheduled', 'on_sale'].includes(show.status)) {
    throw httpError(400, 'Suất chiếu không bán vé');
  }
  if (new Date(show.start_time) <= new Date()) {
    throw httpError(400, 'Suất chiếu đã bắt đầu');
  }

  // Sinh session_id để nhóm các ghế cùng phiên hold
  const sessionId = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Trước tiên, dọn dẹp các hold đã expired của chính ghế này (defensive)
    await conn.query(
      `DELETE FROM seat_holds
       WHERE showtime_id = ? AND seat_id IN (?) AND expires_at <= NOW()`,
      [showtimeId, seat_ids]);

    // Check ghế đã có booking paid hoặc booking_seats reference chưa
    const [bookedRows] = await conn.query(
      `SELECT bs.seat_id FROM booking_seats bs
       JOIN bookings b ON bs.booking_id = b.booking_id
       WHERE b.showtime_id = ? AND bs.seat_id IN (?)
         AND b.status IN ('paid','used','awaiting_payment','pending')
         AND (b.expired_at IS NULL OR b.expired_at > NOW() OR b.status IN ('paid','used'))`,
      [showtimeId, seat_ids]);
    if (bookedRows.length > 0) {
      await conn.rollback();
      throw httpError(409, `Ghế đã được đặt: ${bookedRows.map(r => r.seat_id).join(', ')}`);
    }

    // Verify các seat thuộc room của showtime này
    const [validSeats] = await conn.query(
      `SELECT s.seat_id, s.row_label, s.column_number, s.seat_code, s.seat_type_id
       FROM seats s
       JOIN showtimes sh ON s.room_id = sh.room_id
       WHERE sh.showtime_id = ? AND s.seat_id IN (?) AND s.is_active = 1`,
      [showtimeId, seat_ids]);
    if (validSeats.length !== seat_ids.length) {
      await conn.rollback();
      throw httpError(400, 'Một số ghế không thuộc phòng này');
    }

    // INSERT các hold - dựa vào UNIQUE constraint để chống race condition
    const inserted = [];
    for (const seatId of seat_ids) {
      try {
        const [r] = await conn.query(
          `INSERT INTO seat_holds (showtime_id, seat_id, user_id, session_id, expires_at)
           VALUES (?, ?, ?, ?, ?)`,
          [showtimeId, seatId, userId, sessionId, expiresAt]);
        inserted.push({ hold_id: r.insertId, seat_id: seatId });
      } catch (err) {
        // ER_DUP_ENTRY = 1062 → ghế đang bị user khác giữ
        if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
          await conn.rollback();
          throw httpError(409,
            `Ghế ${seatId} vừa được người khác giữ. Vui lòng chọn ghế khác.`);
        }
        throw err;
      }
    }

    await conn.commit();

    res.status(201).json({
      session_id: sessionId,
      expires_at: expiresAt.toISOString(),
      hold_minutes: HOLD_MINUTES,
      holds: inserted,
      seats: validSeats,
    });
  } catch (err) {
    try { await conn.rollback(); } catch (e) {}
    throw err;
  } finally {
    conn.release();
  }
});

/**
 * GET /api/showtimes/:id/holds  - Lấy holds đang active của user hiện tại cho suất này
 */
exports.getMyHolds = asyncHandler(async (req, res) => {
  const showtimeId = parseInt(req.params.id, 10);
  const userId = req.user.user_id;

  const [holds] = await db.query(
    `SELECT h.hold_id, h.seat_id, h.session_id, h.expires_at,
            s.seat_code, s.row_label, s.column_number
     FROM seat_holds h
     JOIN seats s ON h.seat_id = s.seat_id
     WHERE h.showtime_id = ? AND h.user_id = ? AND h.expires_at > NOW()
     ORDER BY s.row_label, s.column_number`,
    [showtimeId, userId]);

  res.json({ holds });
});

/**
 * DELETE /api/showtimes/:id/holds/:session_id  - Bỏ giữ ghế (user đổi ý)
 */
exports.releaseHolds = asyncHandler(async (req, res) => {
  const showtimeId = parseInt(req.params.id, 10);
  const { session_id } = req.params;
  const userId = req.user.user_id;

  const [result] = await db.query(
    `DELETE FROM seat_holds
     WHERE showtime_id = ? AND session_id = ? AND user_id = ?`,
    [showtimeId, session_id, userId]);

  res.json({ released: result.affectedRows });
});

/**
 * CRON - chạy mỗi 60 giây, xóa các hold đã expired
 * Đây là MySQL-equivalent của Redis TTL.
 */
exports.cleanupExpiredHolds = async () => {
  try {
    const [result] = await db.query(
      'DELETE FROM seat_holds WHERE expires_at <= NOW()');
    if (result.affectedRows > 0) {
      console.log(`[HOLD-CLEANUP] Released ${result.affectedRows} expired holds`);
    }
  } catch (err) {
    console.error('[HOLD-CLEANUP] Error:', err.message);
  }
};

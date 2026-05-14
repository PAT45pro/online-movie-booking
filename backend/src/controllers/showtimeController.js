const db = require('../config/db');
const { asyncHandler, httpError } = require('../middleware/errorHandler');
const { calculateSeatPrice } = require('../services/priceCalculator');

// GET /api/showtimes/:id
exports.showtimeDetail = asyncHandler(async (req, res) => {
  const [[show]] = await db.query(`
    SELECT s.*, m.title AS movie_title, m.duration_minutes, m.poster_url, m.age_rating, m.language,
           r.room_name, rt.code AS room_type_code, rt.name AS room_type_name,
           rt.price_multiplier AS room_multiplier, rt.extra_fee,
           c.cinema_id, c.name AS cinema_name, c.address, c.city
    FROM showtimes s
    JOIN movies m      ON s.movie_id = m.movie_id
    JOIN rooms r       ON s.room_id = r.room_id
    JOIN room_types rt ON r.room_type_id = rt.room_type_id
    JOIN cinemas c     ON r.cinema_id = c.cinema_id
    WHERE s.showtime_id = ?`,
    [req.params.id]);
  if (!show) throw httpError(404, 'Không tìm thấy suất chiếu');
  res.json(show);
});

// GET /api/showtimes/:id/seats — trả về layout JSON + 4 trạng thái ghế
//     Response: { layout: {rows, cols, cells}, seats: [...], booked_ids, held_ids }
//     Cells trong layout có status: AVAILABLE | HELD | BOOKED (FE merge với SELECTED khi user click)
exports.showtimeSeats = asyncHandler(async (req, res) => {
  const showtimeId = req.params.id;
  const userId = req.user?.user_id;  // optional auth

  // Lấy showtime + room (kèm layout_json)
  const [[show]] = await db.query(
    `SELECT sh.showtime_id, sh.room_id, r.layout_json,
            r.total_rows, r.total_columns, r.total_seats, r.room_name
     FROM showtimes sh
     JOIN rooms r ON sh.room_id = r.room_id
     WHERE sh.showtime_id = ?`, [showtimeId]);
  if (!show) throw httpError(404, 'Không tìm thấy suất chiếu');

  // Parse layout JSON nếu có  — fallback về seats table 
  let layout = null;
  if (show.layout_json) {
    try { layout = JSON.parse(show.layout_json); }
    catch (e) { console.error('Invalid layout_json:', e); }
  }

  // Lấy tất cả ghế của phòng (luôn cần vì price tính theo seat_id)
  const [seats] = await db.query(`
    SELECT se.seat_id, se.seat_code, se.row_label, se.column_number,
           st.code AS seat_type_code, st.name AS seat_type_name,
           st.capacity, st.color_code, st.price_multiplier
    FROM seats se JOIN seat_types st ON se.seat_type_id = st.seat_type_id
    WHERE se.room_id = ? AND se.is_active = 1
    ORDER BY se.row_label, se.column_number`,
    [show.room_id]);

  // Lấy ghế đã BOOKED (paid/used + booking pending còn hạn)
  const [bookedRows] = await db.query(`
    SELECT bs.seat_id FROM booking_seats bs
    JOIN bookings b ON bs.booking_id = b.booking_id
    WHERE b.showtime_id = ?
      AND b.status IN ('pending','awaiting_payment','paid','used')
      AND (b.expired_at IS NULL OR b.expired_at > NOW() OR b.status IN ('paid','used'))`,
    [showtimeId]);
  const bookedIds = new Set(bookedRows.map(r => r.seat_id));

  // Lấy ghế đang HELD (bị user khác giữ tạm, hold chưa hết hạn)
  const [heldRows] = await db.query(`
    SELECT seat_id, user_id FROM seat_holds
    WHERE showtime_id = ? AND expires_at > NOW()`,
    [showtimeId]);
  const heldByOthers = new Set();
  const heldByMe = new Set();
  heldRows.forEach(r => {
    if (userId && r.user_id === userId) heldByMe.add(r.seat_id);
    else heldByOthers.add(r.seat_id);
  });

  // Tính giá + xác định status cho từng ghế
  const seatsWithStatus = await Promise.all(seats.map(async s => {
    let status = 'available';
    if (bookedIds.has(s.seat_id)) status = 'booked';
    else if (heldByOthers.has(s.seat_id)) status = 'held';
    else if (heldByMe.has(s.seat_id)) status = 'held_by_me';

    return {
      ...s,
      price: await calculateSeatPrice(showtimeId, s.seat_id),
      status,
    };
  }));

  res.json({
    showtime_id: parseInt(showtimeId, 10),
    room_id: show.room_id,
    room_name: show.room_name,
    layout: layout || {
      // Fallback: build layout từ seats table
      rows: show.total_rows,
      cols: show.total_columns,
      cells: null,
    },
    seats: seatsWithStatus,
    booked_count: bookedIds.size,
    held_count: heldByOthers.size + heldByMe.size,
    available_count: seats.length - bookedIds.size - heldByOthers.size - heldByMe.size,
  });
});

// PATCH /api/showtimes/:id/cancel  — CHỈ ADMIN
// Khi rạp hủy suất chiếu (sự cố máy chiếu, hỏa hoạn, lockdown...)
// Tự động hoàn tiền cho TẤT CẢ khách đã thanh toán
exports.cancelShowtime = asyncHandler(async (req, res) => {
  // Chỉ admin được hủy
  if (req.user.role !== 'admin') {
    throw httpError(403, 'Chỉ quản trị viên mới có quyền hủy suất chiếu');
  }

  const showtimeId = req.params.id;
  const { reason } = req.body;
  if (!reason || reason.trim().length < 10) {
    throw httpError(400, 'Phải nhập lý do hủy chi tiết (≥10 ký tự)');
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Kiểm tra suất chiếu tồn tại và chưa diễn ra
    const [[show]] = await conn.query(
      'SELECT * FROM showtimes WHERE showtime_id = ? FOR UPDATE',
      [showtimeId]);
    if (!show) throw httpError(404, 'Không tìm thấy suất chiếu');
    if (show.status === 'cancelled') {
      throw httpError(400, 'Suất chiếu đã bị hủy trước đó');
    }
    if (show.status === 'finished') {
      throw httpError(400, 'Suất chiếu đã kết thúc, không thể hủy');
    }

    // 1. Đánh dấu suất chiếu cancelled
    await conn.query(
      'UPDATE showtimes SET status = ? WHERE showtime_id = ?',
      ['cancelled', showtimeId]);

    // 2. Lấy danh sách bookings đã thanh toán của suất này
    const [paidBookings] = await conn.query(
      `SELECT b.booking_id, b.user_id, b.final_amount, b.booking_code, u.email, u.full_name
       FROM bookings b JOIN users u ON b.user_id = u.user_id
       WHERE b.showtime_id = ? AND b.status = 'paid'`,
      [showtimeId]);

    // 3. Hoàn tiền cho từng booking
    for (const booking of paidBookings) {
      // Cập nhật booking: chuyển status sang refunded_by_cinema
      await conn.query(
        `UPDATE bookings SET
           status = 'refunded_by_cinema',
           refunded_at = NOW(),
           refund_reason = ?
         WHERE booking_id = ?`,
        [reason, booking.booking_id]);

      // Cập nhật payment: hoàn 100%
      await conn.query(
        `UPDATE payments SET
           status = 'refunded',
           refunded_at = NOW(),
           refund_amount = ?
         WHERE booking_id = ?`,
        [booking.final_amount, booking.booking_id]);

      // (Trong production: gọi API refund của cổng thanh toán)
      // (Trong production: gửi email thông báo cho khách)
      console.log(`[REFUND] Booking ${booking.booking_code} -> ${booking.email}: ${booking.final_amount}đ`);
    }

    // 4. Hủy luôn các booking pending/awaiting_payment (không cần refund vì chưa thanh toán)
    await conn.query(
      `UPDATE bookings SET status = 'expired'
       WHERE showtime_id = ? AND status IN ('pending', 'awaiting_payment')`,
      [showtimeId]);

    await conn.commit();

    res.json({
      message: 'Đã hủy suất chiếu và hoàn tiền cho khách',
      cancelled_showtime_id: showtimeId,
      reason,
      refunded_bookings: paidBookings.length,
      total_refund_amount: paidBookings.reduce((sum, b) => sum + Number(b.final_amount), 0),
    });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

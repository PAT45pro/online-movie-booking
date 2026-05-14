const db = require('../config/db');
const { asyncHandler, httpError } = require('../middleware/errorHandler');
const { calculateSeatPrice, applyCoupon } = require('../services/priceCalculator');
const { genBookingCode } = require('../utils/bookingCode');

// POST /api/bookings      { showtime_id, seat_ids: [1,2], coupon_code? }
// Tạo đơn tạm (status = pending, expired_at = now + 10 phút) và khóa ghế
exports.createBooking = asyncHandler(async (req, res) => {
  const { showtime_id, seat_ids, coupon_code } = req.body;
  const userId = req.user.user_id;
  const holdMinutes = parseInt(process.env.HOLD_MINUTES || '10', 10);

  if (!showtime_id || !Array.isArray(seat_ids) || seat_ids.length === 0) {
    throw httpError(400, 'Thiếu thông tin suất chiếu/ghế');
  }
  if (seat_ids.length > 8) {
    throw httpError(400, 'Chỉ được đặt tối đa 8 ghế mỗi đơn');
  }

  // ===== VALIDATE GAP: không cho phép để ghế đơn lẻ ở giữa =====
  // Lấy thông tin tất cả ghế của suất chiếu để check gap
  const [allSeatsOfShow] = await db.query(`
    SELECT se.seat_id, se.row_label, se.column_number, se.seat_type_id
    FROM seats se
    JOIN showtimes sh ON se.room_id = sh.room_id
    WHERE sh.showtime_id = ? AND se.is_active = 1`,
    [showtime_id]);

  // Lấy danh sách ghế đã bị giữ bởi đơn khác (paid/used hoặc pending còn hạn)
  const [bookedRows] = await db.query(`
    SELECT bs.seat_id FROM booking_seats bs
    JOIN bookings b ON bs.booking_id = b.booking_id
    WHERE b.showtime_id = ?
      AND b.status IN ('pending','awaiting_payment','paid','used')
      AND (b.expired_at IS NULL OR b.expired_at > NOW() OR b.status IN ('paid','used'))`,
    [showtime_id]);
  const bookedSet = new Set(bookedRows.map(r => r.seat_id));

  // Tập hợp seat_ids khách đang chọn + đã bị đặt
  const proposedSet = new Set([...seat_ids, ...bookedSet]);

  // Group ghế theo row
  const rowMap = {};
  allSeatsOfShow.forEach(s => {
    (rowMap[s.row_label] = rowMap[s.row_label] || []).push(s);
  });
  Object.keys(rowMap).forEach(row =>
    rowMap[row].sort((a, b) => a.column_number - b.column_number));

  // Tìm gap: ghế chưa chọn mà 2 ghế kề (cột chênh ≤ 1) đều đã bị chiếm
  const gapSeats = [];
  for (const row of Object.keys(rowMap)) {
    const rowSeats = rowMap[row];
    for (let i = 0; i < rowSeats.length; i++) {
      const seat = rowSeats[i];
      if (proposedSet.has(seat.seat_id)) continue;  // đã được chọn → không tính
      const left = rowSeats[i - 1];
      const right = rowSeats[i + 1];
      if (!left || !right) continue;
      // Chỉ tính khi cả 2 ghế kề LIỀN cột (chênh ≤ 1) - qua lối đi không tính gap
      if (right.column_number - seat.column_number > 1) continue;
      if (seat.column_number - left.column_number > 1) continue;
      // 2 ghế kề đều đã bị chiếm → ghế này là gap
      if (proposedSet.has(left.seat_id) && proposedSet.has(right.seat_id)) {
        gapSeats.push(`${seat.row_label}${seat.column_number}`);
      }
    }
  }
  if (gapSeats.length > 0) {
    throw httpError(400,
      `Không được để trống ghế ở giữa các ghế đã chọn: ${gapSeats.join(', ')}. ` +
      `Vui lòng chọn ngồi liền kề hoặc chọn thêm các ghế bị kẹt.`);
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // LOCK các hàng ghế của suất này (race condition safe)
    const [clash] = await conn.query(`
      SELECT bs.seat_id FROM booking_seats bs
      JOIN bookings b ON bs.booking_id = b.booking_id
      WHERE b.showtime_id = ? AND bs.seat_id IN (?)
        AND b.status IN ('pending','awaiting_payment','paid','used')
        AND (b.expired_at IS NULL OR b.expired_at > NOW() OR b.status IN ('paid','used'))
      FOR UPDATE`,
      [showtime_id, seat_ids]);

    if (clash.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        message: 'Một số ghế đã được người khác đặt',
        conflictedSeats: clash.map(c => c.seat_id),
      });
    }

    // Tính giá từng ghế
    let subtotal = 0;
    const seatPrices = [];
    for (const seatId of seat_ids) {
      const price = await calculateSeatPrice(showtime_id, seatId);
      seatPrices.push({ seat_id: seatId, price });
      subtotal += price;
    }

    // Áp coupon (nếu có)
    let discount = 0;
    let couponId = null;
    if (coupon_code) {
      const result = await applyCoupon({
        couponCode: coupon_code, userId, subtotal, showtimeId: showtime_id,
      });
      discount = result.discount;
      couponId = result.coupon.coupon_id;
    }

    const serviceFee = 0;
    const finalAmount = subtotal - discount + serviceFee;
    const bookingCode = genBookingCode();
    const expiredAt = new Date(Date.now() + holdMinutes * 60 * 1000);

    // Insert booking
    const [bres] = await conn.query(`
      INSERT INTO bookings
        (booking_code, user_id, showtime_id, coupon_id,
         subtotal, discount_amount, service_fee, final_amount, status, expired_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [bookingCode, userId, showtime_id, couponId,
       subtotal, discount, serviceFee, finalAmount, expiredAt]);

    const bookingId = bres.insertId;

    // Insert booking_seats
    for (const { seat_id, price } of seatPrices) {
      await conn.query(
        'INSERT INTO booking_seats (booking_id, seat_id, seat_price) VALUES (?, ?, ?)',
        [bookingId, seat_id, price]);
    }

    await conn.commit();
    res.status(201).json({
      booking_id: bookingId,
      booking_code: bookingCode,
      subtotal, discount_amount: discount, final_amount: finalAmount,
      expired_at: expiredAt,
      status: 'pending',
      hold_minutes: holdMinutes,
    });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
});

// GET /api/bookings/mine
exports.myBookings = asyncHandler(async (req, res) => {
  const [rows] = await db.query(`
    SELECT b.booking_id, b.booking_code, b.status, b.final_amount, b.qr_code,
           b.created_at, b.paid_at, b.expired_at,
           s.start_time, m.title AS movie_title, m.poster_url, m.duration_minutes,
           r.room_name, rt.name AS room_type_name,
           c.name AS cinema_name, c.address
    FROM bookings b
    JOIN showtimes s   ON b.showtime_id = s.showtime_id
    JOIN movies m      ON s.movie_id = m.movie_id
    JOIN rooms r       ON s.room_id = r.room_id
    JOIN room_types rt ON r.room_type_id = rt.room_type_id
    JOIN cinemas c     ON r.cinema_id = c.cinema_id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC`,
    [req.user.user_id]);
  res.json(rows);
});

// GET /api/bookings/:id
exports.bookingDetail = asyncHandler(async (req, res) => {
  const [[booking]] = await db.query(`
    SELECT b.*, s.start_time, s.end_time,
           m.title AS movie_title, m.poster_url, m.duration_minutes, m.age_rating,
           r.room_name, rt.name AS room_type_name,
           c.name AS cinema_name, c.address
    FROM bookings b
    JOIN showtimes s   ON b.showtime_id = s.showtime_id
    JOIN movies m      ON s.movie_id = m.movie_id
    JOIN rooms r       ON s.room_id = r.room_id
    JOIN room_types rt ON r.room_type_id = rt.room_type_id
    JOIN cinemas c     ON r.cinema_id = c.cinema_id
    WHERE b.booking_id = ? AND b.user_id = ?`,
    [req.params.id, req.user.user_id]);
  if (!booking) throw httpError(404, 'Không tìm thấy đơn');

  const [seats] = await db.query(`
    SELECT bs.seat_id, bs.seat_price, se.seat_code, se.row_label, se.column_number,
           st.name AS seat_type_name
    FROM booking_seats bs
    JOIN seats se JOIN seat_types st ON se.seat_type_id = st.seat_type_id
    ON bs.seat_id = se.seat_id
    WHERE bs.booking_id = ?
    ORDER BY se.row_label, se.column_number`,
    [req.params.id]);

  res.json({ ...booking, seats });
});

// POST /api/bookings/from-hold
// Convert một session hold thành booking pending (tới bước thanh toán).
// Body: { session_id, coupon_code? }
// Khác với createBooking cũ: không cần truyền seat_ids, lấy từ seat_holds.
exports.createFromHold = asyncHandler(async (req, res) => {
  const { session_id, coupon_code } = req.body;
  const userId = req.user.user_id;
  const bookingExpireMinutes = parseInt(process.env.BOOKING_EXPIRE_MINUTES || '10', 10);

  if (!session_id) throw httpError(400, 'Thiếu session_id của hold');

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Verify hold session tồn tại + còn hạn + thuộc về user
    const [holds] = await conn.query(
      `SELECT h.*, s.row_label, s.column_number
       FROM seat_holds h
       JOIN seats s ON h.seat_id = s.seat_id
       WHERE h.session_id = ? AND h.user_id = ? AND h.expires_at > NOW()
       ORDER BY s.row_label, s.column_number
       FOR UPDATE`,
      [session_id, userId]);
    if (holds.length === 0) {
      throw httpError(410, 'Phiên giữ ghế đã hết hạn hoặc không tồn tại');
    }

    const showtimeId = holds[0].showtime_id;
    const seatIds = holds.map(h => h.seat_id);

    // 2. Verify ghế chưa bị book (defense in depth)
    const [bookedClash] = await conn.query(
      `SELECT bs.seat_id FROM booking_seats bs
       JOIN bookings b ON bs.booking_id = b.booking_id
       WHERE b.showtime_id = ? AND bs.seat_id IN (?)
         AND b.status IN ('paid','used','pending','awaiting_payment')
         AND (b.expired_at IS NULL OR b.expired_at > NOW() OR b.status IN ('paid','used'))`,
      [showtimeId, seatIds]);
    if (bookedClash.length > 0) {
      throw httpError(409, 'Ghế đã được người khác đặt');
    }

    // 3. Tính giá từng ghế
    let subtotal = 0;
    const seatPrices = [];
    for (const h of holds) {
      const price = await calculateSeatPrice(showtimeId, h.seat_id);
      seatPrices.push({ seat_id: h.seat_id, price });
      subtotal += price;
    }

    // 4. Áp coupon (nếu có)
    let discount = 0, couponId = null;
    if (coupon_code) {
      const couponRes = await applyCoupon(coupon_code, subtotal, userId);
      discount = couponRes.discount;
      couponId = couponRes.coupon_id;
    }
    const finalAmount = Math.max(0, subtotal - discount);

    // 5. Tạo booking với status pending + expired_at
    const bookingCode = genBookingCode();
    const expiredAt = new Date(Date.now() + bookingExpireMinutes * 60 * 1000);
    const [bookingResult] = await conn.query(
      `INSERT INTO bookings (booking_code, user_id, showtime_id, coupon_id,
                              subtotal, discount_amount, final_amount,
                              status, expired_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [bookingCode, userId, showtimeId, couponId,
       subtotal, discount, finalAmount, expiredAt]);
    const bookingId = bookingResult.insertId;

    // 6. INSERT booking_seats
    for (const sp of seatPrices) {
      await conn.query(
        `INSERT INTO booking_seats (booking_id, seat_id, seat_price)
         VALUES (?, ?, ?)`,
        [bookingId, sp.seat_id, sp.price]);
    }

    // 7. Xóa hold (đã chuyển thành booking)
    await conn.query(
      'DELETE FROM seat_holds WHERE session_id = ?', [session_id]);

    await conn.commit();

    res.status(201).json({
      booking_id: bookingId,
      booking_code: bookingCode,
      showtime_id: showtimeId,
      subtotal,
      discount_amount: discount,
      final_amount: finalAmount,
      expired_at: expiredAt.toISOString(),
      seats: holds.map(h => ({
        seat_id: h.seat_id,
        row_label: h.row_label,
        column_number: h.column_number,
      })),
    });
  } catch (err) {
    try { await conn.rollback(); } catch (e) {}
    throw err;
  } finally {
    conn.release();
  }
});

// NOTE: Hệ thống KHÔNG hỗ trợ khách tự hủy vé.
// Chỉ admin được hủy suất chiếu (force majeure) → tự động hoàn tiền 100%.


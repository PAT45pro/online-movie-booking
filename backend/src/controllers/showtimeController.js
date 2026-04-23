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

// GET /api/showtimes/:id/seats   — sơ đồ ghế kèm trạng thái & giá
exports.showtimeSeats = asyncHandler(async (req, res) => {
  const showtimeId = req.params.id;

  // Kiểm tra suất chiếu tồn tại
  const [[show]] = await db.query(
    'SELECT room_id FROM showtimes WHERE showtime_id = ?', [showtimeId]
  );
  if (!show) throw httpError(404, 'Không tìm thấy suất chiếu');

  // Lấy tất cả ghế của phòng
  const [seats] = await db.query(`
    SELECT se.seat_id, se.seat_code, se.row_label, se.column_number,
           st.code AS seat_type_code, st.name AS seat_type_name,
           st.capacity, st.color_code, st.price_multiplier
    FROM seats se JOIN seat_types st ON se.seat_type_id = st.seat_type_id
    WHERE se.room_id = ? AND se.is_active = 1
    ORDER BY se.row_label, se.column_number`,
    [show.room_id]);

  // Lấy danh sách ghế đã/đang bị giữ
  const [bookedRows] = await db.query(`
    SELECT bs.seat_id FROM booking_seats bs
    JOIN bookings b ON bs.booking_id = b.booking_id
    WHERE b.showtime_id = ?
      AND b.status IN ('pending','awaiting_payment','paid','used')
      AND (b.expired_at IS NULL OR b.expired_at > NOW() OR b.status IN ('paid','used'))`,
    [showtimeId]);
  const bookedIds = new Set(bookedRows.map(r => r.seat_id));

  // Tính giá cho từng ghế (gọi procedure/service; ở đây tính inline để ít query)
  const seatsWithPrice = await Promise.all(seats.map(async s => ({
    ...s,
    price: await calculateSeatPrice(showtimeId, s.seat_id),
    status: bookedIds.has(s.seat_id) ? 'booked' : 'available',
  })));

  res.json(seatsWithPrice);
});

const db = require('../config/db');

/**
 * Tính giá cuối của một ghế trong một suất chiếu.
 *   Giá cuối = base × HS phòng × HS ghế × HS ngày/giờ + phụ thu phòng
 * Logic:
 *  1. Lấy base_price, hệ số phòng, hệ số ghế.
 *  2. Kiểm tra ngày chiếu có phải ngày lễ → dùng hệ số lễ.
 *     Nếu không → tìm price_rules khớp theo mask thứ + khung giờ (priority cao nhất).
 *  3. Nhân các hệ số, cộng phụ thu phòng, làm tròn xuống 1.000đ.
 */
async function calculateSeatPrice(showtimeId, seatId) {
  const [[show]] = await db.query(`
    SELECT s.base_price, s.start_time,
           rt.price_multiplier AS room_mult, rt.extra_fee
    FROM showtimes s
    JOIN rooms r       ON s.room_id = r.room_id
    JOIN room_types rt ON r.room_type_id = rt.room_type_id
    WHERE s.showtime_id = ?
  `, [showtimeId]);
  if (!show) throw new Error('Không tìm thấy suất chiếu');

  const [[seat]] = await db.query(`
    SELECT st.price_multiplier AS seat_mult
    FROM seats se JOIN seat_types st ON se.seat_type_id = st.seat_type_id
    WHERE se.seat_id = ?
  `, [seatId]);
  if (!seat) throw new Error('Không tìm thấy ghế');

  const startTime = new Date(show.start_time);
  const dateStr   = startTime.toISOString().slice(0, 10);
  const hour      = startTime.getHours();
  const minute    = startTime.getMinutes();
  const timeStr   = String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0') + ':00';
  // WEEKDAY: T2=0, T3=1, ..., CN=6  → mask: T2=1<<0, T3=1<<1, ..., CN=1<<6
  const weekday   = (startTime.getDay() + 6) % 7;  // getDay: CN=0, T2=1...  → map: T2=0, CN=6
  const mask      = 1 << weekday;

  let dayMult = 1.0;

  // Ngày lễ?
  const [[holiday]] = await db.query(
    'SELECT price_multiplier FROM holidays WHERE holiday_date = ?',
    [dateStr]
  );
  if (holiday) {
    dayMult = parseFloat(holiday.price_multiplier);
  } else {
    const [[rule]] = await db.query(`
      SELECT price_multiplier FROM price_rules
      WHERE is_active = 1
        AND (day_of_week_mask IS NULL OR (day_of_week_mask & ?) > 0)
        AND (start_time IS NULL OR ? >= start_time)
        AND (end_time   IS NULL OR ? <  end_time)
      ORDER BY priority DESC LIMIT 1
    `, [mask, timeStr, timeStr]);
    if (rule) dayMult = parseFloat(rule.price_multiplier);
  }

  const base     = parseFloat(show.base_price);
  const roomMult = parseFloat(show.room_mult);
  const seatMult = parseFloat(seat.seat_mult);
  const extraFee = parseFloat(show.extra_fee) || 0;

  const price = base * roomMult * seatMult * dayMult + extraFee;
  // Làm tròn xuống 1.000đ
  return Math.floor(price / 1000) * 1000;
}

/**
 * Kiểm tra và tính toán giá trị giảm giá của coupon.
 * Trả về số tiền giảm (đã cap bằng max_discount nếu là percentage).
 * Throw lỗi nếu coupon không áp dụng được.
 */
async function applyCoupon({ couponCode, userId, subtotal, showtimeId }) {
  const [[coupon]] = await db.query(
    'SELECT * FROM coupons WHERE code = ? AND is_active = 1',
    [couponCode]
  );
  if (!coupon) throw new Error('Mã coupon không tồn tại hoặc đã ngừng sử dụng');

  const now = new Date();
  if (now < new Date(coupon.valid_from) || now > new Date(coupon.valid_to)) {
    throw new Error('Mã coupon đã hết hạn hoặc chưa có hiệu lực');
  }
  if (coupon.max_uses_total !== null && coupon.used_count >= coupon.max_uses_total) {
    throw new Error('Mã coupon đã hết lượt');
  }
  if (subtotal < parseFloat(coupon.min_order_value)) {
    throw new Error(`Đơn tối thiểu ${coupon.min_order_value}đ để áp dụng mã này`);
  }

  // Số lần dùng của user
  const [[usage]] = await db.query(
    'SELECT COUNT(*) AS n FROM coupon_usages WHERE coupon_id = ? AND user_id = ?',
    [coupon.coupon_id, userId]
  );
  if (usage.n >= coupon.max_uses_per_user) {
    throw new Error('Bạn đã hết lượt dùng mã này');
  }

  // Kiểm tra mask ngày (nếu có)
  if (coupon.applicable_days_mask !== null && showtimeId) {
    const [[show]] = await db.query('SELECT start_time FROM showtimes WHERE showtime_id = ?', [showtimeId]);
    const weekday = (new Date(show.start_time).getDay() + 6) % 7;
    if (((1 << weekday) & coupon.applicable_days_mask) === 0) {
      throw new Error('Mã không áp dụng cho ngày đã chọn');
    }
  }

  // Kiểm tra target_type đặc biệt
  if (coupon.target_type === 'u22' || coupon.target_type === 'birthday') {
    const [[user]] = await db.query('SELECT date_of_birth FROM users WHERE user_id = ?', [userId]);
    if (!user || !user.date_of_birth) {
      throw new Error('Cần cập nhật ngày sinh để dùng mã này');
    }
    if (coupon.target_type === 'u22') {
      const age = Math.floor((Date.now() - new Date(user.date_of_birth)) / (365.25 * 86400000));
      if (age >= 22) throw new Error('Mã này chỉ dành cho khách dưới 22 tuổi');
    }
    if (coupon.target_type === 'birthday') {
      const dob = new Date(user.date_of_birth);
      const diffDays = Math.abs((new Date().setFullYear(dob.getFullYear()) - dob) / 86400000);
      if (diffDays > 3) throw new Error('Mã chỉ áp dụng quanh ngày sinh nhật (±3 ngày)');
    }
  }

  // Tính số tiền giảm
  let discount;
  if (coupon.discount_type === 'percentage') {
    discount = (subtotal * parseFloat(coupon.discount_value)) / 100;
    if (coupon.max_discount) {
      discount = Math.min(discount, parseFloat(coupon.max_discount));
    }
  } else {
    discount = parseFloat(coupon.discount_value);
  }
  discount = Math.min(discount, subtotal); // không giảm quá tổng tiền

  return { coupon, discount: Math.round(discount) };
}

module.exports = { calculateSeatPrice, applyCoupon };

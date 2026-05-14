const db = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { applyCoupon } = require('../services/priceCalculator');

// GET /api/coupons   — các coupon đang hiệu lực (public)
exports.listActive = asyncHandler(async (req, res) => {
  const [rows] = await db.query(`
    SELECT coupon_id, code, name, description, discount_type, discount_value,
           max_discount, min_order_value, target_type, valid_from, valid_to
    FROM coupons
    WHERE is_active = 1 AND valid_from <= NOW() AND valid_to >= NOW()
      AND (max_uses_total IS NULL OR used_count < max_uses_total)
    ORDER BY discount_value DESC`);
  res.json(rows);
});

// POST /api/coupons/validate  { code, subtotal, showtime_id }
exports.validate = asyncHandler(async (req, res) => {
  const { code, subtotal, showtime_id } = req.body;
  try {
    const result = await applyCoupon({
      couponCode: code,
      userId: req.user.user_id,
      subtotal: parseFloat(subtotal) || 0,
      showtimeId: showtime_id,
    });
    res.json({
      valid: true,
      discount: result.discount,
      coupon_name: result.coupon.name,
      final_amount: (parseFloat(subtotal) || 0) - result.discount,
    });
  } catch (e) {
    res.status(400).json({ valid: false, message: e.message });
  }
});

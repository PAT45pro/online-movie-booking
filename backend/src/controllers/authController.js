const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { asyncHandler, httpError } = require('../middleware/errorHandler');

function signToken(user) {
  return jwt.sign(
    { user_id: user.user_id, email: user.email, role: user.role_name || 'customer' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const { email, password, full_name, phone, date_of_birth, gender } = req.body;
  if (!email || !password || !full_name) {
    throw httpError(400, 'Thiếu email/mật khẩu/họ tên');
  }

  // Kiểm tra trùng email
  const [[existing]] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
  if (existing) throw httpError(409, 'Email đã được sử dụng');

  const password_hash = await bcrypt.hash(password, 10);
  // role_id = 1 (customer), tier_id = 1 (Silver)
  const [result] = await db.query(
    `INSERT INTO users (email, password_hash, full_name, phone, date_of_birth, gender, role_id, tier_id)
     VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,
    [email, password_hash, full_name, phone || null, date_of_birth || null, gender || null]
  );

  const user = { user_id: result.insertId, email, role_name: 'customer' };
  const token = signToken(user);
  res.status(201).json({
    token,
    user: { user_id: user.user_id, email, full_name, role: 'customer' },
  });
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw httpError(400, 'Thiếu email/mật khẩu');

  const [[user]] = await db.query(
    `SELECT u.user_id, u.email, u.password_hash, u.full_name, u.is_active, r.role_name
     FROM users u JOIN roles r ON u.role_id = r.role_id
     WHERE u.email = ?`,
    [email]
  );
  if (!user) throw httpError(401, 'Email hoặc mật khẩu không đúng');
  if (!user.is_active) throw httpError(403, 'Tài khoản đã bị khóa');

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw httpError(401, 'Email hoặc mật khẩu không đúng');

  const token = signToken(user);
  res.json({
    token,
    user: {
      user_id: user.user_id,
      email: user.email,
      full_name: user.full_name,
      role: user.role_name,
    },
  });
});

// GET /api/auth/me
exports.me = asyncHandler(async (req, res) => {
  const [[user]] = await db.query(
    `SELECT u.user_id, u.email, u.phone, u.full_name, u.date_of_birth, u.gender,
            u.avatar_url, u.loyalty_points, u.email_verified,
            r.role_name, t.tier_name
     FROM users u
     JOIN roles r ON u.role_id = r.role_id
     LEFT JOIN membership_tiers t ON u.tier_id = t.tier_id
     WHERE u.user_id = ?`,
    [req.user.user_id]
  );
  if (!user) throw httpError(404, 'Không tìm thấy tài khoản');
  res.json(user);
});

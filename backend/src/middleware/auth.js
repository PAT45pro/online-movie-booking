const jwt = require('jsonwebtoken');

// Bắt buộc đăng nhập
exports.authRequired = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Chưa xác thực' });
  }
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Token không hợp lệ hoặc hết hạn' });
  }
};

// Chỉ admin
exports.adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ message: 'Chỉ quản trị viên mới có quyền' });
};

// Không bắt buộc - vẫn cho phép nhưng đính req.user nếu có token
exports.authOptional = (req, res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    } catch (e) { /* ignore */ }
  }
  next();
};

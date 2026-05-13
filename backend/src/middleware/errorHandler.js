// Wrap async function để catch lỗi tự động
exports.asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Middleware cuối cùng
exports.errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Lỗi máy chủ',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// Helper throw lỗi có status
exports.httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

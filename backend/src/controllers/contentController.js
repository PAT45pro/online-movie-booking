const db = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

// ---------- BANNERS ----------
exports.listBanners = asyncHandler(async (req, res) => {
  const [rows] = await db.query(`
    SELECT * FROM banners
    WHERE is_active = 1
      AND (start_date IS NULL OR start_date <= CURDATE())
      AND (end_date IS NULL OR end_date >= CURDATE())
    ORDER BY display_order, banner_id
    LIMIT 10`);
  res.json(rows);
});

// ---------- PROMOTIONS ----------
exports.listPromotions = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const params = [];
  let sql = `
    SELECT promotion_id, title, short_desc, image_url, category, coupon_code,
           valid_from, valid_to
    FROM promotions
    WHERE is_active = 1
      AND (valid_from IS NULL OR valid_from <= NOW())
      AND (valid_to IS NULL OR valid_to >= NOW())`;
  if (category) { sql += ' AND category = ?'; params.push(category); }
  sql += ' ORDER BY display_order, promotion_id LIMIT 20';

  const [rows] = await db.query(sql, params);
  res.json(rows);
});

exports.promotionDetail = asyncHandler(async (req, res) => {
  const [[row]] = await db.query(
    'SELECT * FROM promotions WHERE promotion_id = ? AND is_active = 1',
    [req.params.id]
  );
  if (!row) return res.status(404).json({ message: 'Không tìm thấy khuyến mãi' });
  res.json(row);
});

// ---------- NEWS ----------
exports.listNews = asyncHandler(async (req, res) => {
  const { category, limit } = req.query;
  const params = [];
  let sql = `
    SELECT news_id, title, slug, summary, thumbnail, author, category, published_at, view_count
    FROM news
    WHERE is_published = 1`;
  if (category) { sql += ' AND category = ?'; params.push(category); }
  sql += ' ORDER BY published_at DESC';
  if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit, 10)); }
  else { sql += ' LIMIT 20'; }

  const [rows] = await db.query(sql, params);
  res.json(rows);
});

exports.newsDetail = asyncHandler(async (req, res) => {
  const [[row]] = await db.query(
    'SELECT * FROM news WHERE news_id = ? AND is_published = 1',
    [req.params.id]
  );
  if (!row) return res.status(404).json({ message: 'Không tìm thấy bài viết' });

  // Tăng view count
  db.query('UPDATE news SET view_count = view_count + 1 WHERE news_id = ?', [req.params.id])
    .catch(() => {});

  res.json(row);
});

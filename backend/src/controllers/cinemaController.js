const db = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/cinemas?city=Hà Nội
exports.listCinemas = asyncHandler(async (req, res) => {
  const { city } = req.query;
  const params = [];
  let sql = 'SELECT * FROM cinemas WHERE is_active = 1';
  if (city) { sql += ' AND city = ?'; params.push(city); }
  sql += ' ORDER BY name';
  const [rows] = await db.query(sql, params);
  res.json(rows);
});

// GET /api/cinemas/cities  — danh sách thành phố có rạp
exports.listCities = asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    'SELECT DISTINCT city FROM cinemas WHERE is_active = 1 ORDER BY city'
  );
  res.json(rows.map(r => r.city));
});

// GET /api/cinemas/:id
exports.cinemaDetail = asyncHandler(async (req, res) => {
  const [[cinema]] = await db.query(
    'SELECT * FROM cinemas WHERE cinema_id = ?', [req.params.id]
  );
  if (!cinema) return res.status(404).json({ message: 'Không tìm thấy rạp' });

  const [rooms] = await db.query(`
    SELECT r.room_id, r.room_name, r.total_seats,
           rt.code AS room_type_code, rt.name AS room_type_name
    FROM rooms r JOIN room_types rt ON r.room_type_id = rt.room_type_id
    WHERE r.cinema_id = ? AND r.is_active = 1`,
    [req.params.id]);

  res.json({ ...cinema, rooms });
});

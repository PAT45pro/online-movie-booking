const db = require('../config/db');
const { asyncHandler, httpError } = require('../middleware/errorHandler');

// GET /api/movies?status=now_showing&search=...
exports.listMovies = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const params = [];
  let sql = `SELECT movie_id, title, original_title, duration_minutes, release_date,
                    poster_url, banner_url, trailer_url, age_rating,
                    rating_avg, rating_count, status, language, country
             FROM movies WHERE 1=1`;
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (search) { sql += ' AND title LIKE ?'; params.push('%' + search + '%'); }
  sql += ' ORDER BY release_date DESC LIMIT 100';

  const [rows] = await db.query(sql, params);
  res.json(rows);
});

// GET /api/movies/:id
exports.movieDetail = asyncHandler(async (req, res) => {
  const [[movie]] = await db.query(
    'SELECT * FROM movies WHERE movie_id = ?', [req.params.id]
  );
  if (!movie) throw httpError(404, 'Không tìm thấy phim');

  const [genres] = await db.query(`
    SELECT g.genre_id, g.name FROM genres g
    JOIN movie_genres mg ON g.genre_id = mg.genre_id
    WHERE mg.movie_id = ?`, [req.params.id]);

  const [actors] = await db.query(`
    SELECT a.actor_id, a.name, a.avatar_url, ma.character_name, ma.is_lead
    FROM actors a JOIN movie_actors ma ON a.actor_id = ma.actor_id
    WHERE ma.movie_id = ? ORDER BY ma.is_lead DESC`, [req.params.id]);

  res.json({ ...movie, genres, actors });
});

// GET /api/movies/:id/showtimes?date=2026-04-20&city=Hà Nội
exports.movieShowtimes = asyncHandler(async (req, res) => {
  const { date, city } = req.query;
  const params = [req.params.id];
  let sql = `
    SELECT s.showtime_id, s.start_time, s.end_time, s.base_price, s.language_option, s.status,
           r.room_name, rt.code AS room_type_code, rt.name AS room_type_name,
           rt.price_multiplier AS room_multiplier, rt.extra_fee,
           c.cinema_id, c.name AS cinema_name, c.address, c.city
    FROM showtimes s
    JOIN rooms r       ON s.room_id = r.room_id
    JOIN room_types rt ON r.room_type_id = rt.room_type_id
    JOIN cinemas c     ON r.cinema_id = c.cinema_id
    WHERE s.movie_id = ? AND s.status = 'on_sale' AND s.start_time > NOW()
  `;
  if (date) { sql += ' AND DATE(s.start_time) = ?'; params.push(date); }
  if (city) { sql += ' AND c.city = ?';             params.push(city); }
  sql += ' ORDER BY s.start_time';

  const [rows] = await db.query(sql, params);
  res.json(rows);
});

// GET /api/movies/:id/reviews
exports.movieReviews = asyncHandler(async (req, res) => {
  const [rows] = await db.query(`
    SELECT r.review_id, r.rating, r.comment, r.created_at,
           u.full_name, u.avatar_url
    FROM reviews r JOIN users u ON r.user_id = u.user_id
    WHERE r.movie_id = ? AND r.is_approved = 1
    ORDER BY r.created_at DESC LIMIT 50`,
    [req.params.id]);
  res.json(rows);
});

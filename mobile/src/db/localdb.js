/**
 * Local SQLite Database
 *
 * Lý do dùng SQLite thay AsyncStorage cho data phức tạp:
 *   - Schema có nhiều cột (vd: movies có 15+ trường)
 *   - Query có điều kiện (WHERE status='now_showing' AND rating > 8)
 *   - Cập nhật từng trường riêng (UPDATE WHERE id=?) thay vì rewrite cả object
 *   - Data lớn (cache 100+ phim) - SQLite scale tốt hơn AsyncStorage
 *
 * Schema:
 *   - movies_cache: cache list phim cho offline-first UX
 *   - cinemas_cache: cache rạp gần (kèm GPS)
 *   - favorites: phim user yêu thích
 *   - recent_views: lịch sử xem (để gợi ý)
 *   - draft_bookings: nháp đơn đặt vé khi mất kết nối
 *
 * Usage:
 *   import { localDb } from './db/localdb';
 *   await localDb.init();
 *   const movies = await localDb.getCachedMovies({ status: 'now_showing' });
 */
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'cinema_app.db';

let _db = null;

async function getDb() {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync(DB_NAME);
  }
  return _db;
}

// ===== INIT SCHEMA =====
async function init() {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS movies_cache (
      movie_id        INTEGER PRIMARY KEY,
      title           TEXT NOT NULL,
      original_title  TEXT,
      poster_url      TEXT,
      banner_url      TEXT,
      description     TEXT,
      duration_min    INTEGER,
      release_date    TEXT,
      director        TEXT,
      country         TEXT,
      language        TEXT,
      age_rating      TEXT,
      status          TEXT,
      rating_avg      REAL,
      rating_count    INTEGER,
      trailer_url     TEXT,
      cached_at       INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_movies_status ON movies_cache(status);
    CREATE INDEX IF NOT EXISTS idx_movies_rating ON movies_cache(rating_avg);

    CREATE TABLE IF NOT EXISTS cinemas_cache (
      cinema_id     INTEGER PRIMARY KEY,
      name          TEXT NOT NULL,
      address       TEXT,
      city          TEXT,
      latitude      REAL,
      longitude     REAL,
      logo_url      TEXT,
      phone         TEXT,
      cached_at     INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_cinemas_city ON cinemas_cache(city);

    CREATE TABLE IF NOT EXISTS favorites (
      user_id       INTEGER NOT NULL,
      movie_id      INTEGER NOT NULL,
      added_at      INTEGER NOT NULL,
      PRIMARY KEY (user_id, movie_id)
    );

    CREATE INDEX IF NOT EXISTS idx_fav_user ON favorites(user_id);

    CREATE TABLE IF NOT EXISTS recent_views (
      view_id       INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL,
      movie_id      INTEGER NOT NULL,
      viewed_at     INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_views_user ON recent_views(user_id, viewed_at DESC);

    CREATE TABLE IF NOT EXISTS draft_bookings (
      draft_id      INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL,
      showtime_id   INTEGER NOT NULL,
      seat_ids      TEXT NOT NULL,         -- JSON array
      coupon_code   TEXT,
      created_at    INTEGER NOT NULL,
      synced        INTEGER NOT NULL DEFAULT 0   -- 0/1
    );
  `);
  console.log('[localDb] Initialized SQLite schema');
}

// ===== MOVIES CACHE =====
async function cacheMovies(movies) {
  const db = await getDb();
  const now = Date.now();
  // Dùng transaction batch INSERT cho nhanh
  await db.withTransactionAsync(async () => {
    for (const m of movies) {
      await db.runAsync(
        `INSERT OR REPLACE INTO movies_cache
         (movie_id, title, original_title, poster_url, banner_url, description,
          duration_min, release_date, director, country, language, age_rating,
          status, rating_avg, rating_count, trailer_url, cached_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          m.movie_id, m.title, m.original_title || null, m.poster_url || null,
          m.banner_url || null, m.description || null, m.duration_minutes || null,
          m.release_date || null, m.director || null, m.country || null,
          m.language || null, m.age_rating || null, m.status || null,
          m.rating_avg || null, m.rating_count || 0, m.trailer_url || null, now,
        ]
      );
    }
  });
}

async function getCachedMovies({ status, limit = 100 } = {}) {
  const db = await getDb();
  const sql = status
    ? 'SELECT * FROM movies_cache WHERE status = ? ORDER BY rating_avg DESC LIMIT ?'
    : 'SELECT * FROM movies_cache ORDER BY rating_avg DESC LIMIT ?';
  const params = status ? [status, limit] : [limit];
  return db.getAllAsync(sql, params);
}

async function getCachedMovie(movieId) {
  const db = await getDb();
  return db.getFirstAsync('SELECT * FROM movies_cache WHERE movie_id = ?', [movieId]);
}

// ===== CINEMAS CACHE =====
async function cacheCinemas(cinemas) {
  const db = await getDb();
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    for (const c of cinemas) {
      await db.runAsync(
        `INSERT OR REPLACE INTO cinemas_cache
         (cinema_id, name, address, city, latitude, longitude, logo_url, phone, cached_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.cinema_id, c.name, c.address || null, c.city || null,
         c.latitude || null, c.longitude || null,
         c.logo_url || null, c.phone || null, now]
      );
    }
  });
}

async function getCachedCinemas() {
  const db = await getDb();
  return db.getAllAsync('SELECT * FROM cinemas_cache ORDER BY name');
}

// ===== FAVORITES =====
async function addFavorite(userId, movieId) {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR IGNORE INTO favorites (user_id, movie_id, added_at) VALUES (?, ?, ?)',
    [userId, movieId, Date.now()]
  );
}

async function removeFavorite(userId, movieId) {
  const db = await getDb();
  await db.runAsync(
    'DELETE FROM favorites WHERE user_id = ? AND movie_id = ?',
    [userId, movieId]
  );
}

async function isFavorite(userId, movieId) {
  const db = await getDb();
  const row = await db.getFirstAsync(
    'SELECT 1 FROM favorites WHERE user_id = ? AND movie_id = ?',
    [userId, movieId]
  );
  return !!row;
}

async function getFavoriteMovies(userId) {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT m.* FROM movies_cache m
     JOIN favorites f ON m.movie_id = f.movie_id
     WHERE f.user_id = ?
     ORDER BY f.added_at DESC`,
    [userId]
  );
}

// ===== RECENT VIEWS =====
async function logView(userId, movieId) {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO recent_views (user_id, movie_id, viewed_at) VALUES (?, ?, ?)',
    [userId, movieId, Date.now()]
  );
  // Giữ tối đa 50 record gần nhất / user
  await db.runAsync(
    `DELETE FROM recent_views WHERE user_id = ?
     AND view_id NOT IN (
       SELECT view_id FROM recent_views WHERE user_id = ?
       ORDER BY viewed_at DESC LIMIT 50
     )`,
    [userId, userId]
  );
}

async function getRecentlyViewed(userId, limit = 10) {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT m.* FROM movies_cache m
     JOIN (
       SELECT movie_id, MAX(viewed_at) AS last_at
       FROM recent_views WHERE user_id = ?
       GROUP BY movie_id
     ) v ON m.movie_id = v.movie_id
     ORDER BY v.last_at DESC LIMIT ?`,
    [userId, limit]
  );
}

// ===== DRAFT BOOKINGS (offline) =====
async function saveDraftBooking(userId, draft) {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO draft_bookings (user_id, showtime_id, seat_ids, coupon_code, created_at, synced)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [userId, draft.showtime_id, JSON.stringify(draft.seat_ids), draft.coupon_code || null, Date.now()]
  );
  return result.lastInsertRowId;
}

async function getUnsyncedDrafts(userId) {
  const db = await getDb();
  return db.getAllAsync(
    'SELECT * FROM draft_bookings WHERE user_id = ? AND synced = 0',
    [userId]
  );
}

async function markDraftSynced(draftId) {
  const db = await getDb();
  await db.runAsync('UPDATE draft_bookings SET synced = 1 WHERE draft_id = ?', [draftId]);
}

// ===== UTILITY =====
async function clearAllCaches() {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM movies_cache;
    DELETE FROM cinemas_cache;
    DELETE FROM recent_views;
  `);
}

async function clearUserData(userId) {
  const db = await getDb();
  await db.runAsync('DELETE FROM favorites WHERE user_id = ?', [userId]);
  await db.runAsync('DELETE FROM recent_views WHERE user_id = ?', [userId]);
  await db.runAsync('DELETE FROM draft_bookings WHERE user_id = ?', [userId]);
}

// ===== EXPORT =====
export const localDb = {
  init,
  cacheMovies,
  getCachedMovies,
  getCachedMovie,
  cacheCinemas,
  getCachedCinemas,
  addFavorite,
  removeFavorite,
  isFavorite,
  getFavoriteMovies,
  logView,
  getRecentlyViewed,
  saveDraftBooking,
  getUnsyncedDrafts,
  markDraftSynced,
  clearAllCaches,
  clearUserData,
};

export default localDb;

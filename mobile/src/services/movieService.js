/**
 * Movie Service - offline-first pattern
 *
 * Strategy:
 *   1. Đọc từ SQLite cache → return ngay (UI hiện < 50ms)
 *   2. Song song fetch API → cập nhật cache + setState
 *
 * Lợi ích:
 *   - UX: app mở lên thấy phim ngay, không loading 1-2s như trước
 *   - Offline: vẫn xem được list phim đã cache khi mất mạng
 *   - Tiết kiệm pin/data: cache 5-10 phút mới fetch lại
 */
import { localDb } from '../db/localdb';
import { movieApi, cinemaApi } from '../api/client';

const CACHE_TTL = 10 * 60 * 1000; // 10 phút

let lastMovieFetch = 0;
let lastCinemaFetch = 0;

/**
 * Load list phim với offline-first pattern.
 * @param {Object} opts - { status: 'now_showing'|'coming_soon', forceFresh: bool }
 * @param {Function} onUpdate - callback (movies, source) - source: 'cache' | 'network'
 */
export async function loadMovies(opts = {}, onUpdate) {
  const { status, forceFresh } = opts;

  // 1. Trả về cache ngay (không await)
  if (!forceFresh) {
    localDb.getCachedMovies({ status }).then(cached => {
      if (cached.length > 0 && onUpdate) onUpdate(cached, 'cache');
    });
  }

  // 2. Fetch fresh từ API nếu cần
  const now = Date.now();
  if (forceFresh || now - lastMovieFetch > CACHE_TTL) {
    try {
      const fresh = await movieApi.list({ status });
      lastMovieFetch = now;
      // Cập nhật SQLite trong background
      await localDb.cacheMovies(fresh);
      if (onUpdate) onUpdate(fresh, 'network');
      return fresh;
    } catch (err) {
      console.warn('[movieService] Fetch failed, using cache:', err.message);
      // Network lỗi → trả cache
      const cached = await localDb.getCachedMovies({ status });
      return cached;
    }
  }

  // 3. Cache còn hot, không fetch lại
  return localDb.getCachedMovies({ status });
}

/**
 * Chi tiết 1 phim - offline-first
 */
export async function loadMovieDetail(movieId, userId, onUpdate) {
  // Cache hit → return
  const cached = await localDb.getCachedMovie(movieId);
  if (cached && onUpdate) onUpdate(cached, 'cache');

  // Log lượt xem
  if (userId) {
    localDb.logView(userId, movieId).catch(() => {});
  }

  // Fetch fresh
  try {
    const fresh = await movieApi.detail(movieId);
    await localDb.cacheMovies([fresh]);
    if (onUpdate) onUpdate(fresh, 'network');
    return fresh;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}

/**
 * Cinemas với offline-first
 */
export async function loadCinemas(onUpdate) {
  localDb.getCachedCinemas().then(cached => {
    if (cached.length > 0 && onUpdate) onUpdate(cached, 'cache');
  });

  const now = Date.now();
  if (now - lastCinemaFetch > CACHE_TTL) {
    try {
      const fresh = await cinemaApi.list();
      lastCinemaFetch = now;
      await localDb.cacheCinemas(fresh);
      if (onUpdate) onUpdate(fresh, 'network');
      return fresh;
    } catch (err) {
      return localDb.getCachedCinemas();
    }
  }

  return localDb.getCachedCinemas();
}

/**
 * Toggle favorite - chỉ ghi local, sync sau (đơn giản hóa)
 */
export async function toggleFavorite(userId, movieId) {
  const isFav = await localDb.isFavorite(userId, movieId);
  if (isFav) {
    await localDb.removeFavorite(userId, movieId);
  } else {
    await localDb.addFavorite(userId, movieId);
  }
  return !isFav;
}

/**
 * Sync drafts khi có lại mạng
 */
export async function syncDraftBookings(userId, createBookingFn) {
  const drafts = await localDb.getUnsyncedDrafts(userId);
  for (const draft of drafts) {
    try {
      await createBookingFn({
        showtime_id: draft.showtime_id,
        seat_ids: JSON.parse(draft.seat_ids),
        coupon_code: draft.coupon_code,
      });
      await localDb.markDraftSynced(draft.draft_id);
    } catch (err) {
      console.warn(`Sync draft ${draft.draft_id} failed:`, err.message);
    }
  }
}

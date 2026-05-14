/**
 * Location Service
 *
 * Sử dụng expo-location để gợi ý rạp gần nhất theo vị trí GPS.
 *
 * Quyền cần xin trong app.json:
 *   "android.permissions": ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"]
 *   "ios.infoPlist.NSLocationWhenInUseUsageDescription": "Ứng dụng cần vị trí để gợi ý rạp gần bạn"
 *
 * Lưu ý: KHÔNG xin quyền background - app chỉ cần GPS lúc đang mở.
 */
import * as Location from 'expo-location';
import { localDb } from '../db/localdb';

const LOCATION_TIMEOUT = 8000; // 8s

/**
 * Xin quyền + lấy GPS hiện tại
 * @returns {Promise<{latitude, longitude} | null>}
 */
export async function getCurrentLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('[Location] Permission denied');
      return null;
    }

    const location = await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,  // Balance giữa độ chính xác và pin
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), LOCATION_TIMEOUT)),
    ]);

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
    };
  } catch (err) {
    console.warn('[Location] Error:', err.message);
    return null;
  }
}

/**
 * Tính khoảng cách giữa 2 điểm GPS (Haversine formula)
 * @returns {number} - khoảng cách tính bằng km
 */
export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // bán kính Trái Đất km
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Lấy rạp gần nhất theo GPS hiện tại
 * @param {number} maxDistanceKm - khoảng cách tối đa (default 30km)
 * @returns {Promise<Array<Cinema>>} - sorted by distance ASC
 */
export async function getNearbyCinemas(maxDistanceKm = 30) {
  const location = await getCurrentLocation();
  if (!location) return [];

  const cinemas = await localDb.getCachedCinemas();
  return cinemas
    .filter(c => c.latitude && c.longitude)
    .map(c => ({
      ...c,
      distance: distanceKm(
        location.latitude, location.longitude,
        c.latitude, c.longitude
      ),
    }))
    .filter(c => c.distance <= maxDistanceKm)
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Format distance để hiển thị
 */
export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
}

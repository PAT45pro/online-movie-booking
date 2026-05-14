/**
 * SecureStore wrapper - lưu access_token, refresh_token an toàn
 *
 * Khác với AsyncStorage (lưu plain text trong filesystem),
 * SecureStore dùng:
 *   - iOS Keychain (mã hóa hardware)
 *   - Android EncryptedSharedPreferences / Keystore
 *
 * → Token KHÔNG đọc được nếu device bị root/jailbreak hoặc malware truy cập.
 * → Áp dụng cho TẤT CẢ thông tin nhạy cảm: token, refresh_token, biometric secret...
 *
 * Lưu ý: SecureStore có giới hạn ~2KB mỗi item. Nếu cần lưu data lớn
 * (vd: cache phim, watch history) thì dùng SQLite (xem mobile/src/db/localdb.js).
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEYS = {
  ACCESS_TOKEN: 'cinema_access_token',
  REFRESH_TOKEN: 'cinema_refresh_token',
  USER_PROFILE: 'cinema_user_profile',  // tên + email + avatar (small)
};

// SecureStore hỗ trợ iOS + Android. Trên web fallback localStorage (dev/test only)
const isWeb = Platform.OS === 'web';

async function setItem(key, value) {
  if (isWeb) {
    // Web fallback: localStorage (chỉ dùng để dev test, KHÔNG production)
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    // Token không sync iCloud, không khôi phục sau wipe
  });
}

async function getItem(key) {
  if (isWeb) return localStorage.getItem(key);
  try {
    return await SecureStore.getItemAsync(key);
  } catch (err) {
    console.warn('[SecureStore] getItem error:', err.message);
    return null;
  }
}

async function deleteItem(key) {
  if (isWeb) {
    localStorage.removeItem(key);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (err) {
    console.warn('[SecureStore] deleteItem error:', err.message);
  }
}

// ===== Public API =====

export const tokenStorage = {
  /**
   * Lưu access token (JWT). Mỗi khi login/refresh thành công.
   */
  setAccessToken: (token) => setItem(KEYS.ACCESS_TOKEN, token),

  /**
   * Đọc access token. Gọi từ Axios interceptor mỗi request.
   */
  getAccessToken: () => getItem(KEYS.ACCESS_TOKEN),

  /**
   * Lưu refresh token. Dùng để tự động lấy access token mới khi hết hạn.
   */
  setRefreshToken: (token) => setItem(KEYS.REFRESH_TOKEN, token),

  getRefreshToken: () => getItem(KEYS.REFRESH_TOKEN),

  /**
   * Lưu profile mini (full_name, email, avatar nhỏ) để hiện UI nhanh
   * khi app khởi động, trước khi gọi /auth/me.
   */
  setUserProfile: (user) => setItem(KEYS.USER_PROFILE, JSON.stringify(user)),

  getUserProfile: async () => {
    const raw = await getItem(KEYS.USER_PROFILE);
    return raw ? JSON.parse(raw) : null;
  },

  /**
   * Logout: xóa toàn bộ secure data
   */
  clear: async () => {
    await Promise.all([
      deleteItem(KEYS.ACCESS_TOKEN),
      deleteItem(KEYS.REFRESH_TOKEN),
      deleteItem(KEYS.USER_PROFILE),
    ]);
  },
};

export default tokenStorage;

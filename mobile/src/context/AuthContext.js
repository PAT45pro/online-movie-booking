import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/client';
import { tokenStorage } from '../utils/secureStorage';

/**
 * AuthContext - quản lý đăng nhập với SecureStore
 *
 * Đặc điểm: token được lưu qua SecureStore (mã hóa keychain/keystore)
 * thay vì AsyncStorage (plain text).
 *
 * Đồng thời lưu user profile mini vào SecureStore để hiện UI nhanh
 * khi mở app, trong lúc /auth/me đang chạy ngầm để verify.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session khi mở app — UI hiện ngay với cache, sau đó verify với server
  useEffect(() => {
    (async () => {
      try {
        // 1. Đọc cache profile từ SecureStore — UI hiện ngay (UX tốt)
        const cachedProfile = await tokenStorage.getUserProfile();
        if (cachedProfile) setUser(cachedProfile);

        // 2. Đọc token, verify với server (background)
        const token = await tokenStorage.getAccessToken();
        if (token) {
          try {
            const me = await authApi.me();
            setUser(me);
            await tokenStorage.setUserProfile(me);
          } catch (verifyErr) {
            // Token hết hạn → clear
            await tokenStorage.clear();
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (e) {
        console.warn('[Auth] Restore session error:', e.message);
        await tokenStorage.clear();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const result = await authApi.login(email, password);
    // Backend có thể trả {token, user} hoặc {access_token, refresh_token, user}
    const accessToken = result.access_token || result.token;
    const refreshToken = result.refresh_token;

    await tokenStorage.setAccessToken(accessToken);
    if (refreshToken) await tokenStorage.setRefreshToken(refreshToken);
    await tokenStorage.setUserProfile(result.user);

    setUser(result.user);
    return result.user;
  };

  const register = async (data) => {
    const result = await authApi.register(data);
    const accessToken = result.access_token || result.token;
    const refreshToken = result.refresh_token;

    await tokenStorage.setAccessToken(accessToken);
    if (refreshToken) await tokenStorage.setRefreshToken(refreshToken);
    await tokenStorage.setUserProfile(result.user);

    setUser(result.user);
    return result.user;
  };

  const logout = async () => {
    await tokenStorage.clear();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const me = await authApi.me();
      setUser(me);
      await tokenStorage.setUserProfile(me);
    } catch (e) {
      console.warn('[Auth] refreshUser error:', e.message);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

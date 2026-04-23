import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tự đăng nhập lại khi mở app nếu có token
  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const me = await authApi.me();
          setUser(me);
        }
      } catch (e) {
        await AsyncStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const { token, user } = await authApi.login(email, password);
    await AsyncStorage.setItem('token', token);
    setUser(user);
    return user;
  };

  const register = async (data) => {
    const { token, user } = await authApi.register(data);
    await AsyncStorage.setItem('token', token);
    setUser(user);
    return user;
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const me = await authApi.me();
      setUser(me);
    } catch (e) {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

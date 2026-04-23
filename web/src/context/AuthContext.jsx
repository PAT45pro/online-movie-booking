import { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const me = await authApi.me();
          setUser(me);
        }
      } catch {
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const { token, user } = await authApi.login(email, password);
    localStorage.setItem('token', token);
    setUser(user);
    return user;
  };

  const register = async (data) => {
    const { token, user } = await authApi.register(data);
    localStorage.setItem('token', token);
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const refreshUser = async () => {
    try { setUser(await authApi.me()); } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

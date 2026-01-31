import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { getAllGuestData, clearGuestData } from '../services/guestStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const guestMode = localStorage.getItem('guestMode');

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else if (guestMode === 'true') {
      setIsGuest(true);
    }
    setLoading(false);
  }, []);

  const enterGuestMode = () => {
    localStorage.setItem('guestMode', 'true');
    setIsGuest(true);
  };

  const migrateGuestData = async () => {
    try {
      const { meals, poops } = await getAllGuestData();
      if (meals.length === 0 && poops.length === 0) return;

      await api.post('/migrate/guest-data', { meals, poops });
      await clearGuestData();
    } catch (error) {
      console.error('Guest data migration failed:', error);
    }
  };

  const login = async (email, password) => {
    const wasGuest = isGuest;
    const response = await api.post('/auth/login', { email, password });
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.removeItem('guestMode');
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(user);
    setIsGuest(false);

    if (wasGuest) {
      await migrateGuestData();
    }

    return user;
  };

  const register = async (email, password) => {
    const wasGuest = isGuest;
    const response = await api.post('/auth/register', { email, password });
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.removeItem('guestMode');
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(user);
    setIsGuest(false);

    if (wasGuest) {
      await migrateGuestData();
    }

    return user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('guestMode');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setIsGuest(false);
  };

  return (
    <AuthContext.Provider value={{ user, isGuest, login, register, logout, enterGuestMode, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

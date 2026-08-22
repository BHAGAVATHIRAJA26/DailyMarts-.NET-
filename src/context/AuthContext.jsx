import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

const STORAGE_KEY = 'dm_user';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: restore session from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate token exists before restoring
        if (parsed?.token) setUser(parsed);
        else localStorage.removeItem(STORAGE_KEY);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  const login = async (email, password, role) => {
    const res = await authService.login({ email, password, role });
    const userData = res.data.data;

    // Normalise role to lowercase for frontend role checks
    const normalised = {
      ...userData,
      role: userData.role?.toLowerCase(),
    };

    setUser(normalised);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalised));
    return normalised;
  };

  // ── REGISTER ──────────────────────────────────────────────────────────────
  const register = async (form, role) => {
    const payload = {
      name:     form.name,
      email:    form.email,
      phone:    form.phone,
      password: form.password,
      role:     role.toUpperCase(),
      address:  form.address,
      city:     form.location || 'Dindigul',
      // Farmer-specific fields
      farmName:   role === 'farmer' ? form.farmName : undefined,
      upiId:      role === 'farmer' ? form.upiId    : undefined,
      categories: role === 'farmer' ? form.categories.map((c) => c.toUpperCase()) : undefined,
    };

    const res = await authService.register(payload);
    const userData = res.data.data;

    const normalised = {
      ...userData,
      role: userData.role?.toLowerCase(),
    };

    setUser(normalised);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalised));
    return normalised;
  };

  // ── LOGOUT ────────────────────────────────────────────────────────────────
  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  // ── UPDATE PROFILE (local only, no backend call needed for simple updates) ─
  const updateProfile = (data) => {
    const updated = { ...user, ...data };
    setUser(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  // ── REFRESH USER FROM DB ──────────────────────────────────────────────────
  const refreshUser = async () => {
    try {
      const res = await authService.me();
      const fresh = { ...res.data.data, token: user?.token, role: res.data.data.role?.toLowerCase() };
      setUser(fresh);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    } catch {
      // Token expired — log out
      logout();
    }
  };

  const isCustomer = user?.role === 'customer';
  const isFarmer   = user?.role === 'farmer';

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, updateProfile, refreshUser, isCustomer, isFarmer }}
    >
      {children}
    </AuthContext.Provider>
  );
};

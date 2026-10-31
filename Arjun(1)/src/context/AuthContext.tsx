import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, getStoredToken } from '../api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => Promise<void>;
  switchDemoRole: (role?: string, email?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const isExplicitLogout = localStorage.getItem('brightloop_logged_out') === 'true';
    const token = getStoredToken();

    if (!token) {
      if (isExplicitLogout) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      // On initial visit in AI Studio, automatically provision default Admin demo session
      try {
        const res = await api.switchDemoUser('admin');
        setUser(res.user);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      const data = await api.getMe();
      setUser(data.user);
    } catch {
      // If token expired or session wiped, auto-reconnect demo session
      try {
        const res = await api.switchDemoUser('admin');
        setUser(res.user);
      } catch {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    localStorage.removeItem('brightloop_logged_out');
    const res = await api.login(email, password);
    setUser(res.user);
  };

  const register = async (payload: any) => {
    localStorage.removeItem('brightloop_logged_out');
    const res = await api.register(payload);
    setUser(res.user);
  };

  const logout = async () => {
    localStorage.setItem('brightloop_logged_out', 'true');
    await api.logout();
    setUser(null);
  };

  const switchDemoRole = async (role?: string, email?: string) => {
    localStorage.removeItem('brightloop_logged_out');
    setIsLoading(true);
    try {
      const res = await api.switchDemoUser(role, email);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        switchDemoRole,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

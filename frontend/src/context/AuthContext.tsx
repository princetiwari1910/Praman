import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, AuthResponse } from '@/types/auth';
import { apiGetMe, apiLogin, apiRegister, apiGoogleAuth } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  setAuthModalMode: (mode: 'login' | 'register') => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'praman_auth_token';
const USER_KEY = 'praman_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  });
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem(USER_KEY);
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const openAuthModal = useCallback((mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const handleAuthSuccess = useCallback((data: AuthResponse) => {
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setAuthModalOpen(false);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  // Verify session on initial load
  useEffect(() => {
    let mounted = true;
    async function initAuth() {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      if (!savedToken) {
        if (mounted) setIsLoading(false);
        return;
      }

      try {
        const { user: meUser } = await apiGetMe();
        if (mounted) {
          setUser(meUser);
          localStorage.setItem(USER_KEY, JSON.stringify(meUser));
        }
      } catch {
        if (mounted) {
          logout();
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();
    return () => {
      mounted = false;
    };
  }, [logout]);

  const login = async (email: string, password: string) => {
    const data: AuthResponse = await apiLogin(email, password);
    handleAuthSuccess(data);
  };

  const register = async (email: string, password: string, fullName?: string) => {
    const data: AuthResponse = await apiRegister(email, password, fullName);
    handleAuthSuccess(data);
  };

  const loginWithGoogle = async (credential: string) => {
    const data: AuthResponse = await apiGoogleAuth(credential);
    handleAuthSuccess(data);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        authModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        setAuthModalMode,
        login,
        register,
        loginWithGoogle,
        logout,
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

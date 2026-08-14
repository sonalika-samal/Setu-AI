import React, { createContext, useContext, useState } from 'react';

export const formatRole = (role: string | undefined): string => {
  if (!role) return '';
  switch (role.toLowerCase()) {
    case 'owner':
      return 'Organisation Head';
    case 'admin':
      return 'Organisation Administrator';
    case 'worker':
      return 'Staff Member';
    case 'superadmin':
      return 'Super Admin';
    default:
      return role;
  }
};

export interface User {
  id: string;
  username: string;
  name: string;
  phone: string;
  role: 'Admin' | 'Owner' | 'Worker' | 'SuperAdmin';
  orgId?: string;
  status: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  apiFetch: (endpoint: string, options?: RequestInit) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('setu_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('setu_user');
    return saved ? JSON.parse(saved) : null;
  });

  const isAuthenticated = !!token;

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('setu_token', newToken);
    localStorage.setItem('setu_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('setu_token');
    localStorage.removeItem('setu_user');
    setToken(null);
    setUser(null);
  };

  const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const API_URL = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      logout();
      throw new Error('Unauthorized session expired');
    }

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.message || 'Request failed');
    }

    // Try parsing as JSON first, otherwise return text
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  };

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated, login, logout, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
export default AuthContext;

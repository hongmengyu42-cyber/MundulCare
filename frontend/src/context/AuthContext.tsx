'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthResponse, Role } from '@/types/auth';
import { syncAdminBranchScope } from '@/lib/adminBranchFilter';

interface CurrentUser {
  userId: number;
  name: string;
  email: string;
  role: Role;
  profileImage?: string;
  adminLevel?: string;
  assignedBranch?: string;
  permissions?: string;
}

interface AuthContextType {
  user: CurrentUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (authData: AuthResponse) => void;
  updateUser: (partial: Partial<CurrentUser>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore authentication session from localStorage
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      try {
        const parsed: CurrentUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsed);
        // Re-sync admin branch scope in case of page refresh
        if (parsed.role === 'ADMIN') {
          syncAdminBranchScope(parsed.assignedBranch, parsed.adminLevel);
        }
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const setAuth = (authData: AuthResponse) => {
    setToken(authData.token);
    const userData: CurrentUser = {
      userId: authData.userId,
      name: authData.name,
      email: authData.email,
      role: authData.role,
      profileImage: authData.profileImage,
      adminLevel: authData.adminLevel,
      assignedBranch: authData.assignedBranch,
      permissions: authData.permissions,
    };
    setUser(userData);
    localStorage.setItem('token', authData.token);
    localStorage.setItem('user', JSON.stringify(userData));
    // Sync admin branch scope immediately so Branch Admin lock is in place before any page renders
    if (authData.role === 'ADMIN') {
      syncAdminBranchScope(authData.assignedBranch, authData.adminLevel);
    }
  };

  // Merges a partial update (e.g. new name or profile photo) into the stored user, without a full re-login
  const updateUser = (partial: Partial<CurrentUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Clear admin branch scope lock on logout
    localStorage.removeItem('mundulcare_admin_branch_filter');
    localStorage.removeItem('mundulcare_admin_locked_branch');
    localStorage.removeItem('mundulcare_admin_level');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        setAuth,
        updateUser,
        logout,
      }}
    >
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

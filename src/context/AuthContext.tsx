import React, { createContext, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: 'admin',
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [role, setRole] = useState<string>('admin');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser({
            uid: data.user.id || 'admin-123',
            email: data.user.email || 'admin@xlncexotic.com',
            displayName: data.user.name || 'System Admin',
            photoURL: null
          });
          setRole(data.user.role || 'admin');
          localStorage.setItem('auth_role', data.user.role || 'admin');
        } else {
          setUser(null);
          localStorage.removeItem('auth_role');
        }
      })
      .catch(() => {
        setUser(null);
        localStorage.removeItem('auth_role');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setUser({
        uid: data.user.id,
        email: data.user.email,
        displayName: data.user.name,
        photoURL: null
      });
      setRole(data.user.role);
      localStorage.setItem('auth_role', data.user.role);
      toast.success(`Welcome back, ${data.user.name}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign in');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    
    setUser(null);
    localStorage.removeItem('auth_role');
    toast.success('Signed out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, loading, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

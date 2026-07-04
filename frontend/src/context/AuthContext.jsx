import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('djs_token'));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('djs_user');
    return raw ? JSON.parse(raw) : null;
  });

  const login = (newToken, newUser) => {
    localStorage.setItem('djs_token', newToken);
    localStorage.setItem('djs_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('djs_token');
    localStorage.removeItem('djs_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
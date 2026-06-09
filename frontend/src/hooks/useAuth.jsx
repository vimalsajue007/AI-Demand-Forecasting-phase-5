import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../services/api";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } });
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      Promise.all([authAPI.me(), authAPI.permissions()])
        .then(([ur, pr]) => { setUser(ur.data); setPermissions(pr.data.permissions || []); localStorage.setItem("user", JSON.stringify(ur.data)); })
        .catch(() => { localStorage.removeItem("token"); localStorage.removeItem("user"); setUser(null); })
        .finally(() => setLoading(false));
    } else { setLoading(false); }
  }, []);
  const login = async (credentials) => {
    const res = await authAPI.login(credentials);
    const { access_token, user: userData } = res.data;
    localStorage.setItem("token", access_token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    try { const pr = await authAPI.permissions(); setPermissions(pr.data.permissions || []); } catch {}
    return userData;
  };
  const register = async (data) => { const res = await authAPI.register(data); return res.data; };
  const logout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); setUser(null); setPermissions([]); };
  const hasPermission = (p) => permissions.includes(p);
  const hasRole = (role) => {
    if (user?.is_admin) return true;
    const order = { super_admin: 3, analyst: 2, viewer: 1 };
    return (order[user?.role] || 1) >= (order[role] || 1);
  };
  return <AuthContext.Provider value={{ user, loading, permissions, login, register, logout, hasPermission, hasRole }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => { const ctx = useContext(AuthContext); if (!ctx) throw new Error("useAuth must be used within AuthProvider"); return ctx; };

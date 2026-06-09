import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import api from "../services/api";
import toast from "react-hot-toast";
import { MdPerson, MdLock, MdSave, MdBadge, MdEmail, MdCalendarToday, MdPalette, MdLightMode, MdDarkMode } from "react-icons/md";

export default function ProfilePage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [tab, setTab] = useState("info");
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const [infoForm, setInfoForm] = useState({ full_name: user?.full_name || "", email: user?.email || "" });
  const [pwdForm, setPwdForm] = useState({ current_password: "", new_password: "", confirm_password: "" });

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setSavingInfo(true);
    try { await api.patch("/api/auth/me", infoForm); toast.success("Profile updated!"); }
    catch (err) { toast.error(err.response?.data?.detail || "Update failed"); }
    finally { setSavingInfo(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwdForm.new_password !== pwdForm.confirm_password) { toast.error("Passwords do not match"); return; }
    if (pwdForm.new_password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setSavingPwd(true);
    try {
      await api.post("/api/auth/change-password", { current_password: pwdForm.current_password, new_password: pwdForm.new_password });
      toast.success("Password changed!");
      setPwdForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setSavingPwd(false); }
  };

  return (
    <div className="space-y-4 md:space-y-6 max-w-2xl">
      <div className="pt-2 md:pt-0">
        <h1 className="page-title">Profile & Settings</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Manage your account and preferences</p>
      </div>

      {/* User card */}
      <div className="glass-card p-4 md:p-5 flex items-center gap-3 md:gap-4">
        <div className="w-12 h-12 md:w-14 md:h-14 bg-primary-200 dark:bg-primary-800 rounded-2xl flex items-center justify-center flex-shrink-0">
          <MdPerson className="text-primary-700 dark:text-primary-300 text-2xl md:text-3xl" />
        </div>
        <div className="min-w-0">
          <p className="font-display font-bold text-base md:text-lg truncate" style={{ color: "var(--text)" }}>
            {user?.full_name || user?.username}
          </p>
          <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            <span className="flex items-center gap-1"><MdBadge /> {user?.username}</span>
            <span className="flex items-center gap-1 truncate"><MdEmail /> {user?.email}</span>
            <span className="hidden sm:flex items-center gap-1"><MdCalendarToday /> {user?.created_at?.slice(0,10)}</span>
          </div>
          {user?.is_admin && <span className="badge-info mt-1 inline-flex">👑 Administrator</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-primary-100 dark:bg-primary-900/50 p-1 rounded-xl w-fit">
        {[
          { key: "info", label: "Account", icon: MdPerson },
          { key: "security", label: "Security", icon: MdLock },
          { key: "appearance", label: "Appearance", icon: MdPalette },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-150
              ${tab === key ? "bg-white dark:bg-primary-800 shadow-sm" : "hover:opacity-80"}`}
            style={{ color: tab === key ? "var(--text)" : "var(--text-muted)" }}>
            <Icon className="text-base" /> {label}
          </button>
        ))}
      </div>

      {/* Account Info */}
      {tab === "info" && (
        <div className="glass-card p-4 md:p-6 animate-fade-in">
          <h2 className="section-title mb-4 md:mb-5">Account Information</h2>
          <form onSubmit={handleSaveInfo} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input-field" value={infoForm.full_name}
                onChange={(e) => setInfoForm({ ...infoForm, full_name: e.target.value })} placeholder="Your full name" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input-field" value={infoForm.email}
                onChange={(e) => setInfoForm({ ...infoForm, email: e.target.value })} placeholder="you@example.com" />
            </div>
            <div>
              <label className="label">Username</label>
              <input className="input-field opacity-60 cursor-not-allowed" value={user?.username || ""} disabled />
              <p className="text-xs text-primary-400 mt-1">Username cannot be changed</p>
            </div>
            <button type="submit" disabled={savingInfo} className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center">
              {savingInfo ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <MdSave />}
              {savingInfo ? "Saving…" : "Save Changes"}
            </button>
          </form>
        </div>
      )}

      {/* Security */}
      {tab === "security" && (
        <div className="glass-card p-4 md:p-6 animate-fade-in">
          <h2 className="section-title mb-4 md:mb-5">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <input type="password" className="input-field" value={pwdForm.current_password}
                onChange={(e) => setPwdForm({ ...pwdForm, current_password: e.target.value })} placeholder="••••••••" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">New Password</label>
                <input type="password" className="input-field" value={pwdForm.new_password}
                  onChange={(e) => setPwdForm({ ...pwdForm, new_password: e.target.value })} placeholder="Min. 6 characters" />
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <input type="password" className="input-field" value={pwdForm.confirm_password}
                  onChange={(e) => setPwdForm({ ...pwdForm, confirm_password: e.target.value })} placeholder="Repeat password" />
              </div>
            </div>
            <button type="submit" disabled={savingPwd} className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center">
              {savingPwd ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <MdLock />}
              {savingPwd ? "Updating…" : "Update Password"}
            </button>
          </form>
        </div>
      )}

      {/* Appearance */}
      {tab === "appearance" && (
        <div className="glass-card p-4 md:p-6 animate-fade-in">
          <h2 className="section-title mb-4 md:mb-5">Appearance</h2>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Choose your preferred theme</p>
            <div className="grid grid-cols-2 gap-3">
              {/* Light mode */}
              <button onClick={() => theme === "dark" && toggleTheme()}
                className={`p-4 rounded-xl border-2 transition-all duration-200 text-left
                  ${theme === "light" ? "border-primary-500 bg-primary-50" : "border-primary-200 dark:border-primary-800 hover:border-primary-400"}`}>
                <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center mb-3 shadow-sm">
                  <MdLightMode className="text-yellow-500 text-xl" />
                </div>
                <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>Light Mode</p>
                <p className="text-xs text-primary-400 mt-0.5">Clean bright interface</p>
                {theme === "light" && <span className="badge-success mt-2 inline-flex">Active</span>}
              </button>

              {/* Dark mode */}
              <button onClick={() => theme === "light" && toggleTheme()}
                className={`p-4 rounded-xl border-2 transition-all duration-200 text-left
                  ${theme === "dark" ? "border-primary-500 bg-primary-900/50" : "border-primary-200 dark:border-primary-800 hover:border-primary-400"}`}>
                <div className="w-10 h-10 bg-primary-950 rounded-lg border border-primary-800 flex items-center justify-center mb-3">
                  <MdDarkMode className="text-primary-400 text-xl" />
                </div>
                <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>Dark Mode</p>
                <p className="text-xs text-primary-400 mt-0.5">Easy on the eyes</p>
                {theme === "dark" && <span className="badge-success mt-2 inline-flex">Active</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

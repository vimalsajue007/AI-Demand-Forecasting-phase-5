import { useState, useEffect } from "react";
import { adminAPI } from "../services/api";
import toast from "react-hot-toast";
import { MdPeople, MdStorage, MdAutoGraph, MdAdminPanelSettings, MdBlock, MdCheckCircle, MdDelete, MdSearch, MdSupervisorAccount } from "react-icons/md";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { SkeletonCard, SkeletonTable } from "../components/ui/Skeleton";

const GREENS = ["#22c55e","#16a34a","#4ade80","#166534"];
const ROLES = ["super_admin","analyst","viewer"];

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [userTotal, setUserTotal] = useState(0);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => { fetchStats(); fetchUsers(); }, []);

  const fetchStats = async () => {
    try { const r = await adminAPI.stats(); setStats(r.data); }
    catch { toast.error("Failed to load stats"); } finally { setLoading(false); }
  };

  const fetchUsers = async (search = "") => {
    try { const r = await adminAPI.users({ search, limit: 50 }); setUsers(r.data.users); setUserTotal(r.data.total); }
    catch {}
  };

  const handleToggleActive = async (id) => {
    try { const r = await adminAPI.toggleActive(id); setUsers((prev) => prev.map((u) => u.id === id ? { ...u, is_active: r.data.is_active } : u)); toast.success(r.data.message); }
    catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const handleUpdateRole = async (id, role) => {
    try { await adminAPI.updateRole(id, role); setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role, is_admin: role === "super_admin" } : u)); toast.success(`Role updated to ${role}`); }
    catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm("Delete this user?")) return;
    try { await adminAPI.deleteUser(id); setUsers((prev) => prev.filter((u) => u.id !== id)); toast.success("Deleted"); }
    catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const tabs = [{ key:"overview",label:"Overview" }, { key:"users",label:`Users (${userTotal})` }, { key:"activity",label:"Activity" }];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-3 pt-2 md:pt-0">
        <div className="w-9 h-9 md:w-10 md:h-10 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <MdAdminPanelSettings className="text-white text-lg md:text-xl" />
        </div>
        <div>
          <h1 className="page-title">Admin Panel</h1>
          <p className="text-xs md:text-sm" style={{ color: "var(--text-muted)" }}>System management and analytics</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {loading ? [...Array(4)].map((_, i) => <SkeletonCard key={i} />) : (
          <>
            {[
              [MdPeople, "Total Users", stats?.total_users ?? 0, `${stats?.active_users} active`],
              [MdStorage, "Datasets", stats?.total_datasets ?? 0, null],
              [MdAutoGraph, "Forecasts", stats?.total_forecasts ?? 0, `${stats?.completed_forecasts} done`],
              [MdCheckCircle, "Success Rate", `${stats?.success_rate ?? 0}%`, null],
            ].map(([Icon, label, value, sub]) => (
              <div key={label} className="stat-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-primary-500 uppercase tracking-wider">{label}</p>
                    <p className="font-display text-xl md:text-2xl font-bold mt-1" style={{ color: "var(--text)" }}>{value}</p>
                    {sub && <p className="text-xs text-primary-400 mt-0.5">{sub}</p>}
                  </div>
                  <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-xl flex items-center justify-center">
                    <Icon className="text-primary-600 dark:text-primary-400 text-base" />
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="flex gap-1 bg-primary-100 dark:bg-primary-900/50 p-1 rounded-xl overflow-x-auto">
        {tabs.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0
              ${tab === key ? "bg-white dark:bg-primary-800 shadow-sm" : "hover:opacity-80"}`}
            style={{ color: tab === key ? "var(--text)" : "var(--text-muted)" }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-3 md:space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="glass-card p-4 md:p-5">
              <h2 className="section-title mb-3 md:mb-4">Model Performance</h2>
              {stats?.model_stats?.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={stats.model_stats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(134,239,172,0.2)" />
                    <XAxis dataKey="model" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} unit="%" />
                    <Tooltip />
                    <Bar dataKey="avg_accuracy" radius={[4,4,0,0]}>
                      {stats.model_stats.map((_, i) => <Cell key={i} fill={GREENS[i % GREENS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>No data</p>}
            </div>
            <div className="glass-card p-4 md:p-5">
              <h2 className="section-title mb-3 md:mb-4">Recent Users</h2>
              <div className="space-y-2">
                {stats?.recent_users?.map((u) => (
                  <div key={u.id} className="flex items-center justify-between py-2 border-b border-primary-100 dark:border-primary-800 gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{u.username}</p>
                      <p className="text-xs text-primary-400 truncate">{u.email}</p>
                    </div>
                    <span className="text-xs text-primary-400 flex-shrink-0">{u.created_at}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="glass-card p-4 md:p-5 animate-fade-in">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-0">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" />
              <input className="input-field pl-9 text-sm" placeholder="Search users…" value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); fetchUsers(e.target.value); }} />
            </div>
            <span className="text-sm text-primary-500 flex-shrink-0">{userTotal} users</span>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-primary-100 dark:border-primary-800">
                  <th className="table-th">User</th><th className="table-th">Role</th>
                  <th className="table-th">Datasets</th><th className="table-th">Forecasts</th>
                  <th className="table-th">Status</th><th className="table-th">Joined</th><th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-primary-50 dark:border-primary-900 hover:bg-primary-50/50 dark:hover:bg-primary-900/30">
                    <td className="table-td">
                      <p className="font-medium" style={{ color: "var(--text)" }}>{u.username}</p>
                      <p className="text-xs text-primary-400">{u.email}</p>
                    </td>
                    <td className="table-td">
                      <select className="input-field text-xs py-1 w-32" value={u.role || "analyst"}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}>
                        {ROLES.map((r) => <option key={r} value={r}>{r.replace("_"," ")}</option>)}
                      </select>
                    </td>
                    <td className="table-td">{u.dataset_count}</td>
                    <td className="table-td">{u.forecast_count}</td>
                    <td className="table-td"><span className={u.is_active ? "badge-success" : "badge-error"}>{u.is_active ? "Active" : "Inactive"}</span></td>
                    <td className="table-td text-primary-400">{u.created_at}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleToggleActive(u.id)} className="text-primary-500 hover:text-primary-700" title={u.is_active ? "Deactivate" : "Activate"}>
                          {u.is_active ? <MdBlock className="text-lg" /> : <MdCheckCircle className="text-lg" />}
                        </button>
                        <button onClick={() => handleDeleteUser(u.id)} className="text-red-400 hover:text-red-600"><MdDelete className="text-lg" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {users.map((u) => (
              <div key={u.id} className="bg-primary-50 dark:bg-primary-900/40 rounded-xl p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>{u.username}</p>
                    <p className="text-xs text-primary-400 truncate">{u.email}</p>
                  </div>
                  <span className={u.is_active ? "badge-success" : "badge-error"}>{u.is_active ? "Active" : "Off"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <select className="input-field text-xs py-1 flex-1" value={u.role || "analyst"}
                    onChange={(e) => handleUpdateRole(u.id, e.target.value)}>
                    {ROLES.map((r) => <option key={r} value={r}>{r.replace("_"," ")}</option>)}
                  </select>
                  <button onClick={() => handleToggleActive(u.id)} className="text-primary-500 hover:text-primary-700">
                    {u.is_active ? <MdBlock /> : <MdCheckCircle />}
                  </button>
                  <button onClick={() => handleDeleteUser(u.id)} className="text-red-400 hover:text-red-600"><MdDelete /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "activity" && (
        <div className="glass-card p-4 md:p-5 animate-fade-in">
          <h2 className="section-title mb-4">System Activity</h2>
          <div className="space-y-2">
            {stats?.recent_forecasts?.map((f) => (
              <div key={f.id} className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/40 rounded-xl gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{f.name}</p>
                  <p className="text-xs text-primary-400">Model: {f.model} • User #{f.owner_id}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={f.status === "completed" ? "badge-success" : f.status === "error" ? "badge-error" : "badge-info"}>{f.status}</span>
                  <p className="text-xs text-primary-400 mt-1">{f.created_at}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

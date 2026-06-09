import { useState, useEffect } from "react";
import { monitoringAPI } from "../services/api";
import { MdMonitor, MdSpeed, MdHistory, MdPeople } from "react-icons/md";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { SkeletonTable, SkeletonCard } from "../components/ui/Skeleton";

const GREENS = ["#22c55e","#16a34a","#4ade80","#166534"];

export default function MonitoringPage() {
  const [tab, setTab] = useState("performance");
  const [performance, setPerformance] = useState(null);
  const [logs, setLogs] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => { fetchData(); }, [tab, days]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === "performance") {
        const r = await monitoringAPI.performance({ days });
        setPerformance(r.data);
      } else if (tab === "logs") {
        const r = await monitoringAPI.activityLogs({ days, limit: 50 });
        setLogs(r.data.logs || []);
      } else if (tab === "history") {
        const r = await monitoringAPI.forecastHistory({ limit: 50 });
        setHistory(r.data.history || []);
      }
    } catch {} finally { setLoading(false); }
  };

  const tabs = [
    { key: "performance", label: "Performance", icon: MdSpeed },
    { key: "logs", label: "Activity Logs", icon: MdPeople },
    { key: "history", label: "Forecast History", icon: MdHistory },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-start justify-between gap-3 pt-2 md:pt-0">
        <div>
          <h1 className="page-title">System Monitoring</h1>
          <p className="text-primary-500 text-xs md:text-sm mt-1">API activity, performance, and forecast history</p>
        </div>
        <select className="input-field text-sm w-28 flex-shrink-0" value={days} onChange={(e) => setDays(parseInt(e.target.value))}>
          <option value={1}>1 day</option>
          <option value={7}>7 days</option>
          <option value={30}>30 days</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-primary-100 p-1 rounded-xl w-fit overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap
              ${tab === key ? "bg-white text-primary-900 shadow-sm" : "text-primary-600 hover:text-primary-800"}`}>
            <Icon />{label}
          </button>
        ))}
      </div>

      {/* Performance */}
      {tab === "performance" && (
        <div className="space-y-4 animate-fade-in">
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
          ) : performance && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {[
                  ["Total Requests", performance.total_requests],
                  ["Avg Response", `${performance.avg_response_time_ms}ms`],
                  ["Error Rate", `${performance.error_rate_pct}%`],
                  ["Success", performance.success_requests],
                ].map(([label, value]) => (
                  <div key={label} className="stat-card">
                    <p className="text-xs font-medium text-primary-500 uppercase tracking-wider">{label}</p>
                    <p className="font-display text-xl font-bold text-primary-900 mt-1">{value}</p>
                  </div>
                ))}
              </div>
              <div className="glass-card p-4 md:p-5">
                <h2 className="section-title mb-4">Slowest Endpoints</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={performance.slow_endpoints?.slice(0, 6)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#dcfce7" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} unit="ms" />
                    <YAxis dataKey="endpoint" type="category" tick={{ fontSize: 8 }} width={140} />
                    <Tooltip />
                    <Bar dataKey="avg_ms" radius={[0,4,4,0]}>
                      {performance.slow_endpoints?.slice(0,6).map((_, i) => <Cell key={i} fill={GREENS[i % GREENS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}

      {/* Activity Logs */}
      {tab === "logs" && (
        <div className="glass-card p-4 md:p-5 animate-fade-in">
          <h2 className="section-title mb-4">API Activity Logs</h2>
          {loading ? <SkeletonTable /> : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-primary-100">
                    <th className="table-th">Action</th><th className="table-th">Method</th>
                    <th className="table-th">Endpoint</th><th className="table-th">Status</th>
                    <th className="table-th">Time</th><th className="table-th">IP</th><th className="table-th">Created</th>
                  </tr></thead>
                  <tbody>
                    {logs.map((l) => (
                      <tr key={l.id} className="border-b border-primary-50 hover:bg-primary-50/50">
                        <td className="table-td font-mono text-xs">{l.action}</td>
                        <td className="table-td"><span className="badge bg-primary-100 text-primary-700">{l.method}</span></td>
                        <td className="table-td text-xs text-primary-400 truncate max-w-32">{l.endpoint}</td>
                        <td className="table-td"><span className={l.status_code < 400 ? "badge-success" : "badge-error"}>{l.status_code}</span></td>
                        <td className="table-td text-xs">{l.response_time_ms}ms</td>
                        <td className="table-td text-xs text-primary-400">{l.ip_address}</td>
                        <td className="table-td text-xs text-primary-400">{l.created_at?.slice(0,16).replace("T"," ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile */}
              <div className="md:hidden space-y-2">
                {logs.map((l) => (
                  <div key={l.id} className="bg-primary-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs text-primary-700">{l.action}</span>
                      <span className={l.status_code < 400 ? "badge-success" : "badge-error"}>{l.status_code}</span>
                    </div>
                    <p className="text-xs text-primary-400 truncate">{l.endpoint}</p>
                    <p className="text-xs text-primary-400 mt-0.5">{l.response_time_ms}ms • {l.created_at?.slice(0,16).replace("T"," ")}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Forecast History */}
      {tab === "history" && (
        <div className="glass-card p-4 md:p-5 animate-fade-in">
          <h2 className="section-title mb-4">Forecast History</h2>
          {loading ? <SkeletonTable /> : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-primary-100">
                    <th className="table-th">Name</th><th className="table-th">Model</th>
                    <th className="table-th">Target</th><th className="table-th">Periods</th>
                    <th className="table-th">Accuracy</th><th className="table-th">MAE</th>
                    <th className="table-th">Status</th><th className="table-th">Created</th>
                  </tr></thead>
                  <tbody>
                    {history.map((f) => (
                      <tr key={f.id} className="border-b border-primary-50 hover:bg-primary-50/50">
                        <td className="table-td font-medium">{f.name}</td>
                        <td className="table-td font-mono text-xs">{f.model_type}</td>
                        <td className="table-td text-xs">{f.target_column}</td>
                        <td className="table-td">{f.periods}</td>
                        <td className="table-td">{f.accuracy_score ? <span className="font-bold text-primary-700">{f.accuracy_score}%</span> : "—"}</td>
                        <td className="table-td text-xs">{f.mae || "—"}</td>
                        <td className="table-td"><span className={f.status === "completed" ? "badge-success" : f.status === "error" ? "badge-error" : "badge-info"}>{f.status}</span></td>
                        <td className="table-td text-xs text-primary-400">{f.created_at?.slice(0,10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden space-y-2">
                {history.map((f) => (
                  <div key={f.id} className="bg-primary-50 rounded-xl p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-primary-900 text-sm truncate pr-2">{f.name}</p>
                      <span className={f.status === "completed" ? "badge-success" : f.status === "error" ? "badge-error" : "badge-info"}>{f.status}</span>
                    </div>
                    <p className="text-xs text-primary-400 font-mono">{f.model_type} • {f.target_column} • {f.periods} periods</p>
                    {f.accuracy_score && <p className="text-xs text-primary-600">Accuracy: <strong>{f.accuracy_score}%</strong></p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { dashboardAPI } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie,
} from "recharts";
import { MdStorage, MdAutoGraph, MdTrendingUp, MdShowChart, MdAccessTime, MdFilterAlt, MdClose } from "react-icons/md";
import { SkeletonCard, SkeletonChart } from "../components/ui/Skeleton";

const GREENS = ["#4ade80","#22c55e","#16a34a","#166534","#14532d"];

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="stat-card animate-scale-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-primary-500 uppercase tracking-wider">{label}</p>
          <p className="font-display text-xl md:text-2xl font-bold mt-1" style={{ color: "var(--text)" }}>{value}</p>
          {sub && <p className="text-xs text-primary-400 mt-0.5">{sub}</p>}
        </div>
        <div className="w-8 h-8 md:w-9 md:h-9 bg-primary-100 dark:bg-primary-900 rounded-xl flex items-center justify-center flex-shrink-0">
          <Icon className="text-primary-600 dark:text-primary-400 text-base md:text-lg" />
        </div>
      </div>
    </div>
  );
}

const GreenTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="glass-card px-3 py-2 text-xs">
        <p className="font-semibold" style={{ color: "var(--text)" }}>{label}</p>
        <p style={{ color: "var(--text-muted)" }}>Value: <strong>{payload[0]?.value?.toLocaleString()}</strong></p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ date_from: "", date_to: "", category: "", region: "" });
  const [showFilters, setShowFilters] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v));
      const [statsRes, actRes] = await Promise.all([
        dashboardAPI.stats(params),
        dashboardAPI.activity({ limit: 8 }),
      ]);
      setStats(statsRes.data);
      setActivity(actRes.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchStats(); }, []);

  const greetHour = new Date().getHours();
  const greeting = greetHour < 12 ? "Good morning" : greetHour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-start justify-between gap-3 pt-2 md:pt-0">
        <div>
          <h1 className="page-title">{greeting}, {user?.full_name?.split(" ")[0] || user?.username} 👋</h1>
          <p className="text-xs md:text-sm mt-1" style={{ color: "var(--text-muted)" }}>Your demand forecasting overview.</p>
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary flex items-center gap-1.5 text-xs md:text-sm px-3 py-2 md:px-5 md:py-2.5 flex-shrink-0 ${showFilters ? "bg-primary-200 dark:bg-primary-800" : ""}`}>
          <MdFilterAlt /> <span className="hidden sm:inline">Filters</span>
        </button>
      </div>

      {showFilters && (
        <div className="glass-card p-4 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Filter Dashboard</h3>
            <button onClick={() => setShowFilters(false)} className="text-primary-400 hover:text-primary-600"><MdClose /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "From Date", type: "date", key: "date_from" },
              { label: "To Date", type: "date", key: "date_to" },
              { label: "Category", type: "text", key: "category", placeholder: "e.g. ProductA" },
              { label: "Region", type: "text", key: "region", placeholder: "e.g. North" },
            ].map(({ label, type, key, placeholder }) => (
              <div key={key}>
                <label className="label text-xs">{label}</label>
                <input type={type} className="input-field text-xs" placeholder={placeholder}
                  value={filters[key]} onChange={(e) => setFilters({ ...filters, [key]: e.target.value })} />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={fetchStats} className="btn-primary text-xs px-4 py-2">Apply</button>
            <button onClick={() => setFilters({ date_from:"",date_to:"",category:"",region:"" })} className="btn-secondary text-xs px-4 py-2">Reset</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {loading ? [...Array(4)].map((_, i) => <SkeletonCard key={i} />) : (
          <>
            <StatCard icon={MdStorage} label="Datasets" value={stats?.total_datasets ?? 0} sub="uploaded" />
            <StatCard icon={MdAutoGraph} label="Forecasts" value={stats?.total_forecasts ?? 0} sub="generated" />
            <StatCard icon={MdTrendingUp} label="Total Sales" value={stats?.total_sales ? `$${(stats.total_sales/1000).toFixed(1)}K` : "—"} sub="historical" />
            <StatCard icon={MdShowChart} label="Avg Accuracy" value={stats?.avg_accuracy ? `${stats.avg_accuracy}%` : "—"} sub="R² score" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
        <div className="glass-card p-4 md:p-5 lg:col-span-2">
          <h2 className="section-title mb-3 md:mb-4">Monthly Sales Trends</h2>
          {loading ? <SkeletonChart /> : stats?.monthly_trends?.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={stats.monthly_trends}>
                <defs>
                  <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(134,239,172,0.2)" />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#86efac" }} />
                <YAxis tick={{ fontSize: 9, fill: "#86efac" }} width={40} />
                <Tooltip content={<GreenTooltip />} />
                <Area type="monotone" dataKey="sales" stroke="#22c55e" strokeWidth={2} fill="url(#sg)" dot={{ r: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyChart message="Run forecasts to see monthly trends" />}
        </div>

        <div className="glass-card p-4 md:p-5">
          <h2 className="section-title mb-3 md:mb-4">Model Performance</h2>
          {loading ? <SkeletonChart /> : stats?.model_breakdown?.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.model_breakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(134,239,172,0.2)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9 }} domain={[0,100]} unit="%" />
                <YAxis dataKey="model" type="category" tick={{ fontSize: 8 }} width={80} />
                <Tooltip content={<GreenTooltip />} />
                <Bar dataKey="avg_accuracy" radius={[0,4,4,0]}>
                  {stats.model_breakdown.map((_, i) => <Cell key={i} fill={GREENS[i % GREENS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart message="No model data yet" />}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div className="glass-card p-4 md:p-5">
          <h2 className="section-title mb-3 md:mb-4">Top Products</h2>
          {loading ? <SkeletonChart /> : stats?.top_products?.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={stats.top_products.slice(0,5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(134,239,172,0.2)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9 }} />
                <YAxis dataKey="product" type="category" tick={{ fontSize: 9 }} width={60} />
                <Tooltip content={<GreenTooltip />} />
                <Bar dataKey="sales" radius={[0,4,4,0]}>
                  {stats.top_products.slice(0,5).map((_, i) => <Cell key={i} fill={GREENS[i % GREENS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart message="No product data" />}
        </div>

        <div className="glass-card p-4 md:p-5">
          <h2 className="section-title mb-3 md:mb-4">Region Breakdown</h2>
          {loading ? <SkeletonChart /> : stats?.region_breakdown?.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={stats.region_breakdown} dataKey="sales" nameKey="region" cx="50%" cy="50%" outerRadius={60}
                  label={({ region }) => region}>
                  {stats.region_breakdown.map((_, i) => <Cell key={i} fill={GREENS[i % GREENS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart message="No region data" />}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        <div className="glass-card p-4 md:p-5">
          <h2 className="section-title mb-3 md:mb-4 flex items-center gap-2">
            <MdAccessTime className="text-primary-500" /> Recent Activity
          </h2>
          {activity.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>No activity yet.</p>
          ) : (
            <div className="space-y-2">
              {activity.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-primary-100 dark:border-primary-900 gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{a.name}</p>
                    <p className="text-xs font-mono text-primary-400">{a.model}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <StatusBadge status={a.status} />
                    {a.accuracy && <p className="text-xs text-primary-600 mt-0.5">{a.accuracy}%</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card p-4 md:p-5">
          <h2 className="section-title mb-3 md:mb-4">Recent Forecasts</h2>
          {loading ? <SkeletonChart /> : stats?.recent_forecasts?.length > 0 ? (
            <div className="space-y-2">
              {stats.recent_forecasts.map((f) => (
                <div key={f.id} className="flex items-center justify-between py-2 border-b border-primary-100 dark:border-primary-900 gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{f.name}</p>
                    <p className="text-xs font-mono text-primary-400">{f.model}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <StatusBadge status={f.status} />
                    {f.accuracy && <p className="text-xs text-primary-600 mt-0.5">{f.accuracy}%</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>No forecasts yet.</p>}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = { completed:"badge-success", running:"badge-info", error:"badge-error", pending:"badge-warning" };
  return <span className={map[status] || "badge-warning"}>{status}</span>;
}

function EmptyChart({ message }) {
  return (
    <div className="h-36 md:h-48 flex flex-col items-center justify-center" style={{ color: "var(--text-muted)" }}>
      <MdAutoGraph className="text-3xl md:text-4xl mb-2 opacity-30" />
      <p className="text-xs md:text-sm opacity-60">{message}</p>
    </div>
  );
}

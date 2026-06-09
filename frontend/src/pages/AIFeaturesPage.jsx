import { useState, useEffect } from "react";
import { aiAPI, datasetsAPI } from "../services/api";
import toast from "react-hot-toast";
import { TbBrain } from "react-icons/tb";
import { MdTrendingUp, MdWarning, MdInventory, MdPeople, MdAutoGraph, MdFlashOn } from "react-icons/md";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from "recharts";
import { SkeletonChart } from "../components/ui/Skeleton";

const TABS = [
  { key:"recommendations", label:"Demand Recs", icon:MdTrendingUp },
  { key:"behavior", label:"Buying Behavior", icon:MdPeople },
  { key:"spikes", label:"Demand Spikes", icon:MdFlashOn },
  { key:"lowstock", label:"Low Stock", icon:MdWarning },
  { key:"optimization", label:"EOQ Optimizer", icon:MdInventory },
];
const GREENS = ["#22c55e","#16a34a","#4ade80","#166534","#86efac"];

export default function AIFeaturesPage() {
  const [tab, setTab] = useState("recommendations");
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [columns, setColumns] = useState([]);
  const [config, setConfig] = useState({ dataset_id:"", date_column:"date", value_column:"sales", product_column:"product", current_stock:"", reorder_lead_days:7, lookahead_periods:7 });

  useEffect(() => {
    datasetsAPI.list({ status:"processed" }).then((r) => {
      const ds = r.data?.datasets || r.data || [];
      setDatasets(Array.isArray(ds) ? ds : []);
    }).catch(() => {});
  }, []);

  const handleDatasetChange = async (id) => {
    setConfig((c) => ({ ...c, dataset_id: id }));
    if (!id) return;
    try { const r = await datasetsAPI.preview(id); setColumns(r.data.columns || []); } catch { setColumns([]); }
  };

  const handleRun = async () => {
    if (!config.dataset_id) { toast.error("Select a dataset"); return; }
    setLoading(true); setResult(null);
    try {
      const params = { dataset_id: parseInt(config.dataset_id), date_column: config.date_column, value_column: config.value_column };
      let r;
      if (tab === "recommendations") r = await aiAPI.recommendations({ ...params, product_column: config.product_column });
      else if (tab === "behavior") r = await aiAPI.buyingBehavior(params);
      else if (tab === "spikes") r = await aiAPI.demandSpikes({ ...params, lookahead_periods: parseInt(config.lookahead_periods) });
      else if (tab === "lowstock") r = await aiAPI.lowStock({ ...params, current_stock: config.current_stock ? parseFloat(config.current_stock) : undefined, reorder_lead_days: parseInt(config.reorder_lead_days) });
      else if (tab === "optimization") r = await aiAPI.inventoryOptimization(params);
      setResult(r.data);
      toast.success("AI analysis complete!");
    } catch (err) { toast.error(err.response?.data?.detail || "Analysis failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="pt-2 md:pt-0">
        <h1 className="page-title flex items-center gap-2"><TbBrain className="text-primary-500" /> Advanced AI Features</h1>
        <p className="text-xs md:text-sm mt-1" style={{ color:"var(--text-muted)" }}>Demand recommendations, buying behavior, spike prediction, and inventory optimization</p>
      </div>

      {/* Config */}
      <div className="glass-card p-4 md:p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2 md:col-span-1">
            <label className="label">Dataset</label>
            <select className="input-field" value={config.dataset_id} onChange={(e) => handleDatasetChange(e.target.value)}>
              <option value="">Select…</option>
              {datasets.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date Column</label>
            <select className="input-field" value={config.date_column} onChange={(e) => setConfig({ ...config, date_column: e.target.value })}>
              {columns.length ? columns.map((c) => <option key={c} value={c}>{c}</option>) : <option value="date">date</option>}
            </select>
          </div>
          <div>
            <label className="label">Value Column</label>
            <select className="input-field" value={config.value_column} onChange={(e) => setConfig({ ...config, value_column: e.target.value })}>
              {columns.length ? columns.map((c) => <option key={c} value={c}>{c}</option>) : <option value="sales">sales</option>}
            </select>
          </div>
          <div>
            <label className="label">Product Column</label>
            <select className="input-field" value={config.product_column} onChange={(e) => setConfig({ ...config, product_column: e.target.value })}>
              {columns.length ? columns.map((c) => <option key={c} value={c}>{c}</option>) : <option value="product">product</option>}
            </select>
          </div>
        </div>
        {(tab === "lowstock") && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="label">Current Stock (optional)</label>
              <input type="number" className="input-field" placeholder="Leave blank to auto-estimate" value={config.current_stock} onChange={(e) => setConfig({ ...config, current_stock: e.target.value })} />
            </div>
            <div>
              <label className="label">Lead Time (days)</label>
              <input type="number" className="input-field" value={config.reorder_lead_days} onChange={(e) => setConfig({ ...config, reorder_lead_days: e.target.value })} />
            </div>
          </div>
        )}
        {tab === "spikes" && (
          <div className="mt-3">
            <label className="label">Lookahead Periods</label>
            <input type="number" className="input-field w-32" min={1} max={30} value={config.lookahead_periods} onChange={(e) => setConfig({ ...config, lookahead_periods: e.target.value })} />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-primary-100 dark:bg-primary-900/50 p-1 rounded-xl overflow-x-auto">
        {TABS.map(({ key, label, icon:Icon }) => (
          <button key={key} onClick={() => { setTab(key); setResult(null); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0
              ${tab === key ? "bg-white dark:bg-primary-800 shadow-sm" : "hover:opacity-80"}`}
            style={{ color: tab === key ? "var(--text)" : "var(--text-muted)" }}>
            <Icon className="text-base" />{label}
          </button>
        ))}
      </div>

      <button onClick={handleRun} disabled={loading || !config.dataset_id} className="btn-primary flex items-center gap-2">
        {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        {loading ? "Analyzing…" : "Run AI Analysis"}
      </button>

      {loading && <SkeletonChart />}

      {result && !loading && (
        <div className="space-y-4 animate-slide-up">
          {tab === "recommendations" && <RecommendationsResult data={result} />}
          {tab === "behavior" && <BehaviorResult data={result} />}
          {tab === "spikes" && <SpikesResult data={result} />}
          {tab === "lowstock" && <LowStockResult data={result} />}
          {tab === "optimization" && <OptimizationResult data={result} />}
        </div>
      )}
    </div>
  );
}

function RecommendationsResult({ data }) {
  const prioColors = { high:"badge-error", medium:"badge-warning", low:"badge-success" };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Total Products", data.total_products], ["High Priority", data.high_priority_count], ["Overall Trend", data.overall_trend], ["Growth Rate", `${data.growth_rate_pct}%`]].map(([label, val]) => (
          <div key={label} className="stat-card"><p className="text-xs text-primary-500 uppercase">{label}</p><p className="font-display text-xl font-bold mt-1" style={{ color:"var(--text)" }}>{val}</p></div>
        ))}
      </div>
      <div className="glass-card p-4 md:p-5">
        <h2 className="section-title mb-4">Product Recommendations</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-primary-100 dark:border-primary-800">
              <th className="table-th">Product</th><th className="table-th">Avg Demand</th>
              <th className="table-th">Trend</th><th className="table-th">Volatility</th>
              <th className="table-th">Priority</th><th className="table-th">Action</th>
            </tr></thead>
            <tbody>
              {data.recommendations?.map((r, i) => (
                <tr key={i} className="border-b border-primary-50 dark:border-primary-900 hover:bg-primary-50/50 dark:hover:bg-primary-900/30">
                  <td className="table-td font-medium">{r.product}</td>
                  <td className="table-td">{r.avg_demand}</td>
                  <td className="table-td capitalize">{r.trend}</td>
                  <td className="table-td">{r.volatility}</td>
                  <td className="table-td"><span className={prioColors[r.priority]}>{r.priority}</span></td>
                  <td className="table-td text-xs text-primary-600 dark:text-primary-400">{r.recommendation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BehaviorResult({ data }) {
  const dowData = Object.entries(data.day_of_week_pattern || {}).map(([k, v]) => ({ day: k.slice(0,3), value: v }));
  const monthData = Object.entries(data.monthly_pattern || {}).map(([k, v]) => ({ month: k, value: v }));
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="glass-card p-4 md:p-5">
        <h2 className="section-title mb-4">Day of Week Pattern</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={dowData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(134,239,172,0.2)" />
            <XAxis dataKey="day" tick={{ fontSize:10 }} />
            <YAxis tick={{ fontSize:10 }} />
            <Tooltip />
            <Bar dataKey="value" radius={[4,4,0,0]}>
              {dowData.map((_, i) => <Cell key={i} fill={GREENS[i % GREENS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="glass-card p-4 md:p-5">
        <h2 className="section-title mb-4">Monthly Pattern</h2>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={monthData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(134,239,172,0.2)" />
            <XAxis dataKey="month" tick={{ fontSize:10 }} />
            <YAxis tick={{ fontSize:10 }} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} dot={{ r:3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="glass-card p-4 md:p-5 md:col-span-2">
        <h2 className="section-title mb-3">Key Insights</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[["Peak Day", data.peak_day], ["Peak Month", data.peak_month], ["Peak Quarter", data.peak_quarter]].map(([label, val]) => (
            <div key={label} className="bg-primary-50 dark:bg-primary-900/40 rounded-xl p-3 text-center">
              <p className="text-xs text-primary-500">{label}</p>
              <p className="font-bold text-lg mt-1" style={{ color:"var(--text)" }}>{val || "—"}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SpikesResult({ data }) {
  const sevColors = { high:"badge-error", medium:"badge-warning" };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card"><p className="text-xs text-primary-500 uppercase">Spikes Predicted</p><p className="font-display text-2xl font-bold mt-1" style={{ color:"var(--text)" }}>{data.spike_count}</p></div>
        <div className="stat-card"><p className="text-xs text-primary-500 uppercase">Spike Threshold</p><p className="font-display text-2xl font-bold mt-1" style={{ color:"var(--text)" }}>{data.spike_threshold}</p></div>
      </div>
      <div className="glass-card p-4 md:p-5">
        <p className="text-sm text-primary-600 dark:text-primary-400 mb-4">{data.recommendation}</p>
        {data.spikes?.length > 0 && (
          <div className="space-y-2">
            {data.spikes.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/40 rounded-xl gap-2">
                <div>
                  <p className="font-mono text-xs text-primary-500">{s.date}</p>
                  <p className="font-bold text-sm mt-0.5" style={{ color:"var(--text)" }}>Predicted: {s.predicted_value} (×{s.spike_factor} normal)</p>
                </div>
                <span className={sevColors[s.severity] || "badge-info"}>{s.severity}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LowStockResult({ data }) {
  const riskColors = { critical:"badge-error", high:"badge-error", medium:"badge-warning", low:"badge-success" };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Risk Level", <span key="r" className={riskColors[data.risk_level]}>{data.risk_level?.toUpperCase()}</span>],
          ["Days Until Stockout", data.days_until_stockout || "30+"],
          ["Avg Daily Demand", data.avg_daily_demand],
          ["Reorder Qty", data.recommended_reorder_quantity]].map(([label, val]) => (
          <div key={label} className="stat-card"><p className="text-xs text-primary-500 uppercase">{label}</p><p className="font-display text-lg font-bold mt-1" style={{ color:"var(--text)" }}>{val}</p></div>
        ))}
      </div>
      <div className="glass-card p-4 md:p-5">
        <h2 className="section-title mb-3">Recommendation</h2>
        <p className="text-sm text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/40 p-3 rounded-xl">{data.recommendation}</p>
        {data.reorder_date && <p className="text-xs text-primary-500 mt-2">Reorder by: <strong>{data.reorder_date}</strong></p>}
      </div>
    </div>
  );
}

function OptimizationResult({ data }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[["Annual Demand", data.annual_demand], ["EOQ (units)", data.economic_order_quantity],
          ["Orders/Year", data.orders_per_year], ["Reorder Every", `${data.reorder_interval_days} days`],
          ["Safety Stock", data.safety_stock], ["Annual Cost", `$${data.estimated_annual_cost}`]].map(([label, val]) => (
          <div key={label} className="stat-card"><p className="text-xs text-primary-500 uppercase">{label}</p><p className="font-display text-lg font-bold mt-1" style={{ color:"var(--text)" }}>{val}</p></div>
        ))}
      </div>
      <div className="glass-card p-4 md:p-5">
        <h2 className="section-title mb-3">Optimization Suggestions</h2>
        <div className="space-y-2">
          {data.suggestions?.map((s, i) => (
            <div key={i} className="flex items-start gap-2 p-3 bg-primary-50 dark:bg-primary-900/40 rounded-xl">
              <span className="text-primary-500 font-bold text-sm flex-shrink-0">{i+1}.</span>
              <p className="text-sm text-primary-700 dark:text-primary-300">{s}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { analyticsAPI, datasetsAPI } from "../services/api";
import toast from "react-hot-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line, PieChart, Pie, Legend,
} from "recharts";
import { MdAnalytics, MdWarning, MdTrendingUp, MdInventory, MdSearch } from "react-icons/md";
import { SkeletonChart } from "../components/ui/Skeleton";

const GREENS = ["#22c55e", "#16a34a", "#4ade80", "#166534", "#86efac", "#14532d"];

export default function AnalyticsPage() {
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState("");
  const [tab, setTab] = useState("region");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [colConfig, setColConfig] = useState({ date: "date", value: "sales", region: "region", category: "product" });

  useEffect(() => {
    datasetsAPI.list({ status: "processed" }).then((r) => {
      const ds = r.data?.datasets || r.data || [];
      setDatasets(Array.isArray(ds) ? ds : []);
    }).catch(() => {});
  }, []);

  const handleDatasetChange = async (id) => {
    setSelectedDataset(id);
    setData(null);
    if (!id) return;
    try {
      const r = await datasetsAPI.preview(id);
      setColumns(r.data.columns || []);
    } catch {}
  };

  const fetchAnalytics = async () => {
    if (!selectedDataset) { toast.error("Select a dataset first"); return; }
    setLoading(true);
    setData(null);
    try {
      let res;
      const dsId = parseInt(selectedDataset);
      if (tab === "region") {
        res = await analyticsAPI.regionWise({ dataset_id: dsId, date_column: colConfig.date, value_column: colConfig.value, region_column: colConfig.region });
      } else if (tab === "category") {
        res = await analyticsAPI.categoryWise({ dataset_id: dsId, value_column: colConfig.value, category_column: colConfig.category });
      } else if (tab === "revenue") {
        res = await analyticsAPI.revenuePrediction({ dataset_id: dsId, date_column: colConfig.date, value_column: colConfig.value, forecast_months: 3 });
      } else if (tab === "inventory") {
        res = await analyticsAPI.inventoryRisk({ dataset_id: dsId, value_column: colConfig.value, date_column: colConfig.date });
      }
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Analytics failed");
    } finally { setLoading(false); }
  };

  const tabs = [
    { key: "region", label: "Region-wise", icon: MdAnalytics },
    { key: "category", label: "Category-wise", icon: MdSearch },
    { key: "revenue", label: "Revenue Prediction", icon: MdTrendingUp },
    { key: "inventory", label: "Inventory Risk", icon: MdInventory },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="pt-2 md:pt-0">
        <h1 className="page-title">Advanced Analytics</h1>
        <p className="text-primary-500 text-xs md:text-sm mt-1">Deep insights into your demand patterns</p>
      </div>

      {/* Config */}
      <div className="glass-card p-4 md:p-5">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="col-span-2 md:col-span-1">
            <label className="label">Dataset</label>
            <select className="input-field" value={selectedDataset} onChange={(e) => handleDatasetChange(e.target.value)}>
              <option value="">Select…</option>
              {datasets.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date Col</label>
            <select className="input-field" value={colConfig.date} onChange={(e) => setColConfig({ ...colConfig, date: e.target.value })}>
              {columns.length ? columns.map((c) => <option key={c} value={c}>{c}</option>) : <option value="date">date</option>}
            </select>
          </div>
          <div>
            <label className="label">Value Col</label>
            <select className="input-field" value={colConfig.value} onChange={(e) => setColConfig({ ...colConfig, value: e.target.value })}>
              {columns.length ? columns.map((c) => <option key={c} value={c}>{c}</option>) : <option value="sales">sales</option>}
            </select>
          </div>
          <div>
            <label className="label">Region Col</label>
            <select className="input-field" value={colConfig.region} onChange={(e) => setColConfig({ ...colConfig, region: e.target.value })}>
              {columns.length ? columns.map((c) => <option key={c} value={c}>{c}</option>) : <option value="region">region</option>}
            </select>
          </div>
          <div>
            <label className="label">Category Col</label>
            <select className="input-field" value={colConfig.category} onChange={(e) => setColConfig({ ...colConfig, category: e.target.value })}>
              {columns.length ? columns.map((c) => <option key={c} value={c}>{c}</option>) : <option value="product">product</option>}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-primary-100 p-1 rounded-xl overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => { setTab(key); setData(null); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0
              ${tab === key ? "bg-white text-primary-900 shadow-sm" : "text-primary-600 hover:text-primary-800"}`}>
            <Icon className="text-base" />{label}
          </button>
        ))}
      </div>

      <button onClick={fetchAnalytics} disabled={loading || !selectedDataset} className="btn-primary flex items-center gap-2">
        {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        {loading ? "Analyzing…" : "Run Analytics"}
      </button>

      {/* Results */}
      {loading && <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><SkeletonChart /><SkeletonChart /></div>}

      {data && !loading && (
        <div className="animate-slide-up space-y-4">
          {tab === "region" && <RegionAnalytics data={data} />}
          {tab === "category" && <CategoryAnalytics data={data} />}
          {tab === "revenue" && <RevenueAnalytics data={data} />}
          {tab === "inventory" && <InventoryAnalytics data={data} />}
        </div>
      )}
    </div>
  );
}

function RegionAnalytics({ data }) {
  const GREENS = ["#22c55e","#16a34a","#4ade80","#166534","#86efac"];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="glass-card p-4 md:p-5">
        <h2 className="section-title mb-4">Sales by Region</h2>
        <div className="mb-3 flex gap-3 text-xs text-primary-500 flex-wrap">
          <span>Top Region: <strong className="text-primary-800">{data.top_region}</strong></span>
          <span>Total: <strong className="text-primary-800">${data.total_value?.toLocaleString()}</strong></span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.regions}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dcfce7" />
            <XAxis dataKey="region" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="total" radius={[4,4,0,0]}>
              {data.regions?.map((_, i) => <Cell key={i} fill={GREENS[i % GREENS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="glass-card p-4 md:p-5">
        <h2 className="section-title mb-4">Region Share</h2>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data.regions} dataKey="share_pct" nameKey="region" cx="50%" cy="50%" outerRadius={70}
              label={({ region, share_pct }) => `${region} ${share_pct}%`}>
              {data.regions?.map((_, i) => <Cell key={i} fill={GREENS[i % GREENS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="glass-card p-4 md:p-5 md:col-span-2">
        <h2 className="section-title mb-3">Region Details</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-primary-100">
              <th className="table-th">Region</th><th className="table-th">Total</th>
              <th className="table-th">Average</th><th className="table-th">Count</th><th className="table-th">Share</th>
            </tr></thead>
            <tbody>
              {data.regions?.map((r, i) => (
                <tr key={i} className="border-b border-primary-50 hover:bg-primary-50/50">
                  <td className="table-td font-medium">{r.region}</td>
                  <td className="table-td">{r.total?.toLocaleString()}</td>
                  <td className="table-td">{r.mean?.toFixed(2)}</td>
                  <td className="table-td">{r.count}</td>
                  <td className="table-td"><span className="badge-success">{r.share_pct}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CategoryAnalytics({ data }) {
  const GREENS = ["#22c55e","#16a34a","#4ade80","#166534","#86efac","#14532d"];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="glass-card p-4 md:p-5">
        <h2 className="section-title mb-4">Sales by Category</h2>
        <div className="mb-2 text-xs text-primary-500">Top: <strong className="text-primary-800">{data.top_category}</strong></div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.categories?.slice(0, 8)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#dcfce7" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis dataKey="product" type="category" tick={{ fontSize: 10 }} width={70} />
            <Tooltip />
            <Bar dataKey="total" radius={[0,4,4,0]}>
              {data.categories?.slice(0,8).map((_, i) => <Cell key={i} fill={GREENS[i % GREENS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="glass-card p-4 md:p-5">
        <h2 className="section-title mb-4">Category Breakdown</h2>
        <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
          {data.categories?.map((c, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-primary-50">
              <span className="text-sm text-primary-900">{c.product}</span>
              <div className="flex items-center gap-3 text-xs text-primary-500">
                <span className="font-mono">{c.total?.toLocaleString()}</span>
                <span className="badge-success">{c.share_pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RevenueAnalytics({ data }) {
  const combined = [
    ...(data.historical_monthly || []).map(d => ({ ...d, type: "historical" })),
    ...(data.predictions || []).map(d => ({ month: d.month, revenue: d.predicted_revenue, type: "forecast" })),
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="glass-card p-4 md:p-5 md:col-span-2">
        <h2 className="section-title mb-4">Revenue Trend & Prediction</h2>
        <div className="flex gap-3 mb-4 flex-wrap text-xs">
          <div className="bg-primary-50 rounded-lg px-3 py-1.5">
            Avg Monthly: <strong className="text-primary-800">${data.avg_monthly_revenue?.toLocaleString()}</strong>
          </div>
          <div className={`rounded-lg px-3 py-1.5 ${data.growth_trend === "positive" ? "bg-primary-50 text-primary-700" : "bg-red-50 text-red-700"}`}>
            Growth: <strong>{data.avg_growth_rate_pct?.toFixed(1)}%</strong> ({data.growth_trend})
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={combined}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dcfce7" />
            <XAxis dataKey="month" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#166534" strokeWidth={2} dot={false} name="Revenue" connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="glass-card p-4 md:p-5 md:col-span-2">
        <h2 className="section-title mb-3">Predictions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {data.predictions?.map((p, i) => (
            <div key={i} className="bg-primary-50 rounded-xl p-3 text-center">
              <p className="text-xs text-primary-500">{p.month}</p>
              <p className="font-display text-lg font-bold text-primary-900 mt-1">${p.predicted_revenue?.toLocaleString()}</p>
              <p className={`text-xs mt-0.5 ${p.growth_rate_pct >= 0 ? "text-primary-600" : "text-red-500"}`}>
                {p.growth_rate_pct >= 0 ? "+" : ""}{p.growth_rate_pct?.toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InventoryAnalytics({ data }) {
  const riskColors = { low: "badge-success", medium: "badge-warning", high: "badge-error" };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="glass-card p-4 md:p-5">
        <h2 className="section-title mb-4">Risk Assessment</h2>
        <div className="flex items-center gap-3 mb-4">
          <span className={riskColors[data.risk_level]}>{data.risk_level?.toUpperCase()} RISK</span>
          <p className="text-sm text-primary-600">{data.risk_message}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            ["Mean Demand", data.mean_demand],
            ["Std Deviation", data.std_demand],
            ["Safety Stock", data.recommended_safety_stock],
            ["Reorder Point", data.recommended_reorder_point],
            ["Demand Spikes", data.demand_spikes],
            ["Risk (CV)", `${(data.coefficient_of_variation * 100)?.toFixed(1)}%`],
          ].map(([label, value]) => (
            <div key={label} className="bg-primary-50 rounded-xl p-3">
              <p className="text-xs text-primary-500">{label}</p>
              <p className="font-bold text-primary-900 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="glass-card p-4 md:p-5">
        <h2 className="section-title mb-4">Business Insights</h2>
        <div className="space-y-2">
          {data.insights?.map((insight, i) => (
            <div key={i} className="flex items-start gap-2 p-2.5 bg-primary-50 rounded-xl">
              <MdWarning className="text-primary-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-primary-700">{insight}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

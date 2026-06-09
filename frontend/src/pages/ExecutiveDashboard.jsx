import { useState, useEffect } from "react";
import { intelligenceAPI } from "../services/api";
import { MdTrendingUp, MdAutoGraph, MdShowChart, MdStorage, MdDownload, MdRefresh } from "react-icons/md";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { SkeletonCard, SkeletonChart } from "../components/ui/Skeleton";
import toast from "react-hot-toast";
 
const GREENS = ["#22c55e", "#16a34a", "#4ade80", "#166534", "#86efac", "#14532d"];
 
export default function ExecutiveDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("monthly");
  const [generating, setGenerating] = useState(false);
 
  useEffect(() => { fetchData(); }, [period]);
 
  const fetchData = async () => {
    setLoading(true);
    try { const r = await intelligenceAPI.executiveDashboard(period); setData(r.data); }
    catch {} finally { setLoading(false); }
  };
 
  const generateReport = async () => {
    if (!data) return;
    setGenerating(true);
    try {
      // Generate report record
      const r = await intelligenceAPI.generateReport({
        report_type: period,
        title: `Executive Report — ${new Date().toLocaleDateString()}`,
      });
 
      // Build and download HTML report
      const report = r.data;
      const content = report.content;
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${report.title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #14532d; background: #f0fdf4; }
    h1 { color: #166534; border-bottom: 2px solid #22c55e; padding-bottom: 10px; }
    h2 { color: #16a34a; margin-top: 30px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 20px 0; }
    .kpi-card { background: white; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; }
    .kpi-card .label { font-size: 11px; color: #16a34a; text-transform: uppercase; letter-spacing: 0.5px; }
    .kpi-card .value { font-size: 24px; font-weight: bold; color: #14532d; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #166534; color: white; padding: 10px; text-align: left; font-size: 13px; }
    td { padding: 9px 10px; border-bottom: 1px solid #dcfce7; font-size: 13px; }
    tr:nth-child(even) td { background: #f0fdf4; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; }
    .badge-good { background: #dcfce7; color: #166534; }
    .rec-item { background: white; border-left: 4px solid #22c55e; padding: 10px 14px; margin: 8px 0; border-radius: 4px; font-size: 13px; }
    .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #bbf7d0; font-size: 11px; color: #16a34a; }
  </style>
</head>
<body>
  <h1>📊 ${report.title}</h1>
  <p style="color:#16a34a;font-size:13px">Generated: ${content.generated_at} &nbsp;|&nbsp; Period: ${period}</p>
 
  <h2>Executive Summary</h2>
  <div class="kpi-grid">
    <div class="kpi-card"><div class="label">Total Forecasts</div><div class="value">${content.summary.total_forecasts}</div></div>
    <div class="kpi-card"><div class="label">Total Datasets</div><div class="value">${content.summary.total_datasets}</div></div>
    <div class="kpi-card"><div class="label">Avg Accuracy</div><div class="value">${content.summary.avg_accuracy}%</div></div>
    <div class="kpi-card"><div class="label">Revenue Analyzed</div><div class="value">$${(content.summary.total_revenue_analyzed/1000).toFixed(1)}K</div></div>
    <div class="kpi-card"><div class="label">Predicted Revenue</div><div class="value">$${(content.summary.predicted_revenue/1000).toFixed(1)}K</div></div>
    <div class="kpi-card"><div class="label">Models Used</div><div class="value">${Object.keys(content.model_usage || {}).length}</div></div>
  </div>
 
  <h2>Top Performing Forecasts</h2>
  <table>
    <tr><th>Forecast Name</th><th>Model</th><th>Accuracy</th></tr>
    ${content.top_forecasts?.map(f => `
    <tr><td>${f.name}</td><td>${f.model.replace(/_/g,' ')}</td>
    <td><span class="badge badge-good">${f.accuracy ? f.accuracy + '%' : 'N/A'}</span></td></tr>`).join('') || '<tr><td colspan="3">No data</td></tr>'}
  </table>
 
  <h2>Model Usage Breakdown</h2>
  <table>
    <tr><th>Model</th><th>Times Used</th></tr>
    ${Object.entries(content.model_usage || {}).map(([k,v]) => `<tr><td>${k.replace(/_/g,' ')}</td><td>${v}</td></tr>`).join('') || '<tr><td colspan="2">No data</td></tr>'}
  </table>
 
  <h2>AI Recommendations</h2>
  ${content.recommendations?.map(r => `<div class="rec-item">💡 ${r}</div>`).join('') || '<p>No recommendations yet.</p>'}
 
  <div class="footer">
    ForecastIQ Enterprise v5.0 &nbsp;|&nbsp; Confidential — For Internal Use Only
  </div>
</body>
</html>`;
 
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `executive_report_${period}_${new Date().toISOString().slice(0,10)}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded!");
    } catch (err) {
      toast.error("Failed to generate report");
    } finally { setGenerating(false); }
  };
 
  const kpis = data ? [
    { label: "Total Revenue Analyzed", value: `$${(data.kpis.total_revenue / 1000).toFixed(1)}K`, icon: MdTrendingUp, sub: "Historical data" },
    { label: "Predicted Revenue", value: `$${(data.kpis.predicted_revenue / 1000).toFixed(1)}K`, icon: MdShowChart, sub: `${data.kpis.revenue_growth_pct > 0 ? "+" : ""}${data.kpis.revenue_growth_pct}% projected` },
    { label: "Forecast Accuracy", value: `${data.kpis.avg_accuracy}%`, icon: MdAutoGraph, sub: `${data.kpis.total_forecasts} forecasts` },
    { label: "Total Datasets", value: data.kpis.total_datasets, icon: MdStorage, sub: "Uploaded" },
  ] : [];
 
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-start justify-between gap-3 pt-2 md:pt-0">
        <div>
          <h1 className="page-title">Executive Dashboard</h1>
          <p className="text-xs md:text-sm mt-1" style={{ color: "var(--text-muted)" }}>Business intelligence and performance overview</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <select className="input-field text-xs py-2 w-32" value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </select>
          <button onClick={fetchData} className="btn-secondary p-2 text-primary-600"><MdRefresh className="text-lg" /></button>
          <button onClick={generateReport} disabled={generating || !data} className="btn-primary flex items-center gap-1.5 text-xs px-3 py-2">
            {generating ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <MdDownload />}
            <span className="hidden sm:inline">Export Report</span>
          </button>
        </div>
      </div>
 
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {loading ? [...Array(4)].map((_, i) => <SkeletonCard key={i} />) : kpis.map(({ label, value, icon: Icon, sub }) => (
          <div key={label} className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-primary-500 uppercase tracking-wider">{label}</p>
                <p className="font-display text-xl md:text-2xl font-bold mt-1" style={{ color: "var(--text)" }}>{value}</p>
                <p className="text-xs text-primary-400 mt-0.5">{sub}</p>
              </div>
              <div className="w-8 h-8 md:w-9 md:h-9 bg-primary-100 dark:bg-primary-900 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="text-primary-600 dark:text-primary-400 text-base md:text-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
 
      {/* Revenue Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
        <div className="glass-card p-4 md:p-5 lg:col-span-2">
          <h2 className="section-title mb-4">Revenue Trend</h2>
          {loading ? <SkeletonChart /> : data?.revenue_trend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.revenue_trend}>
                <defs>
                  <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(134,239,172,0.15)" />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} fill="url(#rg)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-center py-8 text-primary-400">No revenue data available yet.</p>}
        </div>
 
        <div className="glass-card p-4 md:p-5">
          <h2 className="section-title mb-4">Model Performance</h2>
          {loading ? <SkeletonChart /> : data?.model_performance?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.model_performance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(134,239,172,0.15)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9 }} domain={[0, 100]} unit="%" />
                <YAxis dataKey="model" type="category" tick={{ fontSize: 8 }} width={85} />
                <Tooltip />
                <Bar dataKey="avg_accuracy" radius={[0, 4, 4, 0]}>
                  {data.model_performance.map((_, i) => <Cell key={i} fill={GREENS[i % GREENS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-center py-8 text-primary-400">Complete forecasts to see model performance.</p>}
        </div>
      </div>
 
      {/* Top Products & Regions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div className="glass-card p-4 md:p-5">
          <h2 className="section-title mb-4">Top Products</h2>
          {loading ? <SkeletonChart /> : data?.top_products?.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.top_products.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(134,239,172,0.15)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9 }} />
                <YAxis dataKey="product" type="category" tick={{ fontSize: 9 }} width={65} />
                <Tooltip />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {data.top_products.slice(0, 5).map((_, i) => <Cell key={i} fill={GREENS[i % GREENS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-center py-8 text-primary-400">No product data yet.</p>}
        </div>
 
        <div className="glass-card p-4 md:p-5">
          <h2 className="section-title mb-4">Region Performance</h2>
          {loading ? <SkeletonChart /> : data?.region_performance?.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={data.region_performance} dataKey="revenue" nameKey="region" cx="50%" cy="50%" outerRadius={65}
                  label={({ region }) => region}>
                  {data.region_performance.map((_, i) => <Cell key={i} fill={GREENS[i % GREENS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-center py-8 text-primary-400">No region data yet.</p>}
        </div>
      </div>
 
      {/* Recent Forecasts */}
      {data?.recent_forecasts?.length > 0 && (
        <div className="glass-card p-4 md:p-5">
          <h2 className="section-title mb-4">Recent Forecasts</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-primary-100 dark:border-primary-800">
                <th className="table-th">Name</th><th className="table-th">Model</th>
                <th className="table-th">Accuracy</th><th className="table-th">Status</th><th className="table-th">Date</th>
              </tr></thead>
              <tbody>
                {data.recent_forecasts.map((f) => (
                  <tr key={f.id} className="border-b border-primary-50 dark:border-primary-900 hover:bg-primary-50/50 dark:hover:bg-primary-900/30">
                    <td className="table-td font-medium">{f.name}</td>
                    <td className="table-td font-mono text-xs">{f.model}</td>
                    <td className="table-td">{f.accuracy ? <span className="font-bold text-primary-600">{f.accuracy}%</span> : "—"}</td>
                    <td className="table-td"><span className={f.status === "completed" ? "badge-success" : "badge-info"}>{f.status}</span></td>
                    <td className="table-td text-primary-400">{f.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
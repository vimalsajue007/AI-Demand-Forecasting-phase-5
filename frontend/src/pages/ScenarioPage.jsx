import { useState, useEffect } from "react";
import { scenariosAPI, datasetsAPI } from "../services/api";
import toast from "react-hot-toast";
import { MdScience, MdAdd, MdDelete, MdCompare, MdSave, MdClose } from "react-icons/md";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { SkeletonChart } from "../components/ui/Skeleton";
 
const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];
 
export default function ScenarioPage() {
  const [scenarios, setScenarios] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState([]);
  const [compareResult, setCompareResult] = useState(null);
  const [compareError, setCompareError] = useState(null);
  const [form, setForm] = useState({
    name: "", description: "", dataset_id: "", date_column: "date",
    target_column: "revenue", periods: 12, model_type: "linear_regression",
    variables: { sales_growth: 0, seasonality: 1.0, demand_factor: 1.0, price_change: 0, cost_reduction: 0 },
  });
 
  useEffect(() => {
    Promise.all([scenariosAPI.list(), datasetsAPI.list({ status: "processed" })])
      .then(([sr, dr]) => {
        setScenarios(sr.data || []);
        const ds = dr.data?.datasets || dr.data || [];
        setDatasets(Array.isArray(ds) ? ds : []);
      }).finally(() => setLoading(false));
  }, []);
 
  const handleDatasetChange = async (id) => {
    setForm((f) => ({ ...f, dataset_id: id }));
    if (!id) return;
    try { const r = await datasetsAPI.preview(id); setColumns(r.data.columns || []); }
    catch { setColumns([]); }
  };
 
  const handleRun = async (e) => {
    e.preventDefault();
    if (!form.name || !form.dataset_id) { toast.error("Fill required fields"); return; }
    setRunning(true);
    try {
      const r = await scenariosAPI.create({
        ...form,
        dataset_id: parseInt(form.dataset_id),
        periods: parseInt(form.periods),
      });
      setScenarios((prev) => [r.data, ...prev]);
      toast.success("Scenario completed!");
      setShowForm(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    } finally { setRunning(false); }
  };
 
  const handleSave = async (id) => {
    await scenariosAPI.update(id, { is_saved: true });
    setScenarios((prev) => prev.map((s) => s.id === id ? { ...s, is_saved: true } : s));
    toast.success("Scenario saved!");
  };
 
  const handleDelete = async (id) => {
    if (!confirm("Delete scenario?")) return;
    await scenariosAPI.delete(id);
    setScenarios((prev) => prev.filter((s) => s.id !== id));
    setSelected((prev) => prev.filter((x) => x !== id));
    if (compareResult) setCompareResult(null);
    toast.success("Deleted");
  };
 
  const handleCompare = async () => {
    if (selected.length < 2) { toast.error("Select at least 2 scenarios"); return; }
    setCompareError(null);
    setCompareResult(null);
    try {
      const r = await scenariosAPI.compare(selected);
      setCompareResult(r.data);
    } catch (err) {
      setCompareError(err.response?.data?.detail || "Compare failed");
      toast.error("Compare failed");
    }
  };
 
  const toggleSelect = (id) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
 
  // Build chart data using index-based keys to avoid spaces in names
  const buildCompareChart = () => {
    if (!compareResult?.scenarios?.length) return { chartData: [], keys: [] };
    try {
      const maxLen = Math.max(...compareResult.scenarios.map((s) => (s.predictions || []).length));
      const keys = compareResult.scenarios.map((_, i) => `scenario_${i}`);
      const chartData = Array.from({ length: maxLen }, (_, i) => {
        const row = { period: `P${i + 1}` };
        compareResult.scenarios.forEach((s, si) => {
          row[keys[si]] = s.predictions?.[i]?.yhat ?? 0;
        });
        return row;
      });
      return { chartData, keys };
    } catch {
      return { chartData: [], keys: [] };
    }
  };
 
  const varLabels = [
    { key: "sales_growth", label: "Sales Growth (%)", min: -50, max: 100, step: 1 },
    { key: "seasonality", label: "Seasonality Factor", min: 0.5, max: 2.0, step: 0.1 },
    { key: "demand_factor", label: "Demand Factor", min: 0.5, max: 2.0, step: 0.1 },
    { key: "price_change", label: "Price Change (%)", min: -30, max: 50, step: 1 },
    { key: "cost_reduction", label: "Cost Reduction (%)", min: 0, max: 30, step: 1 },
  ];
 
  const { chartData, keys } = buildCompareChart();
 
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-start justify-between gap-3 pt-2 md:pt-0">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <MdScience className="text-primary-500" /> What-If Scenario Analysis
          </h1>
          <p className="text-xs md:text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Model multiple forecast scenarios by adjusting business variables
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {selected.length >= 2 && (
            <button onClick={handleCompare}
              className="btn-secondary flex items-center gap-1.5 text-xs md:text-sm px-3 py-2">
              <MdCompare /> Compare ({selected.length})
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-1.5 text-xs md:text-sm px-3 py-2 md:px-5 md:py-2.5">
            <MdAdd /><span className="hidden sm:inline">New Scenario</span>
          </button>
        </div>
      </div>
 
      {/* Create Form */}
      {showForm && (
        <div className="glass-card p-4 md:p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Configure Scenario</h2>
            <button onClick={() => setShowForm(false)} className="text-primary-400 hover:text-primary-600">
              <MdClose />
            </button>
          </div>
          <form onSubmit={handleRun} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Scenario Name *</label>
                <input className="input-field" placeholder="e.g. Optimistic 2024"
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Dataset *</label>
                <select className="input-field" value={form.dataset_id}
                  onChange={(e) => handleDatasetChange(e.target.value)}>
                  <option value="">Select…</option>
                  {datasets.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Date Column</label>
                <select className="input-field" value={form.date_column}
                  onChange={(e) => setForm({ ...form, date_column: e.target.value })}>
                  {columns.length
                    ? columns.map((c) => <option key={c} value={c}>{c}</option>)
                    : <option value="date">date</option>}
                </select>
              </div>
              <div>
                <label className="label">Target Column</label>
                <select className="input-field" value={form.target_column}
                  onChange={(e) => setForm({ ...form, target_column: e.target.value })}>
                  {columns.length
                    ? columns.map((c) => <option key={c} value={c}>{c}</option>)
                    : <option value="revenue">revenue</option>}
                </select>
              </div>
            </div>
 
            <div>
              <h3 className="section-title mb-3">Business Variables</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {varLabels.map(({ key, label, min, max, step }) => (
                  <div key={key} className="bg-primary-50 dark:bg-primary-900/40 rounded-xl p-3">
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{label}</label>
                      <span className="text-xs font-bold text-primary-600">{form.variables[key]}</span>
                    </div>
                    <input type="range" min={min} max={max} step={step}
                      value={form.variables[key]}
                      onChange={(e) => setForm((f) => ({
                        ...f, variables: { ...f.variables, [key]: parseFloat(e.target.value) },
                      }))}
                      className="w-full accent-primary-500" />
                    <div className="flex justify-between text-[10px] text-primary-400 mt-0.5">
                      <span>{min}</span><span>{max}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
 
            <button type="submit" disabled={running} className="btn-primary flex items-center gap-2">
              {running && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {running ? "Running Scenario…" : "Run Scenario"}
            </button>
          </form>
        </div>
      )}
 
      {/* Comparison Result */}
      {compareResult && (
        <div className="glass-card p-4 md:p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2">
              <MdCompare className="text-primary-500" /> Scenario Comparison
            </h2>
            <button onClick={() => setCompareResult(null)} className="text-primary-400 hover:text-primary-600">
              <MdClose />
            </button>
          </div>
 
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {compareResult.scenarios.map((s, i) => (
              <div key={s.id} className="bg-primary-50 dark:bg-primary-900/40 rounded-xl p-3 border-l-4"
                style={{ borderColor: COLORS[i] }}>
                <p className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>{s.name}</p>
                <p className="text-lg font-bold mt-1" style={{ color: COLORS[i] }}>
                  {s.adjusted_total?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className={`text-xs mt-0.5 ${s.change_pct >= 0 ? "text-primary-500" : "text-red-400"}`}>
                  {s.change_pct >= 0 ? "+" : ""}{s.change_pct}% vs base
                </p>
              </div>
            ))}
          </div>
 
          {/* Chart */}
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(134,239,172,0.2)" />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value, name) => {
                    const idx = parseInt(name.replace("scenario_", ""));
                    const scenarioName = compareResult.scenarios[idx]?.name || name;
                    return [value?.toLocaleString(undefined, { maximumFractionDigits: 0 }), scenarioName];
                  }}
                />
                <Legend
                  formatter={(value) => {
                    const idx = parseInt(value.replace("scenario_", ""));
                    return compareResult.scenarios[idx]?.name || value;
                  }}
                />
                {keys.map((key, i) => (
                  <Line key={key} type="monotone" dataKey={key}
                    stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-primary-400 text-center py-6">No prediction data to chart.</p>
          )}
        </div>
      )}
 
      {compareError && (
        <div className="glass-card p-4 border-l-4 border-red-400 bg-red-50 dark:bg-red-900/20">
          <p className="text-sm text-red-600">{compareError}</p>
        </div>
      )}
 
      {/* Scenarios List */}
      <div className="glass-card p-4 md:p-5">
        <h2 className="section-title mb-4">Saved Scenarios</h2>
        {loading ? <SkeletonChart /> : scenarios.length === 0 ? (
          <div className="text-center py-10">
            <MdScience className="text-4xl text-primary-200 mx-auto mb-3" />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No scenarios yet. Create your first what-if analysis.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {scenarios.map((s, idx) => (
              <div key={s.id}
                onClick={() => toggleSelect(s.id)}
                className={`p-3 md:p-4 bg-primary-50 dark:bg-primary-900/40 rounded-xl border-2 transition-all cursor-pointer
                  ${selected.includes(s.id)
                    ? "border-primary-400 shadow-green-glow"
                    : "border-transparent hover:border-primary-200 dark:hover:border-primary-700"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{s.name}</p>
                      <span className={s.status === "completed" ? "badge-success" : s.status === "error" ? "badge-error" : "badge-info"}>
                        {s.status}
                      </span>
                      {s.is_saved && <span className="badge-info">Saved</span>}
                      {selected.includes(s.id) && (
                        <span className="badge bg-primary-600 text-white">✓ Selected</span>
                      )}
                    </div>
                    {s.variables && (
                      <div className="flex gap-3 mt-1.5 flex-wrap text-xs text-primary-400">
                        {Object.entries(s.variables).filter(([, v]) => v !== 0 && v !== 1.0).map(([k, v]) => (
                          <span key={k}>{k.replace(/_/g, " ")}: <strong>{v}</strong></span>
                        ))}
                      </div>
                    )}
                    {s.results && (
                      <div className="flex gap-4 mt-1.5 text-xs flex-wrap">
                        <span className="text-primary-500">
                          Base: <strong>{s.results.base_total?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
                        </span>
                        <span className="text-primary-700">
                          Adjusted: <strong>{s.results.adjusted_total?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
                        </span>
                        <span className={s.results.change_pct >= 0 ? "text-primary-600" : "text-red-500"}>
                          {s.results.change_pct >= 0 ? "+" : ""}{s.results.change_pct}% change
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {!s.is_saved && s.status === "completed" && (
                      <button onClick={() => handleSave(s.id)}
                        className="text-primary-500 hover:text-primary-700 p-1" title="Save scenario">
                        <MdSave className="text-base" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(s.id)}
                      className="text-red-400 hover:text-red-600 p-1">
                      <MdDelete className="text-base" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
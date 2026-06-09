import { useState, useEffect } from "react";
import { forecastsAPI, datasetsAPI } from "../services/api";
import toast from "react-hot-toast";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import { TbBrain } from "react-icons/tb";
import { MdAdd, MdDelete, MdRefresh, MdAutoGraph, MdCompare, MdClose } from "react-icons/md";
import { SkeletonTable } from "../components/ui/Skeleton";

export default function ForecastPage() {
  const [forecasts, setForecasts] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showChart, setShowChart] = useState(false);

  // Separate column states for each form
  const [datasetCols, setDatasetCols] = useState([]);
  const [compareCols, setCompareCols] = useState([]);

  const [compareResult, setCompareResult] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [form, setForm] = useState({
    name: "", dataset_id: "", model_type: "linear_regression",
    periods: 12, target_column: "", date_column: "", feature_columns: [],
  });
  const [compareForm, setCompareForm] = useState({
    dataset_id: "", target_column: "", date_column: "", periods: 12,
  });

  useEffect(() => {
    Promise.all([forecastsAPI.list(), datasetsAPI.list(), forecastsAPI.getModels()])
      .then(([fr, dr, mr]) => {
        setForecasts(fr.data);
        const dsData = dr.data?.datasets || dr.data || [];
        setDatasets(Array.isArray(dsData) ? dsData.filter((d) => d.status === "processed") : []);
        setModels(mr.data.models || []);
      }).finally(() => setLoading(false));
  }, []);

  // Separate handlers for each form
  const handleMainDatasetChange = async (id) => {
    setForm((f) => ({ ...f, dataset_id: id, target_column: "", date_column: "", feature_columns: [] }));
    setDatasetCols([]);
    if (!id) return;
    try {
      const r = await datasetsAPI.preview(id);
      setDatasetCols(r.data.columns || []);
    } catch { setDatasetCols([]); }
  };

  const handleCompareDatasetChange = async (id) => {
    setCompareForm((f) => ({ ...f, dataset_id: id, target_column: "", date_column: "" }));
    setCompareCols([]);
    if (!id) return;
    try {
      const r = await datasetsAPI.preview(id);
      setCompareCols(r.data.columns || []);
    } catch { setCompareCols([]); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.dataset_id || !form.target_column || !form.date_column) {
      toast.error("Please fill in all required fields"); return;
    }
    setCreating(true);
    try {
      const payload = { ...form, dataset_id: parseInt(form.dataset_id), periods: parseInt(form.periods) };
      const r = await forecastsAPI.create(payload);
      setForecasts((prev) => [r.data, ...prev]);
      toast.success("Forecast started!");
      setShowForm(false);
      setForm({ name: "", dataset_id: "", model_type: "linear_regression", periods: 12, target_column: "", date_column: "", feature_columns: [] });
      setDatasetCols([]);
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setCreating(false); }
  };

  const handleCompare = async (e) => {
    e.preventDefault();
    if (!compareForm.dataset_id || !compareForm.target_column || !compareForm.date_column) {
      toast.error("Please fill all compare fields"); return;
    }
    setComparing(true);
    try {
      const r = await forecastsAPI.compare({
        dataset_id: parseInt(compareForm.dataset_id),
        target_column: compareForm.target_column,
        date_column: compareForm.date_column,
        periods: parseInt(compareForm.periods),
      });
      setCompareResult(r.data);
      toast.success("Comparison complete!");
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setComparing(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this forecast?")) return;
    await forecastsAPI.delete(id);
    setForecasts((prev) => prev.filter((f) => f.id !== id));
    if (selected?.id === id) { setSelected(null); setShowChart(false); }
    toast.success("Deleted");
  };

  const handleRefresh = async (id) => {
    const r = await forecastsAPI.get(id);
    setForecasts((prev) => prev.map((f) => f.id === id ? r.data : f));
    if (selected?.id === id) setSelected(r.data);
  };

  const handleSelectForecast = (f) => {
    if (f.status !== "completed") return;
    setSelected(f);
    setShowChart(true);
  };

  const filteredForecasts = forecasts.filter((f) => {
    const matchSearch = !searchTerm || f.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !filterStatus || f.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const chartData = selected?.status === "completed" ? buildChartData(selected) : [];

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pt-2 md:pt-0">
        <div>
          <h1 className="page-title">Forecasts</h1>
          <p className="text-primary-500 text-xs md:text-sm mt-1">AI-powered demand predictions</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => { setShowCompare(!showCompare); setShowForm(false); }}
            className="btn-secondary flex items-center gap-1 text-xs md:text-sm px-3 py-2 md:px-5 md:py-2.5">
            <MdCompare /> <span className="hidden sm:inline">Compare</span>
          </button>
          <button onClick={() => { setShowForm(!showForm); setShowCompare(false); }}
            className="btn-primary flex items-center gap-1 text-xs md:text-sm px-3 py-2 md:px-5 md:py-2.5">
            <MdAdd /> <span className="hidden sm:inline">New</span>
          </button>
        </div>
      </div>

      {/* Create Forecast Form */}
      {showForm && (
        <div className="glass-card p-4 md:p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2">
              <TbBrain className="text-primary-500" /> Configure Forecast
            </h2>
            <button onClick={() => setShowForm(false)} className="text-primary-400 hover:text-primary-600">
              <MdClose />
            </button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="label">Forecast Name *</label>
              <input className="input-field" placeholder="e.g. Q4 Demand Forecast" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Dataset *</label>
              <select className="input-field" value={form.dataset_id}
                onChange={(e) => handleMainDatasetChange(e.target.value)}>
                <option value="">Select dataset…</option>
                {datasets.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Model *</label>
              <select className="input-field" value={form.model_type}
                onChange={(e) => setForm({ ...form, model_type: e.target.value })}>
                {models.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              {form.model_type && (
                <p className="text-xs text-primary-400 mt-1">
                  {models.find((m) => m.value === form.model_type)?.description}
                </p>
              )}
            </div>
            <div>
              <label className="label">Periods *</label>
              <input type="number" className="input-field" min={1} max={365} value={form.periods}
                onChange={(e) => setForm({ ...form, periods: e.target.value })} />
            </div>
            <div>
              <label className="label">Date Column *</label>
              <select className="input-field" value={form.date_column}
                onChange={(e) => setForm({ ...form, date_column: e.target.value })}
                disabled={!datasetCols.length}>
                <option value="">Select date column…</option>
                {datasetCols.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Target Column *</label>
              <select className="input-field" value={form.target_column}
                onChange={(e) => setForm({ ...form, target_column: e.target.value })}
                disabled={!datasetCols.length}>
                <option value="">Select target column…</option>
                {datasetCols.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={creating} className="btn-primary flex items-center gap-2 flex-1 sm:flex-none justify-center">
                {creating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {creating ? "Running…" : "Run Forecast"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Compare Form */}
      {showCompare && (
        <div className="glass-card p-4 md:p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2">
              <MdCompare className="text-primary-500" /> Compare All Models
            </h2>
            <button onClick={() => { setShowCompare(false); setCompareResult(null); }}
              className="text-primary-400 hover:text-primary-600"><MdClose /></button>
          </div>
          <form onSubmit={handleCompare} className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="label">Dataset *</label>
              <select className="input-field" value={compareForm.dataset_id}
                onChange={(e) => handleCompareDatasetChange(e.target.value)}>
                <option value="">Select…</option>
                {datasets.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date Column *</label>
              <select className="input-field" value={compareForm.date_column}
                onChange={(e) => setCompareForm({ ...compareForm, date_column: e.target.value })}
                disabled={!compareCols.length}>
                <option value="">Select…</option>
                {compareCols.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Target Column *</label>
              <select className="input-field" value={compareForm.target_column}
                onChange={(e) => setCompareForm({ ...compareForm, target_column: e.target.value })}
                disabled={!compareCols.length}>
                <option value="">Select…</option>
                {compareCols.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Periods</label>
              <input type="number" className="input-field" min={1} max={365} value={compareForm.periods}
                onChange={(e) => setCompareForm({ ...compareForm, periods: e.target.value })} />
            </div>
            <div className="col-span-2 md:col-span-4">
              <button type="submit" disabled={comparing} className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center">
                {comparing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {comparing ? "Comparing…" : "Run Comparison"}
              </button>
            </div>
          </form>

          {compareResult && (
            <div className="mt-4 pt-4 border-t border-primary-100">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-sm font-semibold text-primary-800">Best Model:</span>
                <span className="badge-success">{compareResult.best_model} — {compareResult.best_accuracy}%</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-primary-100">
                      <th className="table-th">Model</th>
                      <th className="table-th">R²</th>
                      <th className="table-th">MAE</th>
                      <th className="table-th">RMSE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareResult.results.map((r) => (
                      <tr key={r.model} className={`border-b border-primary-50 ${r.model === compareResult.best_model ? "bg-primary-50" : ""}`}>
                        <td className="table-td font-mono text-xs">{r.model} {r.model === compareResult.best_model && "⭐"}</td>
                        <td className="table-td font-bold text-primary-700">{r.r2_score ? `${r.r2_score}%` : "—"}</td>
                        <td className="table-td">{r.mae?.toFixed(4) ?? "—"}</td>
                        <td className="table-td">{r.rmse?.toFixed(4) ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile chart modal */}
      {showChart && selected && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-50 flex items-end"
          onClick={() => setShowChart(false)}>
          <div className="bg-white w-full rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-primary-900 text-sm truncate pr-2">{selected.name}</h3>
              <button onClick={() => setShowChart(false)} className="text-primary-400"><MdClose /></button>
            </div>
            <div className="flex gap-2 flex-wrap mb-3">
              {selected.accuracy_score && <span className="badge-success text-xs">R²: {(selected.accuracy_score * 100).toFixed(1)}%</span>}
              {selected.mae && <span className="badge text-xs bg-primary-50 text-primary-700">MAE: {selected.mae.toFixed(3)}</span>}
              {selected.rmse && <span className="badge text-xs bg-primary-50 text-primary-700">RMSE: {selected.rmse.toFixed(3)}</span>}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dcfce7" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9 }} width={35} />
                <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Line type="monotone" dataKey="historical" stroke="#166534" strokeWidth={2} dot={false} name="Historical" connectNulls />
                <Line type="monotone" dataKey="forecast" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} name="Forecast" connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-4">
        {/* Forecasts list */}
        <div className="md:col-span-2 glass-card p-4 md:p-5">
          <div className="flex gap-2 mb-3">
            <input className="input-field text-xs flex-1" placeholder="Search…" value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} />
            <select className="input-field text-xs w-24" value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All</option>
              <option value="completed">Done</option>
              <option value="running">Running</option>
              <option value="error">Error</option>
            </select>
          </div>
          {loading ? <SkeletonTable rows={4} /> : filteredForecasts.length === 0 ? (
            <p className="text-center text-primary-400 text-sm py-10">No forecasts found.</p>
          ) : (
            <div className="space-y-2 max-h-96 md:max-h-[500px] overflow-y-auto scrollbar-thin pr-1">
              {filteredForecasts.map((f) => (
                <div key={f.id} onClick={() => handleSelectForecast(f)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all duration-150
                    ${selected?.id === f.id ? "border-primary-400 bg-primary-50 shadow-green-glow" : "border-primary-100 hover:border-primary-300 hover:bg-primary-50/50"}
                    ${f.status !== "completed" ? "opacity-70 cursor-default" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-primary-900 truncate">{f.name}</p>
                      <p className="text-xs text-primary-400 font-mono mt-0.5">{f.model_type}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <StatusBadge status={f.status} />
                      {f.status === "running" && (
                        <button onClick={(e) => { e.stopPropagation(); handleRefresh(f.id); }}
                          className="text-primary-400 hover:text-primary-600">
                          <MdRefresh className="text-sm" />
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(f.id); }}
                        className="text-red-400 hover:text-red-600">
                        <MdDelete className="text-sm" />
                      </button>
                    </div>
                  </div>
                  {f.accuracy_score && (
                    <div className="mt-1.5 flex gap-3 text-xs text-primary-500">
                      <span>R²: <strong className="text-primary-700">{(f.accuracy_score * 100).toFixed(1)}%</strong></span>
                      {f.mae && <span>MAE: <strong>{f.mae.toFixed(2)}</strong></span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop chart */}
        <div className="hidden md:block md:col-span-3 glass-card p-5">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <MdAutoGraph className="text-primary-500" />
            {selected ? selected.name : "Select a forecast to visualize"}
          </h2>
          {selected?.status === "completed" && chartData.length > 0 ? (
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                {selected.accuracy_score && (
                  <div className="bg-primary-50 rounded-lg px-3 py-1.5 text-xs">
                    <span className="text-primary-500">R²</span>
                    <span className="font-bold text-primary-800 ml-1.5">{(selected.accuracy_score * 100).toFixed(1)}%</span>
                  </div>
                )}
                {selected.mae && (
                  <div className="bg-primary-50 rounded-lg px-3 py-1.5 text-xs">
                    <span className="text-primary-500">MAE</span>
                    <span className="font-bold text-primary-800 ml-1.5">{selected.mae.toFixed(3)}</span>
                  </div>
                )}
                {selected.rmse && (
                  <div className="bg-primary-50 rounded-lg px-3 py-1.5 text-xs">
                    <span className="text-primary-500">RMSE</span>
                    <span className="font-bold text-primary-800 ml-1.5">{selected.rmse.toFixed(3)}</span>
                  </div>
                )}
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dcfce7" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#86efac" }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: "#86efac" }} />
                  <Tooltip contentStyle={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <ReferenceLine x={chartData.find((d) => d.type === "forecast")?.date} stroke="#22c55e" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="historical" stroke="#166534" strokeWidth={2} dot={false} name="Historical" connectNulls />
                  <Line type="monotone" dataKey="forecast" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="Forecast" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : selected?.status === "running" ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-primary-500">
              <div className="w-10 h-10 border-4 border-primary-100 border-t-primary-500 rounded-full animate-spin" />
              <p className="text-sm">Training… click 🔄 to refresh.</p>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-primary-300">
              <MdAutoGraph className="text-5xl mb-3 text-primary-200" />
              <p className="text-sm">Click a completed forecast to see its chart</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = { completed: "badge-success", running: "badge-info", error: "badge-error", pending: "badge-warning" };
  return <span className={map[status] || "badge-warning"}>{status}</span>;
}

function buildChartData(forecast) {
  const hist = (forecast.historical_data || []).map((d) => ({ date: d.ds, historical: d.y, forecast: null, type: "historical" }));
  const preds = (forecast.predictions || []).map((d) => ({ date: d.ds, historical: null, forecast: d.yhat, type: "forecast" }));
  return [...hist.slice(-60), ...preds];
}

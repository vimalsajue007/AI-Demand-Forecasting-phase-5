import { useState, useEffect } from "react";
import { anomalyAPI, datasetsAPI } from "../services/api";
import toast from "react-hot-toast";
import { MdWarning, MdCheckCircle, MdSearch } from "react-icons/md";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { SkeletonChart } from "../components/ui/Skeleton";

export default function AnomalyPage() {
  const [datasets, setDatasets] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [columns, setColumns] = useState([]);
  const [form, setForm] = useState({ dataset_id: "", date_column: "date", target_column: "sales", sensitivity: 1.5 });

  useEffect(() => {
    datasetsAPI.list({ status: "processed" }).then((r) => {
      const ds = r.data?.datasets || r.data || [];
      setDatasets(Array.isArray(ds) ? ds : []);
    }).catch(() => {});
    anomalyAPI.list().then((r) => setHistory(r.data || [])).catch(() => {});
  }, []);

  const handleDatasetChange = async (id) => {
    setForm((f) => ({ ...f, dataset_id: id }));
    if (!id) return;
    try {
      const r = await datasetsAPI.preview(id);
      setColumns(r.data.columns || []);
    } catch {}
  };

  const handleDetect = async () => {
    if (!form.dataset_id) { toast.error("Select a dataset"); return; }
    setLoading(true);
    setResult(null);
    try {
      const r = await anomalyAPI.detect({ ...form, dataset_id: parseInt(form.dataset_id), sensitivity: parseFloat(form.sensitivity) });
      setResult(r.data);
      toast.success(`Found ${r.data.anomaly_count} anomalies`);
      anomalyAPI.list().then((r2) => setHistory(r2.data || [])).catch(() => {});
    } catch (err) {
      toast.error(err.response?.data?.detail || "Detection failed");
    } finally { setLoading(false); }
  };

  const severityColor = { low: "badge-success", medium: "badge-warning", high: "badge-error" };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="pt-2 md:pt-0">
        <h1 className="page-title">Anomaly Detection</h1>
        <p className="text-primary-500 text-xs md:text-sm mt-1">Detect unusual sales patterns using IQR & Z-Score analysis</p>
      </div>

      {/* Config form */}
      <div className="glass-card p-4 md:p-5">
        <h2 className="section-title mb-4 flex items-center gap-2"><MdSearch className="text-primary-500" /> Detection Config</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="col-span-2 md:col-span-1">
            <label className="label">Dataset</label>
            <select className="input-field" value={form.dataset_id} onChange={(e) => handleDatasetChange(e.target.value)}>
              <option value="">Select…</option>
              {datasets.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date Column</label>
            <select className="input-field" value={form.date_column} onChange={(e) => setForm({ ...form, date_column: e.target.value })}>
              {columns.length ? columns.map((c) => <option key={c} value={c}>{c}</option>) : <option value="date">date</option>}
            </select>
          </div>
          <div>
            <label className="label">Target Column</label>
            <select className="input-field" value={form.target_column} onChange={(e) => setForm({ ...form, target_column: e.target.value })}>
              {columns.length ? columns.map((c) => <option key={c} value={c}>{c}</option>) : <option value="sales">sales</option>}
            </select>
          </div>
          <div>
            <label className="label">Sensitivity (1-3)</label>
            <input type="number" step="0.1" min="0.5" max="3" className="input-field" value={form.sensitivity}
              onChange={(e) => setForm({ ...form, sensitivity: e.target.value })} />
          </div>
        </div>
        <button onClick={handleDetect} disabled={loading || !form.dataset_id} className="btn-primary flex items-center gap-2">
          {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {loading ? "Detecting…" : "Run Detection"}
        </button>
      </div>

      {/* Results */}
      {loading && <SkeletonChart />}
      {result && !loading && (
        <div className="space-y-4 animate-slide-up">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ["Anomalies Found", result.anomaly_count],
              ["Severity", <span key="s" className={severityColor[result.severity]}>{result.severity?.toUpperCase()}</span>],
              ["Data Mean", result.statistics?.mean],
              ["Std Deviation", result.statistics?.std],
            ].map(([label, value], i) => (
              <div key={i} className="stat-card">
                <p className="text-xs font-medium text-primary-500 uppercase">{label}</p>
                <p className="font-display text-xl font-bold text-primary-900 mt-1">{value}</p>
              </div>
            ))}
          </div>

          <div className="glass-card p-4 md:p-5">
            <h2 className="section-title mb-2">Summary</h2>
            <p className="text-sm text-primary-600">{result.summary}</p>
          </div>

          {/* Anomaly list */}
          {result.anomalies?.length > 0 && (
            <div className="glass-card p-4 md:p-5">
              <h2 className="section-title mb-4 flex items-center gap-2">
                <MdWarning className="text-yellow-500" /> Detected Anomalies ({result.anomalies.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-primary-100">
                    <th className="table-th">Date</th><th className="table-th">Value</th>
                    <th className="table-th">Expected Range</th><th className="table-th">Z-Score</th>
                    <th className="table-th">Direction</th><th className="table-th">Severity</th>
                  </tr></thead>
                  <tbody>
                    {result.anomalies.map((a, i) => (
                      <tr key={i} className="border-b border-primary-50 hover:bg-primary-50/50">
                        <td className="table-td font-mono text-xs">{a.date}</td>
                        <td className="table-td font-bold text-primary-900">{a.value}</td>
                        <td className="table-td text-xs">{a.expected_min} — {a.expected_max}</td>
                        <td className="table-td font-mono text-xs">{a.z_score}</td>
                        <td className="table-td"><span className={a.direction === "high" ? "badge-error" : "badge-info"}>{a.direction}</span></td>
                        <td className="table-td"><span className={severityColor[a.severity]}>{a.severity}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Seasonal insights */}
          {result.seasonal_insights?.peak_month && (
            <div className="glass-card p-4 md:p-5">
              <h2 className="section-title mb-3">Seasonal Insights</h2>
              <div className="flex gap-4 flex-wrap text-sm">
                <div className="bg-primary-50 rounded-xl px-3 py-2">
                  Peak Month: <strong className="text-primary-800">{result.seasonal_insights.peak_month}</strong>
                </div>
                <div className="bg-red-50 rounded-xl px-3 py-2">
                  Low Month: <strong className="text-red-700">{result.seasonal_insights.low_month}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="glass-card p-4 md:p-5">
          <h2 className="section-title mb-4">Detection History</h2>
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between p-3 bg-primary-50 rounded-xl gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary-900">Dataset #{h.dataset_id} — {h.target_column}</p>
                  <p className="text-xs text-primary-400 truncate">{h.summary}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={severityColor[h.severity]}>{h.anomaly_count} found</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

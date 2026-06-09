import { useState, useEffect } from "react";
import { scheduleAPI, datasetsAPI } from "../services/api";
import toast from "react-hot-toast";
import { MdSchedule, MdAdd, MdDelete, MdPlayArrow, MdPause, MdClose, MdFlashOn } from "react-icons/md";
import { SkeletonTable } from "../components/ui/Skeleton";

const INTERVALS = ["hourly","daily","weekly","monthly"];
const MODELS = ["linear_regression","ridge_regression","random_forest","gradient_boosting","ensemble"];

export default function SchedulePage() {
  const [schedules, setSchedules] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name:"", dataset_id:"", model_type:"linear_regression",
    target_column:"", date_column:"", periods:12, interval:"daily",
  });

  useEffect(() => {
    Promise.all([scheduleAPI.list(), datasetsAPI.list({ status:"processed" })])
      .then(([sr, dr]) => {
        setSchedules(sr.data || []);
        const ds = dr.data?.datasets || dr.data || [];
        setDatasets(Array.isArray(ds) ? ds : []);
      }).finally(() => setLoading(false));
  }, []);

  const handleDatasetChange = async (id) => {
    setForm((f) => ({ ...f, dataset_id: id, target_column:"", date_column:"" }));
    if (!id) return;
    try { const r = await datasetsAPI.preview(id); setColumns(r.data.columns || []); }
    catch { setColumns([]); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.dataset_id || !form.target_column || !form.date_column) {
      toast.error("Fill all required fields"); return;
    }
    setCreating(true);
    try {
      const r = await scheduleAPI.create({ ...form, dataset_id: parseInt(form.dataset_id), periods: parseInt(form.periods) });
      setSchedules((prev) => [r.data, ...prev]);
      toast.success("Schedule created!");
      setShowForm(false);
      setForm({ name:"", dataset_id:"", model_type:"linear_regression", target_column:"", date_column:"", periods:12, interval:"daily" });
      setColumns([]);
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setCreating(false); }
  };

  const handleToggle = async (id) => {
    const r = await scheduleAPI.toggle(id);
    setSchedules((prev) => prev.map((s) => s.id === id ? { ...s, is_active: r.data.is_active } : s));
    toast.success(r.data.message);
  };

  const handleRunNow = async (id) => {
    await scheduleAPI.runNow(id);
    toast.success("Forecast triggered!");
    setSchedules((prev) => prev.map((s) => s.id === id ? { ...s, run_count: (s.run_count || 0) + 1 } : s));
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this schedule?")) return;
    await scheduleAPI.delete(id);
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    toast.success("Deleted");
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-start justify-between gap-3 pt-2 md:pt-0">
        <div>
          <h1 className="page-title">Automation Schedules</h1>
          <p className="text-xs md:text-sm mt-1" style={{ color:"var(--text-muted)" }}>Automate recurring forecast generation</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-1.5 text-xs md:text-sm px-3 py-2 md:px-5 md:py-2.5 flex-shrink-0">
          <MdAdd /> <span className="hidden sm:inline">New Schedule</span>
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-4 md:p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2"><MdSchedule className="text-primary-500" /> Configure Schedule</h2>
            <button onClick={() => setShowForm(false)} className="text-primary-400 hover:text-primary-600"><MdClose /></button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div className="sm:col-span-2">
              <label className="label">Schedule Name *</label>
              <input className="input-field" placeholder="e.g. Daily Sales Forecast" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Dataset *</label>
              <select className="input-field" value={form.dataset_id} onChange={(e) => handleDatasetChange(e.target.value)}>
                <option value="">Select dataset…</option>
                {datasets.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Model</label>
              <select className="input-field" value={form.model_type} onChange={(e) => setForm({ ...form, model_type: e.target.value })}>
                {MODELS.map((m) => <option key={m} value={m}>{m.replace(/_/g," ")}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date Column *</label>
              <select className="input-field" value={form.date_column} onChange={(e) => setForm({ ...form, date_column: e.target.value })} disabled={!columns.length}>
                <option value="">Select…</option>
                {columns.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Target Column *</label>
              <select className="input-field" value={form.target_column} onChange={(e) => setForm({ ...form, target_column: e.target.value })} disabled={!columns.length}>
                <option value="">Select…</option>
                {columns.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Interval</label>
              <select className="input-field" value={form.interval} onChange={(e) => setForm({ ...form, interval: e.target.value })}>
                {INTERVALS.map((i) => <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Periods</label>
              <input type="number" className="input-field" min={1} max={365} value={form.periods} onChange={(e) => setForm({ ...form, periods: e.target.value })} />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={creating} className="btn-primary flex items-center gap-2 justify-center flex-1 sm:flex-none">
                {creating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {creating ? "Creating…" : "Create Schedule"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-card p-4 md:p-5">
        <h2 className="section-title mb-4 flex items-center gap-2"><MdSchedule className="text-primary-500" /> Active Schedules</h2>
        {loading ? <SkeletonTable /> : schedules.length === 0 ? (
          <div className="text-center py-12">
            <MdSchedule className="text-4xl text-primary-200 mx-auto mb-3" />
            <p className="text-sm" style={{ color:"var(--text-muted)" }}>No schedules yet. Create one to automate your forecasts.</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-primary-100 dark:border-primary-800">
                    <th className="table-th">Name</th><th className="table-th">Dataset</th>
                    <th className="table-th">Model</th><th className="table-th">Interval</th>
                    <th className="table-th">Runs</th><th className="table-th">Next Run</th>
                    <th className="table-th">Status</th><th className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s) => (
                    <tr key={s.id} className="border-b border-primary-50 dark:border-primary-900 hover:bg-primary-50/50 dark:hover:bg-primary-900/30">
                      <td className="table-td font-medium">{s.name}</td>
                      <td className="table-td text-xs text-primary-400">#{s.dataset_id}</td>
                      <td className="table-td"><span className="font-mono text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-lg">{s.model_type?.replace(/_/g," ")}</span></td>
                      <td className="table-td capitalize">{s.interval}</td>
                      <td className="table-td">{s.run_count}</td>
                      <td className="table-td text-xs text-primary-400">{s.next_run?.slice(0,16).replace("T"," ") || "—"}</td>
                      <td className="table-td"><span className={s.is_active ? "badge-success" : "badge-warning"}>{s.is_active ? "Active" : "Paused"}</span></td>
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleRunNow(s.id)} className="text-primary-500 hover:text-primary-700" title="Run now"><MdFlashOn className="text-lg" /></button>
                          <button onClick={() => handleToggle(s.id)} className="text-primary-500 hover:text-primary-700" title={s.is_active ? "Pause" : "Resume"}>
                            {s.is_active ? <MdPause className="text-lg" /> : <MdPlayArrow className="text-lg" />}
                          </button>
                          <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-600"><MdDelete className="text-lg" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden space-y-3">
              {schedules.map((s) => (
                <div key={s.id} className="bg-primary-50 dark:bg-primary-900/40 rounded-xl p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color:"var(--text)" }}>{s.name}</p>
                      <p className="text-xs text-primary-400 font-mono">{s.model_type?.replace(/_/g," ")} • {s.interval}</p>
                    </div>
                    <span className={s.is_active ? "badge-success" : "badge-warning"}>{s.is_active ? "Active" : "Paused"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleRunNow(s.id)} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1 flex-1 justify-center"><MdFlashOn /> Run Now</button>
                    <button onClick={() => handleToggle(s.id)} className="btn-secondary text-xs px-3 py-1.5 flex-1 justify-center flex items-center gap-1">
                      {s.is_active ? <><MdPause /> Pause</> : <><MdPlayArrow /> Resume</>}
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-600 p-1.5"><MdDelete /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

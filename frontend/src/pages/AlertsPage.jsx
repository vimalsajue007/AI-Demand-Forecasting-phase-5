import { useState, useEffect } from "react";
import { alertsAPI, datasetsAPI } from "../services/api";
import toast from "react-hot-toast";
import { MdNotificationsActive, MdAdd, MdDelete, MdCheck, MdClose, MdCheckCircle } from "react-icons/md";
import { SkeletonTable } from "../components/ui/Skeleton";

const ALERT_TYPES = ["threshold","forecast_fail","report_complete","low_stock","demand_spike"];
const OPERATORS = [{ value:"gt", label:"Greater than (>)" },{ value:"lt", label:"Less than (<)" },
                   { value:"gte", label:">= or equal" },{ value:"lte", label:"<= or equal" }];

export default function AlertsPage() {
  const [configs, setConfigs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState("configs");
  const [form, setForm] = useState({
    name:"", alert_type:"threshold", threshold_value:"", threshold_operator:"gt",
    dataset_id:"", target_column:"", email_enabled:false, in_app_enabled:true, email_address:"",
  });
  const [columns, setColumns] = useState([]);

  useEffect(() => {
    Promise.all([alertsAPI.listConfigs(), alertsAPI.getLogs(), datasetsAPI.list({ status:"processed" })])
      .then(([cr, lr, dr]) => {
        setConfigs(cr.data || []);
        setLogs(lr.data || []);
        const ds = dr.data?.datasets || dr.data || [];
        setDatasets(Array.isArray(ds) ? ds : []);
      }).finally(() => setLoading(false));
  }, []);

  const handleDatasetChange = async (id) => {
    setForm((f) => ({ ...f, dataset_id: id, target_column:"" }));
    if (!id) return;
    try { const r = await datasetsAPI.preview(id); setColumns(r.data.columns || []); } catch { setColumns([]); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.alert_type) { toast.error("Fill required fields"); return; }
    setCreating(true);
    try {
      const payload = { ...form, dataset_id: form.dataset_id ? parseInt(form.dataset_id) : null,
                        threshold_value: form.threshold_value ? parseFloat(form.threshold_value) : null };
      const r = await alertsAPI.createConfig(payload);
      setConfigs((prev) => [r.data, ...prev]);
      toast.success("Alert created!");
      setShowForm(false);
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setCreating(false); }
  };

  const handleToggle = async (id) => {
    const r = await alertsAPI.toggleConfig(id);
    setConfigs((prev) => prev.map((c) => c.id === id ? { ...c, is_active: r.data.is_active } : c));
    toast.success(r.data.message);
  };

  const handleCheck = async (id) => {
    try {
      const r = await alertsAPI.checkAlert(id);
      toast[r.data.triggered ? "error" : "success"](r.data.triggered ? `Alert triggered! Value: ${r.data.current_value}` : `No alert. Current value: ${r.data.current_value}`);
      if (r.data.triggered) { const lr = await alertsAPI.getLogs(); setLogs(lr.data || []); }
    } catch (err) { toast.error(err.response?.data?.detail || "Check failed"); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this alert?")) return;
    await alertsAPI.deleteConfig(id);
    setConfigs((prev) => prev.filter((c) => c.id !== id));
    toast.success("Deleted");
  };

  const handleMarkRead = async (id) => {
    await alertsAPI.markLogRead(id);
    setLogs((prev) => prev.map((l) => l.id === id ? { ...l, is_read: true } : l));
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-start justify-between gap-3 pt-2 md:pt-0">
        <div>
          <h1 className="page-title">Alerts & Notifications</h1>
          <p className="text-xs md:text-sm mt-1" style={{ color:"var(--text-muted)" }}>Configure threshold-based automated alerts</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-1.5 text-xs md:text-sm px-3 py-2 md:px-5 md:py-2.5 flex-shrink-0">
          <MdAdd /> <span className="hidden sm:inline">New Alert</span>
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-4 md:p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2"><MdNotificationsActive className="text-primary-500" /> Configure Alert</h2>
            <button onClick={() => setShowForm(false)} className="text-primary-400 hover:text-primary-600"><MdClose /></button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="label">Alert Name *</label>
              <input className="input-field" placeholder="e.g. High Sales Alert" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Alert Type *</label>
              <select className="input-field" value={form.alert_type} onChange={(e) => setForm({ ...form, alert_type: e.target.value })}>
                {ALERT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g," ")}</option>)}
              </select>
            </div>
            {form.alert_type === "threshold" && (
              <>
                <div>
                  <label className="label">Dataset</label>
                  <select className="input-field" value={form.dataset_id} onChange={(e) => handleDatasetChange(e.target.value)}>
                    <option value="">Select…</option>
                    {datasets.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Target Column</label>
                  <select className="input-field" value={form.target_column} onChange={(e) => setForm({ ...form, target_column: e.target.value })} disabled={!columns.length}>
                    <option value="">Select…</option>
                    {columns.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Operator</label>
                  <select className="input-field" value={form.threshold_operator} onChange={(e) => setForm({ ...form, threshold_operator: e.target.value })}>
                    {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Threshold Value</label>
                  <input type="number" className="input-field" placeholder="e.g. 1000" value={form.threshold_value} onChange={(e) => setForm({ ...form, threshold_value: e.target.value })} />
                </div>
              </>
            )}
            <div className="sm:col-span-2">
              <label className="label">Email Notifications</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.email_enabled} onChange={(e) => setForm({ ...form, email_enabled: e.target.checked })} className="rounded" />
                  <span className="text-sm" style={{ color:"var(--text)" }}>Send email alerts</span>
                </label>
              </div>
              {form.email_enabled && (
                <input className="input-field mt-2" type="email" placeholder="alert@company.com" value={form.email_address}
                  onChange={(e) => setForm({ ...form, email_address: e.target.value })} />
              )}
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={creating} className="btn-primary flex items-center gap-2 justify-center w-full sm:w-auto">
                {creating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {creating ? "Creating…" : "Create Alert"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-1 bg-primary-100 dark:bg-primary-900/50 p-1 rounded-xl w-fit">
        {[{ key:"configs", label:"Alert Configs" }, { key:"logs", label:`Alert Logs (${logs.filter(l=>!l.is_read).length} new)` }].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${tab === key ? "bg-white dark:bg-primary-800 shadow-sm" : "hover:opacity-80"}`}
            style={{ color: tab === key ? "var(--text)" : "var(--text-muted)" }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "configs" && (
        <div className="glass-card p-4 md:p-5 animate-fade-in">
          <h2 className="section-title mb-4">Configured Alerts</h2>
          {loading ? <SkeletonTable /> : configs.length === 0 ? (
            <div className="text-center py-10"><MdNotificationsActive className="text-4xl text-primary-200 mx-auto mb-3" /><p className="text-sm" style={{ color:"var(--text-muted)" }}>No alerts configured yet.</p></div>
          ) : (
            <div className="space-y-3">
              {configs.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/40 rounded-xl gap-2 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm" style={{ color:"var(--text)" }}>{c.name}</p>
                    <div className="flex gap-2 mt-0.5 flex-wrap">
                      <span className="badge bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-300 text-xs">{c.alert_type.replace(/_/g," ")}</span>
                      {c.threshold_value && <span className="text-xs text-primary-400">{c.threshold_operator} {c.threshold_value}</span>}
                      {c.email_enabled && <span className="badge-info text-xs">Email On</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={c.is_active ? "badge-success" : "badge-warning"}>{c.is_active ? "Active" : "Off"}</span>
                    {c.alert_type === "threshold" && c.dataset_id && (
                      <button onClick={() => handleCheck(c.id)} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"><MdCheck /> Check</button>
                    )}
                    <button onClick={() => handleToggle(c.id)} className="text-primary-500 hover:text-primary-700 text-sm px-2 py-1 rounded-lg bg-primary-100 dark:bg-primary-800">
                      {c.is_active ? "Pause" : "Enable"}
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-600"><MdDelete /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "logs" && (
        <div className="glass-card p-4 md:p-5 animate-fade-in">
          <h2 className="section-title mb-4">Alert History</h2>
          {logs.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color:"var(--text-muted)" }}>No alerts triggered yet.</p>
          ) : (
            <div className="space-y-2">
              {logs.map((l) => (
                <div key={l.id} className={`flex items-start justify-between p-3 rounded-xl gap-2 ${!l.is_read ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800" : "bg-primary-50 dark:bg-primary-900/40"}`}>
                  <div className="min-w-0">
                    <p className="font-medium text-sm" style={{ color:"var(--text)" }}>{l.title}</p>
                    <p className="text-xs text-primary-400 mt-0.5">{l.message}</p>
                    <p className="text-xs text-primary-400 mt-0.5">{l.created_at?.slice(0,16).replace("T"," ")}</p>
                  </div>
                  {!l.is_read && (
                    <button onClick={() => handleMarkRead(l.id)} className="text-primary-500 hover:text-primary-700 flex-shrink-0">
                      <MdCheckCircle className="text-lg" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

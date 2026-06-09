import { useState, useEffect } from "react";
import { integrationsAPI } from "../services/api";
import toast from "react-hot-toast";
import { MdIntegrationInstructions, MdAdd, MdDelete, MdPlayArrow, MdClose, MdHistory, MdCheckCircle, MdError } from "react-icons/md";
import { SkeletonTable } from "../components/ui/Skeleton";

const INTEGRATION_TYPES = [
  { value:"webhook", label:"Webhook", desc:"HTTP POST on events" },
  { value:"erp", label:"ERP System", desc:"Enterprise resource planning" },
  { value:"inventory", label:"Inventory System", desc:"Real-time stock sync" },
  { value:"external_api", label:"External API", desc:"Custom API integration" },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [form, setForm] = useState({ name:"", integration_type:"webhook", endpoint_url:"", api_key:"", config:{} });

  useEffect(() => {
    integrationsAPI.list().then((r) => setIntegrations(r.data || [])).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.integration_type) { toast.error("Fill required fields"); return; }
    setCreating(true);
    try {
      const r = await integrationsAPI.create(form);
      setIntegrations((prev) => [r.data, ...prev]);
      toast.success("Integration created!");
      setShowForm(false);
      setForm({ name:"", integration_type:"webhook", endpoint_url:"", api_key:"", config:{} });
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setCreating(false); }
  };

  const handleToggle = async (id) => {
    const r = await integrationsAPI.toggle(id);
    setIntegrations((prev) => prev.map((i) => i.id === id ? { ...i, is_active: r.data.is_active } : i));
    toast.success(r.data.message);
  };

  const handleTest = async (id) => {
    try { await integrationsAPI.test(id); toast.success("Test webhook sent!"); }
    catch { toast.error("Test failed"); }
  };

  const handleViewLogs = async (id) => {
    setLogsLoading(true);
    try { const r = await integrationsAPI.getLogs(id); setSelectedLogs({ id, logs: r.data }); }
    catch { toast.error("Could not load logs"); }
    finally { setLogsLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this integration?")) return;
    await integrationsAPI.delete(id);
    setIntegrations((prev) => prev.filter((i) => i.id !== id));
    toast.success("Deleted");
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-start justify-between gap-3 pt-2 md:pt-0">
        <div>
          <h1 className="page-title">Enterprise Integrations</h1>
          <p className="text-xs md:text-sm mt-1" style={{ color:"var(--text-muted)" }}>Connect webhooks, ERP, and inventory systems</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-1.5 text-xs md:text-sm px-3 py-2 md:px-5 md:py-2.5 flex-shrink-0">
          <MdAdd /> <span className="hidden sm:inline">Add Integration</span>
        </button>
      </div>

      {/* Type cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {INTEGRATION_TYPES.map(({ value, label, desc }) => (
          <div key={value} className="glass-card p-3 md:p-4">
            <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mb-2">
              <MdIntegrationInstructions className="text-primary-600 dark:text-primary-400 text-base" />
            </div>
            <p className="font-semibold text-xs md:text-sm" style={{ color:"var(--text)" }}>{label}</p>
            <p className="text-xs text-primary-400 mt-0.5 hidden sm:block">{desc}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="glass-card p-4 md:p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2"><MdIntegrationInstructions className="text-primary-500" /> New Integration</h2>
            <button onClick={() => setShowForm(false)} className="text-primary-400 hover:text-primary-600"><MdClose /></button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="label">Name *</label>
              <input className="input-field" placeholder="e.g. Sales Webhook" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Type *</label>
              <select className="input-field" value={form.integration_type} onChange={(e) => setForm({ ...form, integration_type: e.target.value })}>
                {INTEGRATION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Endpoint URL</label>
              <input className="input-field" placeholder="https://your-system.com/webhook" value={form.endpoint_url} onChange={(e) => setForm({ ...form, endpoint_url: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">API Key (optional)</label>
              <input className="input-field" type="password" placeholder="Bearer token or API key" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={creating} className="btn-primary flex items-center gap-2 justify-center w-full sm:w-auto">
                {creating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {creating ? "Creating…" : "Create Integration"}
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedLogs && (
        <div className="glass-card p-4 md:p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2"><MdHistory className="text-primary-500" /> Webhook Logs</h2>
            <button onClick={() => setSelectedLogs(null)} className="text-primary-400 hover:text-primary-600"><MdClose /></button>
          </div>
          {logsLoading ? <p className="text-sm text-primary-400">Loading…</p> : (
            <div className="space-y-2">
              {selectedLogs.logs?.length === 0 ? <p className="text-sm text-primary-400">No logs yet.</p> : (
                selectedLogs.logs.map((l, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-primary-50 dark:bg-primary-900/40 rounded-xl gap-2">
                    <span className="text-xs font-mono text-primary-500">{l.event_type}</span>
                    <div className="flex items-center gap-2">
                      <span className={l.success ? "badge-success" : "badge-error"}>{l.response_status || "—"}</span>
                      {l.success ? <MdCheckCircle className="text-primary-500" /> : <MdError className="text-red-400" />}
                      <span className="text-xs text-primary-400">{l.created_at?.slice(0,16).replace("T"," ")}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      <div className="glass-card p-4 md:p-5">
        <h2 className="section-title mb-4">Your Integrations</h2>
        {loading ? <SkeletonTable /> : integrations.length === 0 ? (
          <div className="text-center py-10">
            <MdIntegrationInstructions className="text-4xl text-primary-200 mx-auto mb-3" />
            <p className="text-sm" style={{ color:"var(--text-muted)" }}>No integrations yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {integrations.map((i) => (
              <div key={i.id} className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/40 rounded-xl gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm" style={{ color:"var(--text)" }}>{i.name}</p>
                  <div className="flex gap-2 mt-0.5 flex-wrap">
                    <span className="badge bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-300 text-xs">{i.integration_type}</span>
                    <span className="text-xs text-primary-400 truncate max-w-xs">{i.endpoint_url}</span>
                  </div>
                  <p className="text-xs text-primary-400 mt-0.5">{i.trigger_count} triggers • Last: {i.last_triggered?.slice(0,10) || "Never"}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={i.is_active ? "badge-success" : "badge-warning"}>{i.is_active ? "Active" : "Off"}</span>
                  <button onClick={() => handleTest(i.id)} className="btn-secondary text-xs px-2 py-1.5 flex items-center gap-1"><MdPlayArrow /> Test</button>
                  <button onClick={() => handleViewLogs(i.id)} className="text-primary-500 hover:text-primary-700"><MdHistory className="text-lg" /></button>
                  <button onClick={() => handleToggle(i.id)} className="text-xs px-2 py-1.5 rounded-lg bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-300">
                    {i.is_active ? "Pause" : "Enable"}
                  </button>
                  <button onClick={() => handleDelete(i.id)} className="text-red-400 hover:text-red-600"><MdDelete /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

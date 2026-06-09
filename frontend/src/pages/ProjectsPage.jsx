import { useState, useEffect } from "react";
import { projectsAPI } from "../services/api";
import toast from "react-hot-toast";
import { MdFolder, MdAdd, MdDelete, MdArchive, MdClose, MdFolderOpen, MdTimeline, MdPeople } from "react-icons/md";
import { SkeletonTable } from "../components/ui/Skeleton";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [activity, setActivity] = useState([]);
  const [creating, setCreating] = useState(false);
  const [filterStatus, setFilterStatus] = useState("active");
  const [form, setForm] = useState({ name: "", description: "", is_shared: false, tags: [] });
  const [tagInput, setTagInput] = useState("");

  useEffect(() => { fetchProjects(); }, [filterStatus]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const r = await projectsAPI.list({ status: filterStatus || undefined });
      setProjects(r.data || []);
    } catch {} finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name) { toast.error("Project name required"); return; }
    setCreating(true);
    try {
      const r = await projectsAPI.create(form);
      setProjects((prev) => [r.data, ...prev]);
      toast.success("Project created!");
      setShowForm(false);
      setForm({ name: "", description: "", is_shared: false, tags: [] });
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setCreating(false); }
  };

  const handleArchive = async (id) => {
    const r = await projectsAPI.archive(id);
    toast.success(r.data.message);
    fetchProjects();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this project?")) return;
    await projectsAPI.delete(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (selected?.id === id) setSelected(null);
    toast.success("Deleted");
  };

  const handleSelectProject = async (project) => {
    setSelected(project);
    try {
      const r = await projectsAPI.activity(project.id);
      setActivity(r.data || []);
    } catch { setActivity([]); }
  };

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm((f) => ({ ...f, tags: [...f.tags, tagInput.trim()] }));
      setTagInput("");
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-start justify-between gap-3 pt-2 md:pt-0">
        <div>
          <h1 className="page-title">Forecast Workspaces</h1>
          <p className="text-xs md:text-sm mt-1" style={{ color:"var(--text-muted)" }}>Organize datasets, forecasts and reports into projects</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-1.5 text-xs md:text-sm px-3 py-2 md:px-5 md:py-2.5 flex-shrink-0">
          <MdAdd /><span className="hidden sm:inline">New Project</span>
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-4 md:p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2"><MdFolder className="text-primary-500" /> New Project</h2>
            <button onClick={() => setShowForm(false)} className="text-primary-400 hover:text-primary-600"><MdClose /></button>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Project Name *</label>
                <input className="input-field" placeholder="e.g. Q4 Demand Planning" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Description</label>
                <textarea className="input-field resize-none" rows={2} placeholder="What is this project about?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="label">Tags</label>
                <div className="flex gap-2">
                  <input className="input-field flex-1 text-sm" placeholder="Add tag…" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} />
                  <button type="button" onClick={addTag} className="btn-secondary px-3 py-2 text-xs">Add</button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {form.tags.map((t) => (
                      <span key={t} className="badge-info flex items-center gap-1 cursor-pointer" onClick={() => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }))}>
                        {t} <MdClose className="text-xs" />
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_shared} onChange={(e) => setForm({ ...form, is_shared: e.target.checked })} />
                  <span className="text-sm" style={{ color:"var(--text)" }}>Shared with team</span>
                </label>
              </div>
            </div>
            <button type="submit" disabled={creating} className="btn-primary flex items-center gap-2">
              {creating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {creating ? "Creating…" : "Create Project"}
            </button>
          </form>
        </div>
      )}

      <div className="flex gap-2">
        {["active","archived"].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all capitalize ${filterStatus === s ? "bg-primary-600 text-white" : "btn-secondary"}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 space-y-3">
          {loading ? <SkeletonTable rows={3} /> : projects.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <MdFolderOpen className="text-4xl text-primary-200 mx-auto mb-3" />
              <p className="text-sm" style={{ color:"var(--text-muted)" }}>No {filterStatus} projects yet.</p>
            </div>
          ) : projects.map((p) => (
            <div key={p.id} onClick={() => handleSelectProject(p)}
              className={`glass-card p-4 cursor-pointer transition-all hover:border-primary-400 ${selected?.id === p.id ? "border-primary-400 shadow-green-glow" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <MdFolder className="text-primary-500 flex-shrink-0" />
                    <p className="font-semibold text-sm truncate" style={{ color:"var(--text)" }}>{p.name}</p>
                  </div>
                  {p.description && <p className="text-xs text-primary-400 truncate mb-2">{p.description}</p>}
                  <div className="flex gap-2 flex-wrap">
                    <span className={p.status === "active" ? "badge-success" : "badge-warning"}>{p.status}</span>
                    {p.is_shared && <span className="badge-info">Shared</span>}
                    {p.tags?.map((t) => <span key={t} className="badge bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400">{t}</span>)}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); handleArchive(p.id); }} className="text-primary-400 hover:text-primary-600 p-1" title={p.status === "active" ? "Archive" : "Unarchive"}>
                    <MdArchive className="text-base" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} className="text-red-400 hover:text-red-600 p-1">
                    <MdDelete className="text-base" />
                  </button>
                </div>
              </div>
              <div className="flex gap-3 mt-2 text-xs text-primary-400">
                <span className="flex items-center gap-1"><MdPeople className="text-xs" />{p.member_count} members</span>
                <span>{p.created_at?.slice(0,10)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="md:col-span-2 glass-card p-4 md:p-5">
          {selected ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <MdTimeline className="text-primary-500 text-xl" />
                <h2 className="section-title">{selected.name} — Activity</h2>
              </div>
              {activity.length === 0 ? (
                <p className="text-sm text-primary-400 text-center py-8">No activity yet for this project.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
                  {activity.map((a) => (
                    <div key={a.id} className="flex items-start gap-3 p-3 bg-primary-50 dark:bg-primary-900/40 rounded-xl">
                      <div className="w-2 h-2 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm" style={{ color:"var(--text)" }}>{a.action}</p>
                        <p className="text-xs text-primary-400">{a.created_at?.slice(0,16).replace("T"," ")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-primary-300">
              <MdFolderOpen className="text-5xl mb-3" />
              <p className="text-sm">Select a project to view activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

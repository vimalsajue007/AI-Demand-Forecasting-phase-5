import { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { datasetsAPI } from "../services/api";
import toast from "react-hot-toast";
import { MdUpload, MdStorage, MdDelete, MdPreview, MdCheckCircle, MdError, MdHourglassTop, MdClose, MdSearch } from "react-icons/md";
import { SkeletonTable } from "../components/ui/Skeleton";

function StatusBadge({ status }) {
  const map = { processed:"badge-success", error:"badge-error", uploaded:"badge-warning" };
  return <span className={map[status] || "badge-warning"}>{status}</span>;
}

export default function DatasetPage() {
  const [datasets, setDatasets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const fetchDatasets = async (s = search, fs = filterStatus) => {
    setLoading(true);
    try {
      const r = await datasetsAPI.list({ search: s, status: fs, limit: 50 });
      const data = r.data?.datasets || r.data || [];
      setDatasets(Array.isArray(data) ? data : []);
      setTotal(r.data?.total || data.length);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchDatasets(); }, []);

  const onDrop = useCallback((accepted) => {
    const f = accepted[0];
    if (f) { setFile(f); if (!name) setName(f.name.replace(/\.[^/.]+$/, "")); }
  }, [name]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"], "application/vnd.ms-excel": [".xls"] },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!file || !name.trim()) { toast.error("Please select a file and provide a name"); return; }
    const fd = new FormData();
    fd.append("file", file); fd.append("name", name.trim());
    setUploading(true);
    try {
      await datasetsAPI.upload(fd);
      toast.success("Dataset uploaded!");
      setFile(null); setName(""); fetchDatasets();
    } catch (err) { toast.error(err.response?.data?.detail || "Upload failed"); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this dataset?")) return;
    await datasetsAPI.delete(id);
    toast.success("Deleted");
    setDatasets((prev) => prev.filter((d) => d.id !== id));
    if (preview?.id === id) setPreview(null);
  };

  const handlePreview = async (id) => {
    setPreviewLoading(true);
    try { const r = await datasetsAPI.preview(id); setPreview({ id, ...r.data }); }
    catch { toast.error("Could not load preview"); }
    finally { setPreviewLoading(false); }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="pt-2 md:pt-0">
        <h1 className="page-title">Datasets</h1>
        <p className="text-xs md:text-sm mt-1" style={{ color: "var(--text-muted)" }}>Upload and manage your sales datasets</p>
      </div>

      {/* Upload */}
      <div className="glass-card p-4 md:p-6">
        <h2 className="section-title mb-4 flex items-center gap-2"><MdUpload className="text-primary-500" /> Upload Dataset</h2>
        <div className="space-y-3 md:space-y-4">
          <div>
            <label className="label">Dataset Name</label>
            <input type="text" className="input-field" placeholder="e.g. Q3 Sales 2024" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-6 md:p-8 text-center cursor-pointer transition-all duration-200
              ${isDragActive ? "border-primary-400 bg-primary-50 dark:bg-primary-900/50" : "border-primary-200 dark:border-primary-800 hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-900/30"}
              ${file ? "border-primary-400 bg-primary-50 dark:bg-primary-900/50" : ""}`}>
            <input {...getInputProps()} />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <MdCheckCircle className="text-primary-500 text-xl md:text-2xl flex-shrink-0" />
                <div className="text-left min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: "var(--text)" }}>{file.name}</p>
                  <p className="text-xs text-primary-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="ml-2 text-primary-400 hover:text-red-400 flex-shrink-0"><MdClose /></button>
              </div>
            ) : (
              <div>
                <MdUpload className="text-primary-300 text-3xl md:text-4xl mx-auto mb-2" />
                <p className="text-primary-600 dark:text-primary-400 font-medium text-sm">{isDragActive ? "Drop here" : "Tap or drag to select"}</p>
                <p className="text-primary-400 text-xs mt-1">CSV, XLSX, or XLS</p>
              </div>
            )}
          </div>
          <button onClick={handleUpload} disabled={uploading || !file} className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2">
            {uploading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {uploading ? "Uploading…" : "Upload & Process"}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="glass-card p-4 md:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <h2 className="section-title flex items-center gap-2"><MdStorage className="text-primary-500" /> Your Datasets</h2>
          <div className="flex gap-2 sm:ml-auto">
            <div className="relative flex-1 sm:flex-none">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400 text-sm" />
              <input className="input-field pl-8 text-xs sm:w-36" placeholder="Search…" value={search}
                onChange={(e) => { setSearch(e.target.value); fetchDatasets(e.target.value, filterStatus); }} />
            </div>
            <select className="input-field text-xs w-28 sm:w-32" value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); fetchDatasets(search, e.target.value); }}>
              <option value="">All</option>
              <option value="processed">Processed</option>
              <option value="uploaded">Uploaded</option>
              <option value="error">Error</option>
            </select>
          </div>
          <span className="text-xs text-primary-400">{total} total</span>
        </div>

        {loading ? <SkeletonTable /> : datasets.length === 0 ? (
          <p className="text-center text-sm py-10" style={{ color: "var(--text-muted)" }}>No datasets found.</p>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-primary-100 dark:border-primary-800">
                    <th className="table-th">Name</th><th className="table-th">File</th>
                    <th className="table-th">Rows</th><th className="table-th">Status</th>
                    <th className="table-th">Uploaded</th><th className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {datasets.map((ds) => (
                    <tr key={ds.id} className="border-b border-primary-50 dark:border-primary-900 hover:bg-primary-50/50 dark:hover:bg-primary-900/30 transition-colors">
                      <td className="table-td font-medium">{ds.name}</td>
                      <td className="table-td text-xs text-primary-400 font-mono">{ds.filename}</td>
                      <td className="table-td">{ds.rows_count?.toLocaleString()}</td>
                      <td className="table-td"><StatusBadge status={ds.status} /></td>
                      <td className="table-td text-primary-400">{ds.created_at?.slice(0,10)}</td>
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handlePreview(ds.id)} className="text-primary-500 hover:text-primary-700"><MdPreview className="text-lg" /></button>
                          <button onClick={() => handleDelete(ds.id)} className="text-red-400 hover:text-red-600"><MdDelete className="text-lg" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden space-y-3">
              {datasets.map((ds) => (
                <div key={ds.id} className="bg-primary-50 dark:bg-primary-900/40 rounded-xl p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>{ds.name}</p>
                      <p className="text-xs text-primary-400 font-mono truncate">{ds.filename}</p>
                    </div>
                    <StatusBadge status={ds.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3 text-xs text-primary-500">
                      <span>{ds.rows_count?.toLocaleString()} rows</span>
                      <span>{ds.created_at?.slice(0,10)}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handlePreview(ds.id)} className="text-primary-500 hover:text-primary-700"><MdPreview className="text-lg" /></button>
                      <button onClick={() => handleDelete(ds.id)} className="text-red-400 hover:text-red-600"><MdDelete className="text-lg" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Preview */}
      {(preview || previewLoading) && (
        <div className="glass-card p-4 md:p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Dataset Preview</h2>
            <button onClick={() => setPreview(null)} className="text-primary-400 hover:text-primary-600"><MdClose className="text-xl" /></button>
          </div>
          {previewLoading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div>
              <div className="flex gap-3 mb-3 text-xs text-primary-500 flex-wrap">
                <span>Shape: <strong style={{ color: "var(--text)" }}>{preview.shape?.rows} × {preview.shape?.cols}</strong></span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-primary-100 dark:border-primary-800">
                <table className="w-full text-xs">
                  <thead className="bg-primary-50 dark:bg-primary-900">
                    <tr>{preview.columns?.map((col) => (
                      <th key={col} className="px-2 md:px-3 py-2 text-left font-semibold text-primary-600 dark:text-primary-400 whitespace-nowrap">{col}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {preview.preview?.map((row, i) => (
                      <tr key={i} className="border-t border-primary-50 dark:border-primary-900 hover:bg-primary-50/50 dark:hover:bg-primary-900/30">
                        {preview.columns?.map((col) => (
                          <td key={col} className="px-2 md:px-3 py-2 whitespace-nowrap" style={{ color: "var(--text)" }}>{String(row[col] ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

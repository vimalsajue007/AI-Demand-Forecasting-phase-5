import { useState, useEffect } from "react";
import { forecastsAPI, reportsAPI } from "../services/api";
import toast from "react-hot-toast";
import { MdAssessment, MdPictureAsPdf, MdLightbulb, MdClose } from "react-icons/md";
import { TbFileSpreadsheet } from "react-icons/tb";
import { SkeletonTable } from "../components/ui/Skeleton";

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  window.URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState({});
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [search, setSearch] = useState("");
  const [filterModel, setFilterModel] = useState("");

  useEffect(() => {
    forecastsAPI.list()
      .then((r) => {
        const data = r.data?.forecasts || r.data || [];
        setForecasts((Array.isArray(data) ? data : []).filter((f) => f.status === "completed"));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (id, type) => {
    setDownloading((prev) => ({ ...prev, [`${id}-${type}`]: true }));
    try {
      const res = type === "excel" ? await reportsAPI.downloadExcel(id) : await reportsAPI.downloadPDF(id);
      downloadBlob(res.data, `forecast_${id}_report.${type === "excel" ? "xlsx" : "pdf"}`);
      toast.success(`${type.toUpperCase()} downloaded!`);
    } catch { toast.error("Download failed"); }
    finally { setDownloading((prev) => ({ ...prev, [`${id}-${type}`]: false })); }
  };

  const handleInsights = async (id) => {
    setInsightsLoading(true);
    setShowInsights(true);
    try {
      const r = await reportsAPI.getInsights(id);
      setInsights(r.data);
    } catch { toast.error("Could not load insights"); setShowInsights(false); }
    finally { setInsightsLoading(false); }
  };

  const filtered = forecasts.filter((f) => {
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase());
    const matchModel = !filterModel || f.model_type === filterModel;
    return matchSearch && matchModel;
  });

  const insightTypeColors = { success: "badge-success", warning: "badge-warning", error: "badge-error", info: "badge-info" };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="pt-2 md:pt-0">
        <h1 className="page-title">Reports</h1>
        <p className="text-primary-500 text-xs md:text-sm mt-1">Download reports and get AI-generated insights</p>
      </div>

      {/* Export type cards */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {[
          { icon: TbFileSpreadsheet, label: "Excel Export", sub: "Structured sheets" },
          { icon: MdPictureAsPdf, label: "PDF Export", sub: "Branded report" },
          { icon: MdLightbulb, label: "AI Insights", sub: "Business recommendations" },
        ].map(({ icon: Icon, label, sub }) => (
          <div key={label} className="glass-card p-3 md:p-5 flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-12 md:h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon className="text-primary-600 text-base md:text-2xl" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-primary-900 text-xs md:text-sm">{label}</p>
              <p className="text-primary-400 text-xs mt-0.5 hidden sm:block">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* AI Insights panel */}
      {showInsights && (
        <div className="glass-card p-4 md:p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2"><MdLightbulb className="text-yellow-500" /> AI Business Insights</h2>
            <button onClick={() => setShowInsights(false)} className="text-primary-400 hover:text-primary-600"><MdClose /></button>
          </div>
          {insightsLoading ? (
            <div className="h-24 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : insights && (
            <div className="space-y-3">
              <p className="text-sm text-primary-600">{insights.summary}</p>
              {insights.insights?.map((ins, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-primary-50 rounded-xl">
                  <span className={`${insightTypeColors[ins.type]} flex-shrink-0`}>{ins.title}</span>
                  <p className="text-sm text-primary-700">{ins.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reports list */}
      <div className="glass-card p-4 md:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <h2 className="section-title flex items-center gap-2"><MdAssessment className="text-primary-500" /> Completed Forecasts</h2>
          <div className="flex gap-2 sm:ml-auto">
            <input className="input-field text-xs w-36" placeholder="Search…" value={search}
              onChange={(e) => setSearch(e.target.value)} />
            <select className="input-field text-xs w-36" value={filterModel} onChange={(e) => setFilterModel(e.target.value)}>
              <option value="">All Models</option>
              <option value="linear_regression">Linear</option>
              <option value="ridge_regression">Ridge</option>
              <option value="random_forest">Random Forest</option>
              <option value="gradient_boosting">Gradient Boost</option>
              <option value="ensemble">Ensemble</option>
            </select>
          </div>
        </div>

        {loading ? <SkeletonTable /> : filtered.length === 0 ? (
          <div className="text-center py-10 md:py-14">
            <MdAssessment className="text-4xl md:text-5xl text-primary-200 mx-auto mb-3" />
            <p className="text-primary-400 text-sm">No completed forecasts found.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-primary-100">
                  <th className="table-th">Forecast</th><th className="table-th">Model</th>
                  <th className="table-th">Periods</th><th className="table-th">R² Accuracy</th>
                  <th className="table-th">MAE</th><th className="table-th">RMSE</th>
                  <th className="table-th">Created</th><th className="table-th">Actions</th>
                </tr></thead>
                <tbody>
                  {filtered.map((f) => (
                    <tr key={f.id} className="border-b border-primary-50 hover:bg-primary-50/50 transition-colors">
                      <td className="table-td font-semibold">{f.name}</td>
                      <td className="table-td"><span className="font-mono text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-lg">{f.model_type?.replace("_"," ")}</span></td>
                      <td className="table-td">{f.periods}</td>
                      <td className="table-td">{f.accuracy_score ? <span className={`font-bold ${f.accuracy_score > 0.8 ? "text-primary-600" : f.accuracy_score > 0.6 ? "text-yellow-600" : "text-red-500"}`}>{(f.accuracy_score * 100).toFixed(1)}%</span> : "—"}</td>
                      <td className="table-td font-mono text-xs">{f.mae ? f.mae.toFixed(4) : "—"}</td>
                      <td className="table-td font-mono text-xs">{f.rmse ? f.rmse.toFixed(4) : "—"}</td>
                      <td className="table-td text-primary-400">{f.created_at?.slice(0,10)}</td>
                      <td className="table-td">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleDownload(f.id,"excel")} disabled={downloading[`${f.id}-excel`]} className="flex items-center gap-1 btn-secondary text-xs px-2 py-1.5">
                            {downloading[`${f.id}-excel`] ? <div className="w-3 h-3 border border-primary-400 border-t-primary-700 rounded-full animate-spin" /> : <TbFileSpreadsheet />} XLSX
                          </button>
                          <button onClick={() => handleDownload(f.id,"pdf")} disabled={downloading[`${f.id}-pdf`]} className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs px-2 py-1.5 rounded-xl font-medium">
                            {downloading[`${f.id}-pdf`] ? <div className="w-3 h-3 border border-red-300 border-t-red-600 rounded-full animate-spin" /> : <MdPictureAsPdf />} PDF
                          </button>
                          <button onClick={() => handleInsights(f.id)} className="flex items-center gap-1 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 text-xs px-2 py-1.5 rounded-xl font-medium">
                            <MdLightbulb /> AI
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {filtered.map((f) => (
                <div key={f.id} className="bg-primary-50 rounded-xl p-3 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-primary-900 text-sm truncate">{f.name}</p>
                      <span className="font-mono text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-lg inline-block mt-1">{f.model_type?.replace("_"," ")}</span>
                    </div>
                    {f.accuracy_score && <span className={`text-sm font-bold flex-shrink-0 ${f.accuracy_score > 0.8 ? "text-primary-600" : f.accuracy_score > 0.6 ? "text-yellow-600" : "text-red-500"}`}>{(f.accuracy_score * 100).toFixed(1)}%</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleDownload(f.id,"excel")} disabled={downloading[`${f.id}-excel`]} className="flex items-center justify-center gap-1 btn-secondary text-xs px-2 py-2 flex-1">
                      {downloading[`${f.id}-excel`] ? <div className="w-3 h-3 border border-primary-400 border-t-primary-700 rounded-full animate-spin" /> : <TbFileSpreadsheet />} XLSX
                    </button>
                    <button onClick={() => handleDownload(f.id,"pdf")} disabled={downloading[`${f.id}-pdf`]} className="flex items-center justify-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs px-2 py-2 rounded-xl font-medium flex-1">
                      {downloading[`${f.id}-pdf`] ? <div className="w-3 h-3 border border-red-300 border-t-red-600 rounded-full animate-spin" /> : <MdPictureAsPdf />} PDF
                    </button>
                    <button onClick={() => handleInsights(f.id)} className="flex items-center justify-center gap-1 bg-yellow-50 text-yellow-700 text-xs px-2 py-2 rounded-xl font-medium flex-1">
                      <MdLightbulb /> AI Insights
                    </button>
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

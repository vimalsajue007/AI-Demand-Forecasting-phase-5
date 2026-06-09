import { useState, useEffect } from "react";
import { intelligenceAPI, datasetsAPI } from "../services/api";
import { MdLightbulb, MdTrendingUp, MdTrendingDown, MdWarning, MdRefresh } from "react-icons/md";
import { SkeletonCard } from "../components/ui/Skeleton";

const typeColors = { success:"badge-success", warning:"badge-warning", error:"badge-error", info:"badge-info" };
const priorityColors = { high:"border-l-4 border-red-400 bg-red-50 dark:bg-red-900/20", medium:"border-l-4 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20", low:"border-l-4 border-primary-400 bg-primary-50 dark:bg-primary-900/40" };

export default function AIInsightsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchInsights(); }, []);

  const fetchInsights = async () => {
    setLoading(true);
    try { const r = await intelligenceAPI.aiInsights(); setData(r.data); }
    catch {} finally { setLoading(false); }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-start justify-between gap-3 pt-2 md:pt-0">
        <div>
          <h1 className="page-title flex items-center gap-2"><MdLightbulb className="text-yellow-500" /> AI Insights Engine</h1>
          <p className="text-xs md:text-sm mt-1" style={{ color:"var(--text-muted)" }}>Automated business recommendations and demand intelligence</p>
        </div>
        <button onClick={fetchInsights} className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2">
          <MdRefresh /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : data && (
        <>
          {/* Summary */}
          <div className="glass-card p-4 md:p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-xl flex items-center justify-center flex-shrink-0">
                <MdLightbulb className="text-yellow-500 text-xl" />
              </div>
              <div>
                <h2 className="section-title mb-1">AI Summary</h2>
                <p className="text-sm" style={{ color:"var(--text-muted)" }}>{data.summary}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ["Insights Found", data.insights?.length || 0],
              ["Opportunities", data.opportunities?.length || 0],
              ["Growing Products", data.growing_products?.length || 0],
              ["Declining Products", data.declining_products?.length || 0],
            ].map(([label, val]) => (
              <div key={label} className="stat-card">
                <p className="text-xs text-primary-500 uppercase">{label}</p>
                <p className="font-display text-2xl font-bold mt-1" style={{ color:"var(--text)" }}>{val}</p>
              </div>
            ))}
          </div>

          {/* Insights */}
          {data.insights?.length > 0 && (
            <div className="glass-card p-4 md:p-5">
              <h2 className="section-title mb-4">Business Insights</h2>
              <div className="space-y-3">
                {data.insights.map((ins, i) => (
                  <div key={i} className={`p-3 rounded-xl ${priorityColors[ins.priority] || "bg-primary-50 dark:bg-primary-900/40"}`}>
                    <div className="flex items-start gap-3">
                      <span className={typeColors[ins.type]}>{ins.title}</span>
                      <p className="text-sm flex-1" style={{ color:"var(--text)" }}>{ins.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Opportunities */}
            {data.opportunities?.length > 0 && (
              <div className="glass-card p-4 md:p-5">
                <h2 className="section-title mb-3 flex items-center gap-2"><MdTrendingUp className="text-primary-500" /> Demand Opportunities</h2>
                <div className="space-y-2">
                  {data.opportunities.map((o, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 bg-primary-50 dark:bg-primary-900/40 rounded-xl">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                      <p className="text-xs" style={{ color:"var(--text)" }}>{o}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Growing & Declining */}
            <div className="glass-card p-4 md:p-5">
              <h2 className="section-title mb-3">Product Trends</h2>
              {data.growing_products?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-primary-600 mb-2 flex items-center gap-1"><MdTrendingUp /> High Growth</p>
                  <div className="space-y-1.5">
                    {data.growing_products.map((p, i) => (
                      <div key={i} className="flex justify-between p-2 bg-primary-50 dark:bg-primary-900/40 rounded-lg">
                        <span className="text-xs font-medium" style={{ color:"var(--text)" }}>{p.name}</span>
                        <span className="badge-success text-xs">+{p.growth}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data.declining_products?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-500 mb-2 flex items-center gap-1"><MdTrendingDown /> Declining</p>
                  <div className="space-y-1.5">
                    {data.declining_products.map((p, i) => (
                      <div key={i} className="flex justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <span className="text-xs font-medium" style={{ color:"var(--text)" }}>{p.name}</span>
                        <span className="badge-error text-xs">-{p.decline}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!data.growing_products?.length && !data.declining_products?.length && (
                <p className="text-sm text-primary-400 text-center py-4">Complete more forecasts to see product trends.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

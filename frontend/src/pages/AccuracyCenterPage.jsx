import { useState, useEffect } from "react";
import { intelligenceAPI } from "../services/api";
import { MdAutoGraph, MdTrendingUp, MdStar } from "react-icons/md";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { SkeletonChart, SkeletonCard } from "../components/ui/Skeleton";

const GREENS = ["#22c55e","#16a34a","#4ade80","#166534","#86efac"];

export default function AccuracyCenterPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    intelligenceAPI.accuracyCenter().then((r) => setData(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="pt-2 md:pt-0">
        <h1 className="page-title flex items-center gap-2"><MdAutoGraph className="text-primary-500" /> Forecast Accuracy Center</h1>
        <p className="text-xs md:text-sm mt-1" style={{ color:"var(--text-muted)" }}>Track model performance trends and accuracy improvements over time</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {loading ? [...Array(4)].map((_, i) => <SkeletonCard key={i} />) : (
          <>
            {[
              ["Total Forecasts", data?.total_forecasts || 0],
              ["Avg Accuracy", `${data?.avg_accuracy || 0}%`],
              ["Best Model", data?.best_model?.replace(/_/g," ") || "—"],
              ["Trend", data?.improving ? "📈 Improving" : "📉 Declining"],
            ].map(([label, value]) => (
              <div key={label} className="stat-card">
                <p className="text-xs font-medium text-primary-500 uppercase">{label}</p>
                <p className="font-display text-lg font-bold mt-1 truncate" style={{ color:"var(--text)" }}>{value}</p>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="glass-card p-4 md:p-5">
        <h2 className="section-title mb-4">Accuracy Over Time</h2>
        {loading ? <SkeletonChart /> : data?.accuracy_trend?.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.accuracy_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(134,239,172,0.15)" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9 }} domain={[0, 100]} unit="%" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="accuracy" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} name="R² Accuracy %" />
              <Line type="monotone" dataKey="mae" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="MAE" />
            </LineChart>
          </ResponsiveContainer>
        ) : <p className="text-sm text-center py-8 text-primary-400">No completed forecasts yet.</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-4 md:p-5">
          <h2 className="section-title mb-4">Model Comparison</h2>
          {loading ? <SkeletonChart /> : data?.model_comparison?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.model_comparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(134,239,172,0.15)" />
                <XAxis dataKey="model" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} unit="%" />
                <Tooltip />
                <Bar dataKey="avg_r2" name="Avg R² %" radius={[4,4,0,0]}>
                  {data.model_comparison.map((_, i) => <Cell key={i} fill={GREENS[i % GREENS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-center py-8 text-primary-400">Complete forecasts to compare models.</p>}
        </div>

        <div className="glass-card p-4 md:p-5">
          <h2 className="section-title mb-4 flex items-center gap-2"><MdStar className="text-yellow-500" /> Model Leaderboard</h2>
          {loading ? <SkeletonChart /> : (
            <div className="space-y-2">
              {data?.model_comparison?.map((m, i) => (
                <div key={m.model} className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/40 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-bold text-primary-500 w-5">#{i+1}</span>
                    <div>
                      <p className="text-sm font-medium capitalize" style={{ color:"var(--text)" }}>{m.model.replace(/_/g," ")}</p>
                      <p className="text-xs text-primary-400">{m.count} forecasts</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-600">{m.avg_r2}%</p>
                    <p className="text-xs text-primary-400">MAE: {m.avg_mae}</p>
                  </div>
                </div>
              ))}
              {(!data?.model_comparison || data.model_comparison.length === 0) && (
                <p className="text-sm text-center py-4 text-primary-400">No model data yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

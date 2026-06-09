import { useState, useEffect, useCallback } from "react";
import { dashboardAPI } from "../services/api";
export function useRealtime(intervalMs = 30000) {
  const [realtimeStats, setRealtimeStats] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const fetchRealtime = useCallback(async () => {
    try { const res = await dashboardAPI.realtime(); setRealtimeStats(res.data); setLastUpdated(new Date()); } catch {}
  }, []);
  useEffect(() => {
    fetchRealtime();
    const interval = setInterval(fetchRealtime, intervalMs);
    return () => clearInterval(interval);
  }, [fetchRealtime, intervalMs]);
  return { realtimeStats, lastUpdated, refresh: fetchRealtime };
}

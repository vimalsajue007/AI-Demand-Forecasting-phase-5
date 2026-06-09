import { useState, useCallback } from "react";
import { analyticsAPI } from "../services/api";
export function useGlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const search = useCallback(async (q) => {
    setQuery(q);
    if (q.length < 2) { setResults(null); setOpen(false); return; }
    setLoading(true); setOpen(true);
    try { const res = await analyticsAPI.globalSearch(q); setResults(res.data); }
    catch { setResults(null); } finally { setLoading(false); }
  }, []);
  const clear = () => { setQuery(""); setResults(null); setOpen(false); };
  return { query, results, loading, open, search, clear, setOpen };
}

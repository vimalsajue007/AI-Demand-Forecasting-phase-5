import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MdSearch, MdClose, MdStorage, MdAutoGraph } from "react-icons/md";
import { useGlobalSearch } from "../../hooks/useSearch";
export default function GlobalSearch() {
  const { query, results, loading, open, search, clear, setOpen } = useGlobalSearch();
  const ref = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400 text-sm" />
        <input className="input-field pl-8 text-sm w-36 sm:w-52 md:w-64 py-2" placeholder="Search…" value={query} onChange={(e) => search(e.target.value)} onFocus={() => query.length >= 2 && setOpen(true)} />
        {query && <button onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-600"><MdClose className="text-sm" /></button>}
      </div>
      {open && (
        <div className="absolute top-10 left-0 w-72 sm:w-80 glass-card shadow-xl z-50 overflow-hidden animate-scale-in">
          {loading ? <div className="p-4 text-center text-sm" style={{ color:"var(--text-muted)" }}>Searching…</div> : results ? (
            <div>
              {results.total === 0 ? <div className="p-4 text-center text-sm" style={{ color:"var(--text-muted)" }}>No results for "{query}"</div> : (
                <div>
                  {results.datasets?.length > 0 && <div>
                    <p className="px-3 py-1.5 text-xs font-semibold text-primary-500 uppercase bg-primary-50 dark:bg-primary-900/50">Datasets</p>
                    {results.datasets.map((d) => <button key={d.id} onClick={() => { navigate("/datasets"); clear(); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-primary-50 dark:hover:bg-primary-900/50 text-left"><MdStorage className="text-primary-400 flex-shrink-0" /><div className="min-w-0"><p className="text-sm truncate" style={{ color:"var(--text)" }}>{d.name}</p><p className="text-xs text-primary-400 capitalize">{d.status}</p></div></button>)}
                  </div>}
                  {results.forecasts?.length > 0 && <div>
                    <p className="px-3 py-1.5 text-xs font-semibold text-primary-500 uppercase bg-primary-50 dark:bg-primary-900/50">Forecasts</p>
                    {results.forecasts.map((f) => <button key={f.id} onClick={() => { navigate("/forecast"); clear(); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-primary-50 dark:hover:bg-primary-900/50 text-left"><MdAutoGraph className="text-primary-400 flex-shrink-0" /><div className="min-w-0"><p className="text-sm truncate" style={{ color:"var(--text)" }}>{f.name}</p><p className="text-xs text-primary-400 font-mono">{f.model}</p></div></button>)}
                  </div>}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

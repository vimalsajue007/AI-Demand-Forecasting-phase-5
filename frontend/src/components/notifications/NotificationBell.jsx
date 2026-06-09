import { useState, useEffect, useRef } from "react";
import { notificationsAPI } from "../../services/api";
import { MdNotifications, MdNotificationsNone, MdClose, MdDoneAll } from "react-icons/md";
import toast from "react-hot-toast";
const typeColors = { success:"border-l-4 border-primary-400 bg-primary-50 dark:bg-primary-900/50", error:"border-l-4 border-red-400 bg-red-50 dark:bg-red-900/30", warning:"border-l-4 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30", info:"border-l-4 border-blue-400 bg-blue-50 dark:bg-blue-900/30" };
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  useEffect(() => { fetchUnread(); const i = setInterval(fetchUnread, 30000); return () => clearInterval(i); }, []);
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const fetchUnread = async () => { try { const r = await notificationsAPI.unreadCount(); setUnread(r.data.count); } catch {} };
  const fetchNotifications = async () => { setLoading(true); try { const r = await notificationsAPI.list({ limit: 15 }); setNotifications(r.data); } catch {} finally { setLoading(false); } };
  const handleOpen = () => { setOpen(!open); if (!open) fetchNotifications(); };
  const markRead = async (id) => { await notificationsAPI.markRead(id); setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n)); setUnread((u) => Math.max(0, u - 1)); };
  const markAllRead = async () => { await notificationsAPI.markAllRead(); setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true }))); setUnread(0); toast.success("All marked as read"); };
  const deleteNotif = async (id) => { await notificationsAPI.delete(id); setNotifications((prev) => prev.filter((n) => n.id !== id)); };
  return (
    <div className="relative" ref={ref}>
      <button onClick={handleOpen} className="relative p-2 rounded-xl transition-colors hover:bg-primary-100 dark:hover:bg-primary-900">
        {unread > 0 ? <MdNotifications className="text-xl text-primary-600 dark:text-primary-400" /> : <MdNotificationsNone className="text-xl text-primary-600 dark:text-primary-400" />}
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <>
          <div className="sm:hidden fixed inset-0 bg-black/20 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-[calc(100vw-2rem)] sm:w-80 max-w-sm glass-card shadow-xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-primary-100 dark:border-primary-800">
              <h3 className="font-semibold text-sm" style={{ color:"var(--text)" }}>Notifications</h3>
              {unread > 0 && <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800"><MdDoneAll /> Mark all read</button>}
            </div>
            <div className="max-h-72 overflow-y-auto scrollbar-thin">
              {loading ? <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-primary-50 dark:bg-primary-900 rounded-lg animate-pulse" />)}</div>
               : notifications.length === 0 ? <div className="p-8 text-center text-primary-400 text-sm"><MdNotificationsNone className="text-3xl mx-auto mb-2" />No notifications</div>
               : notifications.map((n) => (
                <div key={n.id} onClick={() => !n.is_read && markRead(n.id)} className={`px-4 py-3 border-b border-primary-50 dark:border-primary-900 cursor-pointer ${typeColors[n.type] || ""} ${!n.is_read ? "font-medium" : "opacity-60"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="text-xs font-semibold truncate" style={{ color:"var(--text)" }}>{n.title}</p><p className="text-xs text-primary-600 dark:text-primary-400 mt-0.5 line-clamp-2">{n.message}</p><p className="text-[10px] text-primary-400 mt-1">{n.created_at?.slice(0,16).replace("T"," ")}</p></div>
                    <button onClick={(e) => { e.stopPropagation(); deleteNotif(n.id); }} className="text-primary-300 hover:text-red-400 flex-shrink-0"><MdClose className="text-sm" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

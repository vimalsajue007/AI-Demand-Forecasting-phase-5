import { useState, useEffect } from "react";
import { collaborationAPI, forecastsAPI } from "../services/api";
import toast from "react-hot-toast";
import { MdPeople, MdComment, MdShare, MdHistory, MdSend, MdDelete, MdEdit, MdClose, MdLink } from "react-icons/md";
import { SkeletonTable } from "../components/ui/Skeleton";

export default function CollaborationPage() {
  const [forecasts, setForecasts] = useState([]);
  const [selectedForecast, setSelectedForecast] = useState(null);
  const [tab, setTab] = useState("comments");
  const [comments, setComments] = useState([]);
  const [revisions, setRevisions] = useState([]);
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    forecastsAPI.list({ status: "completed" })
      .then((r) => { const data = r.data?.forecasts || r.data || []; setForecasts(Array.isArray(data) ? data : []); })
      .finally(() => setLoading(false));
  }, []);

  const handleSelectForecast = async (f) => {
    setSelectedForecast(f);
    setTab("comments");
    await loadComments(f.id);
  };

  const loadComments = async (id) => {
    try { const r = await collaborationAPI.getComments(id); setComments(r.data || []); } catch { setComments([]); }
  };

  const loadRevisions = async (id) => {
    try { const r = await collaborationAPI.getRevisions(id); setRevisions(r.data || []); } catch { setRevisions([]); }
  };

  const loadShares = async (id) => {
    try { const r = await collaborationAPI.getShares(id); setShares(r.data || []); } catch { setShares([]); }
  };

  const handleTabChange = async (t) => {
    setTab(t);
    if (!selectedForecast) return;
    if (t === "comments") await loadComments(selectedForecast.id);
    if (t === "revisions") await loadRevisions(selectedForecast.id);
    if (t === "sharing") await loadShares(selectedForecast.id);
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !selectedForecast) return;
    setSending(true);
    try {
      const r = await collaborationAPI.addComment(selectedForecast.id, { content: newComment.trim(), parent_id: replyTo });
      await loadComments(selectedForecast.id);
      setNewComment(""); setReplyTo(null);
      toast.success("Comment added!");
    } catch { toast.error("Failed"); } finally { setSending(false); }
  };

  const handleDeleteComment = async (commentId) => {
    await collaborationAPI.deleteComment(commentId);
    await loadComments(selectedForecast.id);
    toast.success("Deleted");
  };

  const handleEditComment = async (commentId) => {
    if (!editContent.trim()) return;
    await collaborationAPI.updateComment(commentId, { content: editContent });
    setEditingComment(null); setEditContent("");
    await loadComments(selectedForecast.id);
    toast.success("Updated");
  };

  const handleShare = async (days) => {
    setSharing(true);
    try {
      const r = await collaborationAPI.shareReport(selectedForecast.id, days);
      toast.success("Share link created!");
      const url = `${window.location.origin}${r.data.share_url}`;
      navigator.clipboard.writeText(url).then(() => toast.success("Link copied!"));
      await loadShares(selectedForecast.id);
    } catch { toast.error("Failed to create share link"); } finally { setSharing(false); }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="pt-2 md:pt-0">
        <h1 className="page-title flex items-center gap-2"><MdPeople className="text-primary-500" /> Collaboration</h1>
        <p className="text-xs md:text-sm mt-1" style={{ color:"var(--text-muted)" }}>Comments, sharing, and revision history for forecasts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Forecast list */}
        <div className="md:col-span-1 glass-card p-4">
          <h2 className="section-title mb-3">Completed Forecasts</h2>
          {loading ? <SkeletonTable rows={3} /> : (
            <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
              {forecasts.length === 0 ? (
                <p className="text-xs text-primary-400 text-center py-4">No completed forecasts.</p>
              ) : forecasts.map((f) => (
                <button key={f.id} onClick={() => handleSelectForecast(f)}
                  className={`w-full text-left p-3 rounded-xl transition-all text-xs ${selectedForecast?.id === f.id ? "bg-primary-600 text-white" : "bg-primary-50 dark:bg-primary-900/40 hover:bg-primary-100 dark:hover:bg-primary-900"}`}>
                  <p className="font-medium truncate" style={{ color: selectedForecast?.id === f.id ? "white" : "var(--text)" }}>{f.name}</p>
                  <p className={`mt-0.5 font-mono ${selectedForecast?.id === f.id ? "text-primary-200" : "text-primary-400"}`}>{f.model_type}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main panel */}
        <div className="md:col-span-3 glass-card p-4 md:p-5">
          {!selectedForecast ? (
            <div className="h-48 flex flex-col items-center justify-center text-primary-300">
              <MdPeople className="text-5xl mb-3" />
              <p className="text-sm">Select a forecast to collaborate</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4 gap-2">
                <h2 className="section-title truncate">{selectedForecast.name}</h2>
                <div className="flex gap-1 bg-primary-100 dark:bg-primary-900/50 p-1 rounded-xl flex-shrink-0">
                  {[{ key:"comments", icon:MdComment }, { key:"revisions", icon:MdHistory }, { key:"sharing", icon:MdShare }].map(({ key, icon:Icon }) => (
                    <button key={key} onClick={() => handleTabChange(key)}
                      className={`p-2 rounded-lg transition-all capitalize text-xs flex items-center gap-1 ${tab === key ? "bg-white dark:bg-primary-800 shadow-sm" : ""}`}
                      style={{ color: tab === key ? "var(--text)" : "var(--text-muted)" }}>
                      <Icon className="text-base" /><span className="hidden sm:inline">{key}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Comments */}
              {tab === "comments" && (
                <div className="space-y-4">
                  <div className="max-h-64 overflow-y-auto scrollbar-thin space-y-3 pr-1">
                    {comments.length === 0 ? (
                      <p className="text-sm text-primary-400 text-center py-6">No comments yet. Start the conversation!</p>
                    ) : comments.map((c) => (
                      <div key={c.id} className="space-y-2">
                        <div className={`p-3 rounded-xl ${c.is_mine ? "bg-primary-100 dark:bg-primary-800 ml-4" : "bg-primary-50 dark:bg-primary-900/40"}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-primary-600">{c.is_mine ? "You" : `User #${c.user_id}`}</span>
                                {c.is_edited && <span className="text-[10px] text-primary-400">(edited)</span>}
                                {replyTo === c.id && <span className="badge-info text-xs">Replying</span>}
                              </div>
                              {editingComment === c.id ? (
                                <div className="flex gap-2 mt-1">
                                  <input className="input-field text-xs flex-1" value={editContent} onChange={(e) => setEditContent(e.target.value)} />
                                  <button onClick={() => handleEditComment(c.id)} className="btn-primary text-xs px-3 py-1.5">Save</button>
                                  <button onClick={() => setEditingComment(null)} className="text-primary-400"><MdClose /></button>
                                </div>
                              ) : <p className="text-sm" style={{ color:"var(--text)" }}>{c.content}</p>}
                              <p className="text-[10px] text-primary-400 mt-1">{c.created_at?.slice(0,16).replace("T"," ")}</p>
                            </div>
                            {c.is_mine && editingComment !== c.id && (
                              <div className="flex gap-1 flex-shrink-0">
                                <button onClick={() => { setEditingComment(c.id); setEditContent(c.content); }} className="text-primary-400 hover:text-primary-600"><MdEdit className="text-sm" /></button>
                                <button onClick={() => handleDeleteComment(c.id)} className="text-red-400 hover:text-red-600"><MdDelete className="text-sm" /></button>
                              </div>
                            )}
                          </div>
                          {!c.is_mine && <button onClick={() => setReplyTo(c.id === replyTo ? null : c.id)} className="text-xs text-primary-500 hover:text-primary-700 mt-1">↩ Reply</button>}
                        </div>
                        {c.replies?.map((r) => (
                          <div key={r.id} className={`ml-6 p-2.5 rounded-xl text-xs ${r.is_mine ? "bg-primary-100 dark:bg-primary-800" : "bg-primary-50 dark:bg-primary-900/40"}`}>
                            <span className="font-semibold text-primary-600">{r.is_mine ? "You" : `User #${r.user_id}`}: </span>
                            <span style={{ color:"var(--text)" }}>{r.content}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  {replyTo && <p className="text-xs text-primary-500 bg-primary-50 dark:bg-primary-900/40 px-3 py-1.5 rounded-lg">Replying to comment #{replyTo} — <button onClick={() => setReplyTo(null)} className="text-red-400">Cancel</button></p>}
                  <div className="flex gap-2">
                    <input className="input-field flex-1 text-sm" placeholder="Write a comment…" value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSendComment())} />
                    <button onClick={handleSendComment} disabled={sending || !newComment.trim()} className="btn-primary px-4 flex items-center gap-1.5 text-sm">
                      {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <MdSend />}
                    </button>
                  </div>
                </div>
              )}

              {/* Revisions */}
              {tab === "revisions" && (
                <div className="space-y-2">
                  {revisions.length === 0 ? (
                    <p className="text-sm text-primary-400 text-center py-6">No revision history yet.</p>
                  ) : revisions.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/40 rounded-xl">
                      <div>
                        <p className="text-sm font-medium" style={{ color:"var(--text)" }}>Version {r.version}</p>
                        <p className="text-xs text-primary-400">{r.model_type} • {r.changes || "Forecast updated"}</p>
                        <p className="text-xs text-primary-400">{r.created_at?.slice(0,16).replace("T"," ")}</p>
                      </div>
                      {r.accuracy_score && <span className="badge-success">{r.accuracy_score}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Sharing */}
              {tab === "sharing" && (
                <div className="space-y-4">
                  <div className="flex gap-3 flex-wrap">
                    {[7, 14, 30].map((days) => (
                      <button key={days} onClick={() => handleShare(days)} disabled={sharing}
                        className="btn-secondary flex items-center gap-2 text-sm">
                        <MdLink /> Share for {days} days
                      </button>
                    ))}
                  </div>
                  {shares.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2" style={{ color:"var(--text)" }}>Active Share Links</h3>
                      <div className="space-y-2">
                        {shares.map((s) => (
                          <div key={s.id} className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/40 rounded-xl gap-2">
                            <div>
                              <p className="text-xs font-mono text-primary-600">{s.share_token}</p>
                              <p className="text-xs text-primary-400">{s.view_count} views • Expires: {s.expires_at?.slice(0,10)}</p>
                            </div>
                            <span className={s.is_active ? "badge-success" : "badge-warning"}>{s.is_active ? "Active" : "Expired"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {shares.length === 0 && <p className="text-sm text-primary-400 text-center py-4">No share links created yet.</p>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

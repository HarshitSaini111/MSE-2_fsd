import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

const API = "https://mse-2-fsd-9quc.onrender.com/api";

const CATEGORIES = ["Academic", "Hostel", "Transport", "Other"];
const STATUSES   = ["Pending", "Resolved"];

/* ── Helpers ── */
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const timeAgo = (dateStr) => {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
};

const initForm = { title: "", description: "", category: "Academic" };

/* ─────────────────────────────────────────────
   MODAL — add / edit grievance
───────────────────────────────────────────── */
function GrievanceModal({ mode, initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial || initForm);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async () => {
    if (!form.title.trim() || !form.description.trim())
      return setErr("Title and description are required.");
    setErr(""); setLoading(true);
    try {
      const url  = mode === "edit"
        ? `${API}/grievances/${initial._id}`
        : `${API}/grievances`;
      const method = mode === "edit" ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Request failed.");
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">
            {mode === "edit" ? "✏️ Edit Grievance" : "📝 New Grievance"}
          </span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {err && <div className="alert alert-error"><span>⚠️</span> {err}</div>}

          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              className="form-control"
              name="title"
              placeholder="Brief title of your grievance"
              value={form.title}
              onChange={change}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-control" name="category" value={form.category} onChange={change}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              name="description"
              placeholder="Explain your grievance in detail..."
              value={form.description}
              onChange={change}
            />
          </div>

          {mode === "edit" && (
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-control" name="status" value={form.status} onChange={change}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ width: "auto", padding: "10px 24px" }}
            onClick={submit} disabled={loading}>
            {loading ? <span className="spinner" /> : mode === "edit" ? "Save Changes" : "Submit Grievance"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CONFIRM DELETE MODAL
───────────────────────────────────────────── */
function ConfirmModal({ title, onConfirm, onCancel, loading }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <span className="modal-title">🗑️ Confirm Delete</span>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        <div className="modal-body" style={{ paddingBottom: 8 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6 }}>
            Are you sure you want to delete{" "}
            <strong style={{ color: "var(--text)" }}>"{title}"</strong>?
            This action cannot be undone.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}
            style={{ padding: "10px 20px" }}>
            {loading ? <span className="spinner" /> : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN DASHBOARD
───────────────────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate();
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [searchQ, setSearchQ]   = useState("");
  const [searching, setSearching] = useState(false);
  const [modal, setModal]       = useState(null); // null | 'add' | 'edit'
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [delLoading, setDelLoading]     = useState(false);
  const [toast, setToast] = useState("");

  /* username from token */
  let username = "Student";
  try {
    const payload = JSON.parse(atob(localStorage.getItem("token").split(".")[1]));
    username = payload.name || "Student";
  } catch {}

  /* ── Fetch all ── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/grievances`, { headers: authHeaders() });
      if (res.status === 401) { logout(); return; }
      const data = await res.json();
      setGrievances(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("token")) { navigate("/login"); return; }
    fetchAll();
  }, [fetchAll, navigate]);

  /* ── Search ── */
  const handleSearch = async () => {
    if (!searchQ.trim()) return fetchAll();
    setSearching(true);
    try {
      const res  = await fetch(
        `${API}/grievances/search?title=${encodeURIComponent(searchQ)}`,
        { headers: authHeaders() }
      );
      const data = await res.json();
      setGrievances(Array.isArray(data) ? data : []);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => { setSearchQ(""); fetchAll(); };

  /* ── Delete ── */
  const handleDelete = async () => {
    setDelLoading(true);
    try {
      await fetch(`${API}/grievances/${deleteTarget._id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      setDeleteTarget(null);
      showToast("Grievance deleted.");
      fetchAll();
    } finally {
      setDelLoading(false);
    }
  };

  /* ── Toast ── */
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  };

  const onSaved = () => {
    setModal(null); setEditTarget(null);
    showToast(modal === "edit" ? "Grievance updated!" : "Grievance submitted!");
    fetchAll();
  };

  /* ── Logout ── */
  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  /* ── Stats ── */
  const total    = grievances.length;
  const pending  = grievances.filter((g) => g.status === "Pending").length;
  const resolved = grievances.filter((g) => g.status === "Resolved").length;

  /* ─────────────────── RENDER ─────────────────── */
  return (
    <div className="dashboard">
      {/* ── TOPBAR ── */}
      <header className="topbar">
        <div className="topbar-brand">
          <div className="topbar-brand-icon">🎓</div>
          Grievance<span>Hub</span>
        </div>

        <div className="topbar-right">
          <div className="topbar-user">
            <div className="topbar-avatar">
              {username.charAt(0).toUpperCase()}
            </div>
            <span className="topbar-username">{username}</span>
          </div>
          <button className="btn-logout" onClick={logout}>
            <span>⎋</span> Logout
          </button>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="dashboard-body">

        {/* ── LEFT PANEL (submit form trigger) ── */}
        <aside className="panel-left">
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                <span className="card-title-icon">📋</span>
                Quick Actions
              </span>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                className="btn btn-primary"
                onClick={() => setModal("add")}
              >
                + Submit Grievance
              </button>
              <button
                className="btn btn-ghost"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={fetchAll}
              >
                ↻ Refresh List
              </button>
            </div>
          </div>

          {/* Categories legend */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                <span className="card-title-icon">🏷️</span>
                Categories
              </span>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {CATEGORIES.map((cat) => {
                const count = grievances.filter((g) => g.category === cat).length;
                return (
                  <div key={cat} style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", fontSize: 13, color: "var(--text-muted)"
                  }}>
                    <span>{cat}</span>
                    <span style={{
                      background: "var(--surface)", padding: "2px 10px",
                      borderRadius: "100px", fontSize: 11,
                      color: "var(--text)", fontWeight: 600,
                      border: "1px solid var(--border)"
                    }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tips */}
          <div className="card" style={{ background: "var(--accent-glow)", borderColor: "rgba(99,179,237,0.15)" }}>
            <div className="card-body">
              <p style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                💡 Quick Tip
              </p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                Use the search bar to quickly find any past complaint by its title keyword.
              </p>
            </div>
          </div>
        </aside>

        {/* ── RIGHT PANEL ── */}
        <main className="panel-right">

          {/* Stats */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-icon">📂</div>
              <div className="stat-value">{total}</div>
              <div className="stat-label">Total</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⏳</div>
              <div className="stat-value" style={{ color: "var(--warning)" }}>{pending}</div>
              <div className="stat-label">Pending</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-value" style={{ color: "var(--success)" }}>{resolved}</div>
              <div className="stat-label">Resolved</div>
            </div>
          </div>

          {/* Search + list card */}
          <div className="card" style={{ flex: 1 }}>
            <div className="card-header">
              <span className="card-title">
                <span className="card-title-icon">📋</span>
                All Grievances
              </span>
              <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
                {total} record{total !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Search bar */}
            <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)" }}>
              <div className="search-bar">
                <div className="search-input-wrap">
                  <span className="search-icon">🔍</span>
                  <input
                    className="form-control"
                    placeholder="Search by title..."
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
                <button
                  className="btn btn-accent"
                  onClick={handleSearch}
                  disabled={searching}
                  style={{ flexShrink: 0 }}
                >
                  {searching ? <span className="spinner" /> : "Search"}
                </button>
                {searchQ && (
                  <button className="btn btn-ghost" onClick={clearSearch} style={{ flexShrink: 0 }}>
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="card-body">
              {loading ? (
                <div style={{ textAlign: "center", padding: "48px 0" }}>
                  <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
                  <p style={{ marginTop: 16, color: "var(--text-muted)", fontSize: 13 }}>
                    Loading grievances...
                  </p>
                </div>
              ) : grievances.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <div className="empty-title">No grievances found</div>
                  <div className="empty-sub">
                    {searchQ ? "Try a different search term." : "Submit your first grievance using the button on the left."}
                  </div>
                </div>
              ) : (
                <div className="grievance-list">
                  {grievances.map((g, i) => (
                    <div
                      className="grievance-item"
                      key={g._id}
                      style={{ animationDelay: `${i * 0.04}s` }}
                    >
                      {/* Left content */}
                      <div>
                        <div className="grievance-meta">
                          <span className="badge badge-category">{g.category}</span>
                          <span className={`badge ${g.status === "Resolved" ? "badge-resolved" : "badge-pending"}`}>
                            {g.status}
                          </span>
                        </div>

                        <div className="grievance-title">{g.title}</div>
                        <div className="grievance-desc">{g.description}</div>

                        <div className="grievance-footer">
                          {g.student?.name && (
                            <span style={{ fontSize: 12, color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 4 }}>
                              👤 {g.student.name}
                            </span>
                          )}
                          {g.createdAt && (
                            <span className="grievance-time">
                              🕐 {timeAgo(g.createdAt)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right actions */}
                      <div className="grievance-actions">
                        <button
                          className="btn btn-accent"
                          style={{ fontSize: 12, padding: "6px 12px" }}
                          onClick={() => {
                            setEditTarget(g);
                            setModal("edit");
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ fontSize: 12, padding: "6px 12px" }}
                          onClick={() => setDeleteTarget(g)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ── MODALS ── */}
      {modal === "add" && (
        <GrievanceModal
          mode="add"
          initial={initForm}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}

      {modal === "edit" && editTarget && (
        <GrievanceModal
          mode="edit"
          initial={editTarget}
          onClose={() => { setModal(null); setEditTarget(null); }}
          onSaved={onSaved}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title={deleteTarget.title}
          loading={delLoading}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28, right: 28,
          background: "var(--bg-2)", border: "1px solid rgba(104,211,145,0.3)",
          color: "var(--success)", borderRadius: "var(--radius-sm)",
          padding: "13px 20px", fontSize: 13, fontWeight: 500,
          boxShadow: "var(--shadow-lg)",
          animation: "slideUp 0.3s ease",
          zIndex: 9999,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          ✅ {toast}
        </div>
      )}
    </div>
  );
}

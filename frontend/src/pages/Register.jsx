import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../App.css";

const API = "https://mse-2-fsd-9quc.onrender.com/api";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.name || !form.email || !form.password)
      return setError("Please fill in all fields.");
    if (form.password.length < 6)
      return setError("Password must be at least 6 characters.");

    setLoading(true);
    try {
      const res = await fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed.");
      setSuccess("Account created! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1600);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* ── LEFT PANEL ── */}
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-brand-icon">🎓</div>
          <div className="auth-brand-name">Grievance<span>Hub</span></div>
        </div>

        <h1 className="auth-headline">
          Your voice.<br />
          <em>Our priority.</em>
        </h1>
        <p className="auth-sub">
          A transparent platform for students to raise, track, and resolve
          campus grievances — fast and efficiently.
        </p>

        <div className="auth-features">
          {[
            "Submit grievances in seconds",
            "Track status in real-time",
            "Search & manage your complaints",
            "Secure & private by design",
          ].map((f) => (
            <div className="auth-feature-item" key={f}>
              <div className="auth-feature-dot" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="auth-right">
        <div className="auth-card">
          <p className="auth-card-title">Create account</p>
          <p className="auth-card-subtitle">
            Join your college grievance portal today.
          </p>

          {error && (
            <div className="alert alert-error">
              <span>⚠️</span> {error}
            </div>
          )}
          {success && (
            <div className="alert alert-success">
              <span>✅</span> {success}
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                className="form-control"
                name="name"
                placeholder="e.g. Rahul Sharma"
                value={form.name}
                onChange={handleChange}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">College Email</label>
              <input
                className="form-control"
                name="email"
                type="email"
                placeholder="you@college.edu"
                value={form.email}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-control"
                name="password"
                type="password"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={handleChange}
              />
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : "Create Account →"}
            </button>
          </form>

          <p className="auth-link-text">
            Already have an account?{" "}
            <Link to="/login">Sign in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

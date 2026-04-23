import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../App.css";

const API = "https://mse-2-fsd-9quc.onrender.com/api";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password)
      return setError("Please enter your email and password.");

    setLoading(true);
    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed.");
      localStorage.setItem("token", data.token);

      /* decode name from token payload (base64) */
      try {
        const payload = JSON.parse(atob(data.token.split(".")[1]));
        localStorage.setItem("userId", payload.id);
      } catch {}

      navigate("/dashboard");
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
          Welcome<br />
          <em>back.</em>
        </h1>
        <p className="auth-sub">
          Sign in to access your grievance dashboard, track pending issues,
          and communicate with the administration.
        </p>

        <div className="auth-features">
          {[
            "View all your submitted complaints",
            "Edit or delete grievances anytime",
            "Real-time status tracking",
            "Secure JWT authentication",
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
          <p className="auth-card-title">Sign in</p>
          <p className="auth-card-subtitle">
            Enter your credentials to continue.
          </p>

          {error && (
            <div className="alert alert-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className="form-control"
                name="email"
                type="email"
                placeholder="you@college.edu"
                value={form.email}
                onChange={handleChange}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-control"
                name="password"
                type="password"
                placeholder="Your password"
                value={form.password}
                onChange={handleChange}
              />
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : "Sign In →"}
            </button>
          </form>

          <p className="auth-link-text">
            Don't have an account?{" "}
            <Link to="/register">Create one here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

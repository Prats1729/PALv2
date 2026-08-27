import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import logo from "../assets/pal-logo.svg";
import "../styles/Auth.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login, continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  const handleGuest = () => {
    continueAsGuest();
    navigate("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <img src={logo} alt="PALv2" />
        </div>
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">
          {isTauri 
            ? "Desktop Edition • Sign in to sync your library & play locally"
            : "Sign in to your PALv2 account"}
        </p>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              placeholder="Enter your username"
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="Enter your password"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {!isTauri && (
          <div style={{ marginTop: "16px", textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "14px 0", color: "#666", fontSize: "12px" }}>
              <span style={{ flex: 1, height: "1px", backgroundColor: "rgba(255,255,255,0.1)" }}></span>
              <span>OR</span>
              <span style={{ flex: 1, height: "1px", backgroundColor: "rgba(255,255,255,0.1)" }}></span>
            </div>
            <button
              type="button"
              onClick={handleGuest}
              style={{
                width: "100%",
                padding: "10px",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#e2e8f0",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)"}
            >
              👤 Continue as Guest (Web)
            </button>
            <p style={{ color: "#777", fontSize: "11px", marginTop: "6px" }}>
              Stores watchlist locally in your browser without an account.
            </p>
          </div>
        )}

        <p className="auth-footer" style={{ marginTop: "18px" }}>
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}

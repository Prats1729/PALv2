import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import logo from "../assets/pal-logo.svg";
import "../styles/Auth.css";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStep, setForgotStep] = useState(1); // 1 = enter email, 2 = enter token & new password
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [modalMessage, setModalMessage] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const { user, login, forgotPassword, resetPassword, continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  // Navigate to home if user is logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user]);

  const handleGuest = () => {
    continueAsGuest();
    navigate("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(identifier, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);
    setModalMessage(null);
    setModalLoading(true);

    try {
      if (forgotStep === 1) {
        const res = await forgotPassword(forgotEmail);
        setModalMessage(res.message);
        if (res.devToken) {
          setResetToken(res.devToken);
        }
        setForgotStep(2);
      } else {
        const res = await resetPassword(resetToken, newPassword);
        setModalMessage(res.message);
        setTimeout(() => {
          setShowForgotModal(false);
          setForgotStep(1);
          setForgotEmail("");
          setResetToken("");
          setNewPassword("");
          setModalMessage(null);
        }, 2500);
      }
    } catch (err) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
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
            <label>Username or Email</label>
            <input 
              type="text" 
              placeholder="Enter your username or email"
              value={identifier} 
              onChange={(e) => setIdentifier(e.target.value)} 
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

          <div className="forgot-password-wrap">
            <button
              type="button"
              onClick={() => {
                setShowForgotModal(true);
                setForgotStep(1);
                setModalError(null);
                setModalMessage(null);
              }}
              className="forgot-password-link"
            >
              Forgot password?
            </button>
          </div>

          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {!isTauri && (
          <div style={{ marginTop: "16px", textAlign: "center" }}>
            <div className="auth-divider">OR</div>
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
          </div>
        )}

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="auth-modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div className="auth-modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="auth-modal-close"
              onClick={() => setShowForgotModal(false)}
            >
              ✕
            </button>

            <h3 style={{ color: "#fff", margin: "0 0 8px 0", fontSize: "1.3rem" }}>
              {forgotStep === 1 ? "Reset Password" : "Enter New Password"}
            </h3>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.85rem", marginBottom: "20px" }}>
              {forgotStep === 1 
                ? "Enter your registered email address to receive reset instructions."
                : "Enter your verification token and your new password."}
            </p>

            {modalError && <div className="auth-error">{modalError}</div>}
            {modalMessage && <div className="auth-success">{modalMessage}</div>}

            <form onSubmit={handleForgotSubmit}>
              {forgotStep === 1 ? (
                <div className="form-group">
                  <label>Registered Email</label>
                  <input 
                    type="email" 
                    placeholder="name@example.com"
                    value={forgotEmail} 
                    onChange={(e) => setForgotEmail(e.target.value)} 
                    required 
                  />
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label>Reset Token</label>
                    <input 
                      type="text" 
                      placeholder="Paste your reset token"
                      value={resetToken} 
                      onChange={(e) => setResetToken(e.target.value)} 
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label>New Password</label>
                    <input 
                      type="password" 
                      placeholder="At least 6 characters"
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      required 
                    />
                  </div>
                </>
              )}

              <button type="submit" disabled={modalLoading} className="auth-btn">
                {modalLoading 
                  ? "Processing..." 
                  : forgotStep === 1 
                    ? "Generate Reset Code" 
                    : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

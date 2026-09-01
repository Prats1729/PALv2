import { useState } from "react";
import { downloadAndApplyUpdate } from "../../utils/updater";

export default function UpdateModal({ update, onClose }) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);

  if (!update) return null;

  const handleUpdate = async () => {
    setDownloading(true);
    setError(null);
    try {
      await downloadAndApplyUpdate(update, (prog) => {
        setProgress(prog);
      });
    } catch (err) {
      setError(err?.message || "Failed to download update");
      setDownloading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.82)",
        backdropFilter: "blur(6px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={() => {
        if (!downloading) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: "#13101c",
          border: "1px solid rgba(99, 102, 241, 0.35)",
          borderRadius: "14px",
          maxWidth: "480px",
          width: "100%",
          padding: "24px",
          color: "#fff",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              backgroundColor: "rgba(99, 102, 241, 0.15)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#818cf8",
            }}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700", color: "#f8fafc" }}>
              Update Available
            </h3>
            <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
              PAL {update.version} is now available!
            </span>
          </div>
        </div>

        {update.body && (
          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "8px",
              padding: "12px 14px",
              marginBottom: "18px",
              maxHeight: "150px",
              overflowY: "auto",
              fontSize: "0.85rem",
              color: "#cbd5e1",
              lineHeight: "1.5",
              whiteSpace: "pre-wrap",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "4px", color: "#a5b4fc" }}>Release Notes:</div>
            {update.body}
          </div>
        )}

        {downloading && (
          <div style={{ marginBottom: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "6px" }}>
              <span>
                {progress?.finished
                  ? update.platform === "android"
                    ? "Opening installer..."
                    : "Finalizing installation..."
                  : "Downloading update..."}
              </span>
              <span>{progress?.percent ? `${progress.percent}%` : "0%"}</span>
            </div>
            <div
              style={{
                width: "100%",
                height: "8px",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress?.percent || 0}%`,
                  backgroundColor: "#6366f1",
                  transition: "width 0.2s ease",
                }}
              />
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "6px",
              padding: "10px",
              color: "#fca5a5",
              fontSize: "0.85rem",
              marginBottom: "16px",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          {!downloading && (
            <button
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#cbd5e1",
                padding: "9px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "500",
                fontSize: "0.9rem",
              }}
            >
              Later
            </button>
          )}
          <button
            type="button"
            onClick={handleUpdate}
            disabled={downloading}
            style={{
              backgroundColor: downloading ? "#4f46e5" : "#6366f1",
              border: "none",
              color: "#fff",
              padding: "9px 20px",
              borderRadius: "6px",
              cursor: downloading ? "wait" : "pointer",
              fontWeight: "600",
              fontSize: "0.9rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {downloading
              ? progress?.finished
                ? update.platform === "android"
                  ? "Opening installer..."
                  : "Restarting..."
                : "Downloading..."
              : update.platform === "android"
              ? "Download & Install"
              : "Update & Restart"}
          </button>
        </div>
      </div>
    </div>
  );
}

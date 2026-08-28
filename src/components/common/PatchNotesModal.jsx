import React from "react";

export default function PatchNotesModal({ patchNotes, onClose }) {
  if (!patchNotes) return null;

  const handleDismiss = () => {
    if (patchNotes.version) {
      localStorage.setItem("pal_last_seen_version", patchNotes.version);
    }
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(8px)",
        zIndex: 99998,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        animation: "fadeIn 0.25s ease-out",
      }}
      onClick={handleDismiss}
    >
      <div
        style={{
          backgroundColor: "#13101d",
          border: "1px solid rgba(139, 92, 246, 0.4)",
          borderRadius: "16px",
          maxWidth: "520px",
          width: "100%",
          padding: "28px",
          color: "#fff",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(124, 58, 237, 0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(168, 85, 247, 0.25))",
                border: "1px solid rgba(168, 85, 247, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
              }}
            >
              🚀
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 style={{ margin: 0, fontSize: "1.3rem", fontWeight: "700", color: "#f8fafc" }}>
                  What's New in PALv2
                </h3>
                <span
                  style={{
                    backgroundColor: "rgba(99, 102, 241, 0.2)",
                    border: "1px solid rgba(99, 102, 241, 0.4)",
                    color: "#a5b4fc",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    padding: "2px 8px",
                    borderRadius: "20px",
                  }}
                >
                  v{patchNotes.version}
                </span>
              </div>
              <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                You are successfully running the latest update!
              </span>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            style={{
              background: "transparent",
              border: "none",
              color: "#64748b",
              fontSize: "18px",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "6px",
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#fff"}
            onMouseLeave={(e) => e.currentTarget.style.color = "#64748b"}
          >
            ✕
          </button>
        </div>

        {/* Patch Notes Content */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.07)",
            borderRadius: "10px",
            padding: "16px",
            marginBottom: "24px",
            maxHeight: "220px",
            overflowY: "auto",
            fontSize: "0.9rem",
            color: "#cbd5e1",
            lineHeight: "1.6",
            whiteSpace: "pre-wrap",
          }}
        >
          <div style={{ fontWeight: "600", color: "#c084fc", marginBottom: "8px", fontSize: "0.95rem" }}>
            Release Notes & Changes:
          </div>
          {patchNotes.body || "Performance enhancements, bug fixes, and continuous improvements."}
        </div>

        {/* Action Button */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              border: "none",
              color: "#fff",
              padding: "10px 24px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "0.95rem",
              boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(99, 102, 241, 0.45)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(99, 102, 241, 0.3)";
            }}
          >
            Awesome, Let's Watch!
          </button>
        </div>
      </div>
    </div>
  );
}

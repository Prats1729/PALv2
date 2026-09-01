import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../context/AuthContext";
import "../../styles/AvatarPickerModal.css";

const PRESET_AVATARS = [
  { id: "dicebear-1", name: "Cyber", url: "https://api.dicebear.com/7.x/bottts/svg?seed=pal_cyber&backgroundColor=6366f1" },
  { id: "dicebear-2", name: "Samurai", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=pal_samurai&backgroundColor=4f46e5" },
  { id: "dicebear-3", name: "Ninja", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=pal_ninja&backgroundColor=0ea5e9" },
  { id: "dicebear-4", name: "Valkyrie", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=pal_valkyrie&backgroundColor=ec4899" },
  { id: "dicebear-5", name: "Sensei", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=pal_sensei&backgroundColor=10b981" },
  { id: "dicebear-6", name: "Mage", url: "https://api.dicebear.com/7.x/bottts/svg?seed=pal_mage&backgroundColor=8b5cf6" },
  { id: "dicebear-7", name: "Shinobi", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=pal_shinobi&backgroundColor=f59e0b" },
  { id: "dicebear-8", name: "Mecha", url: "https://api.dicebear.com/7.x/bottts/svg?seed=pal_mecha&backgroundColor=06b6d4" },
];

export default function AvatarPickerModal({ isOpen, onClose }) {
  const { user, updateAvatar } = useAuth();
  const fileInputRef = useRef(null);

  const defaultDicebear = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || "User"}&backgroundColor=6366f1`;
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || defaultDicebear);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.");
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress & resize image to 256x256 via canvas for optimal DB storage & speed
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setSelectedAvatar(compressedDataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      // If selectedAvatar is the default dicebear, save as null (uses default generator)
      const avatarToSave = selectedAvatar === defaultDicebear ? null : selectedAvatar;
      await updateAvatar(avatarToSave);
      window.dispatchEvent(
        new CustomEvent("pal-toast", {
          detail: { message: "Profile avatar updated successfully!", type: "success" },
        })
      );
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update avatar");
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="avatar-modal-overlay" onClick={onClose}>
      <div className="avatar-modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="avatar-modal-close" onClick={onClose} disabled={isSaving}>
          ✕
        </button>

        <h3 className="avatar-modal-title">Choose Profile Avatar</h3>
        <p className="avatar-modal-subtitle">
          Select a preset avatar or upload your own custom picture.
        </p>

        {error && <div className="avatar-modal-error">{error}</div>}

        {/* Current Avatar Preview */}
        <div className="avatar-current-preview-wrapper">
          <img src={selectedAvatar} alt="Avatar Preview" className="avatar-current-img" />
          <div className="avatar-upload-actions">
            <button
              type="button"
              className="avatar-upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Custom Image
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png, image/jpeg, image/webp"
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />
            <button
              type="button"
              className="avatar-reset-btn"
              onClick={() => setSelectedAvatar(defaultDicebear)}
              title="Reset to default generated avatar"
            >
              Reset Default
            </button>
          </div>
        </div>

        {/* Preset Avatars Grid */}
        <div className="avatar-presets-section">
          <div className="avatar-presets-title">Presets & Avatars</div>
          <div className="avatar-presets-grid">
            <div
              className={`avatar-preset-item ${selectedAvatar === defaultDicebear ? "active" : ""}`}
              onClick={() => setSelectedAvatar(defaultDicebear)}
            >
              <img src={defaultDicebear} alt="Default Avatar" />
              <span>Personal</span>
            </div>
            {PRESET_AVATARS.map((preset) => (
              <div
                key={preset.id}
                className={`avatar-preset-item ${selectedAvatar === preset.url ? "active" : ""}`}
                onClick={() => setSelectedAvatar(preset.url)}
              >
                <img src={preset.url} alt={preset.name} />
                <span>{preset.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="avatar-modal-actions">
          <button type="button" className="avatar-modal-cancel" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button
            type="button"
            className="avatar-modal-save"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Avatar"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

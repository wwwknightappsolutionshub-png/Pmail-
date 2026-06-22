import { useRef, useState } from "react";
import { api, ApiError } from "../../api/client";

type Props = {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  onError?: (message: string) => void;
};

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read file"));
        return;
      }
      const base64 = result.includes(",") ? (result.split(",")[1] ?? "") : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export function AdminImageUpload({ label, hint, value, onChange, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onError?.("Please choose an image file (JPEG, PNG, WebP, GIF, or SVG).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      onError?.("Image must be 5 MB or smaller.");
      return;
    }

    setUploading(true);
    try {
      const dataBase64 = await readFileAsBase64(file);
      const res = await api.uploadMarketingAsset({
        fileName: file.name,
        mimeType: file.type,
        dataBase64,
      });
      onChange(res.asset.url);
    } catch (err) {
      onError?.(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="admin-image-upload">
      <span className="admin-image-upload-label">{label}</span>
      {hint ? <p className="muted admin-field-hint">{hint}</p> : null}

      {value ? (
        <div className="admin-image-upload-preview">
          <img src={value} alt="" />
        </div>
      ) : (
        <div className="admin-image-upload-placeholder muted">No image uploaded yet</div>
      )}

      <div className="admin-image-upload-actions">
        <label className="btn btn-secondary btn-sm admin-image-upload-btn">
          {uploading ? "Uploading…" : value ? "Replace image" : "Upload from device"}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            disabled={uploading}
            hidden
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {value ? (
          <button type="button" className="btn btn-ghost btn-sm" disabled={uploading} onClick={() => onChange("")}>
            Remove
          </button>
        ) : null}
      </div>

      <label className="admin-image-upload-url">
        Or paste image URL
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://… or /api/public/marketing/assets/…" />
      </label>
    </div>
  );
}

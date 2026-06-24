"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface Props {
  currentLogoUrl?: string | null;
}

export function LogoUpload({ currentLogoUrl }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentLogoUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    const fd = new FormData();
    fd.append("logo", file);
    const res = await fetch("/api/operator/settings/logo", { method: "POST", body: fd });
    setUploading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Upload failed");
      setPreview(currentLogoUrl ?? null);
      return;
    }
    const { logoUrl } = await res.json();
    if (logoUrl) setPreview(logoUrl);
    router.refresh();
  }

  async function handleRemove() {
    setRemoving(true);
    setError(null);
    await fetch("/api/operator/settings/logo", { method: "DELETE" });
    setRemoving(false);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  const inputStyle: React.CSSProperties = {
    display: "none",
  };
  const btnStyle: React.CSSProperties = {
    background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 4,
    color: "var(--text-dim)", fontSize: 12, padding: "7px 14px", cursor: "pointer",
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Preview box */}
        <div style={{
          width: 120, height: 44, borderRadius: 6, border: "1px solid var(--border)",
          background: "var(--surface-raised)", display: "flex", alignItems: "center",
          justifyContent: "center", overflow: "hidden", flexShrink: 0,
        }}>
          {preview ? (
            <img src={preview} alt="Logo" style={{ maxHeight: 30, maxWidth: 108, objectFit: "contain" }} />
          ) : (
            <span style={{ fontSize: 11, color: "var(--text-faint)" }}>No logo</span>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} style={btnStyle}>
            {uploading ? "Uploading…" : preview ? "Replace" : "Upload Logo"}
          </button>
          {preview && (
            <button type="button" onClick={handleRemove} disabled={removing} style={{ ...btnStyle, color: "#D9534F", borderColor: "rgba(217,83,79,0.3)" }}>
              {removing ? "Removing…" : "Remove"}
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleFile} style={inputStyle} />
      </div>

      <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 8 }}>
        PNG, JPG, WEBP, or SVG · Max 2 MB · Resized to 30pt height
      </p>

      {error && (
        <p style={{ fontSize: 12, color: "#D9534F", marginTop: 6 }}>{error}</p>
      )}
    </div>
  );
}

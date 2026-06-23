export default function SuspendedPage() {
  return (
    <div style={{
      background: "var(--bg)",
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: 16,
    }}>
      <span className="brand-mark" style={{ fontSize: 28 }}>LyPX</span>
      <div style={{ textAlign: "center", maxWidth: 360 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", margin: "0 0 8px" }}>
          Account Suspended
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-dim)", lineHeight: 1.6, margin: 0 }}>
          Your operator account has been suspended. Please contact LyPX support to resolve this.
        </p>
      </div>
      <a
        href="mailto:support@lypx.sg"
        style={{
          marginTop: 8,
          fontSize: 13,
          color: "var(--gold)",
          border: "1px solid var(--gold)44",
          padding: "8px 20px",
          borderRadius: 6,
          textDecoration: "none",
        }}
      >
        Contact Support
      </a>
    </div>
  );
}

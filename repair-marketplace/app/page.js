export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "24px",
        background: "#0f172a",
        color: "#f8fafc",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "12px" }}>
        Repair Marketplace
      </h1>
      <p style={{ fontSize: "1.1rem", color: "#94a3b8", maxWidth: "480px" }}>
        This is your site&apos;s first live version. Every future feature —
        agent profiles, trade applications, repair requests, and bidding —
        will be built on top of this.
      </p>
      <p style={{ marginTop: "24px", fontSize: "0.9rem", color: "#64748b" }}>
        Status: it&apos;s working 🎉
      </p>
    </main>
  );
}

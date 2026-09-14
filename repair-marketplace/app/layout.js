export const metadata = {
  title: "Repair Marketplace",
  description: "Connecting real estate agents with vetted trades for post-inspection repairs.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}

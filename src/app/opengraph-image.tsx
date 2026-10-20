import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Branded Open Graph card — shown when the site is shared on WhatsApp,
 * Facebook, LinkedIn, X, etc. Generated at build time, no external assets.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "84px 96px",
          background:
            "linear-gradient(135deg, #f3e8ff 0%, #ffffff 55%, #ede9fe 100%)",
          color: "#1e1b2e",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              background: "#7c3aed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: 50,
              fontWeight: 700,
            }}
          >
            U
          </div>
          <div style={{ fontSize: 66, fontWeight: 700, letterSpacing: -2 }}>
            Unimate
          </div>
        </div>
        <div
          style={{
            marginTop: 44,
            fontSize: 56,
            fontWeight: 600,
            lineHeight: 1.15,
            maxWidth: 940,
          }}
        >
          The campus marketplace, done properly.
        </div>
        <div style={{ marginTop: 26, fontSize: 30, color: "#57536e" }}>
          East Delta University · Buy &amp; sell in BDT · Real-time chat ·
          Sandbox checkout
        </div>
      </div>
    ),
    size,
  );
}

import { ImageResponse } from "next/og";
import { COMPANY, ZONES } from "../company.config";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${COMPANY.name} 픽셀 오피스`;

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
          alignItems: "center",
          background: "linear-gradient(135deg, #eaf7ff 0%, #d7f3e6 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            padding: "26px 48px",
            background: "#ffffff",
            border: "6px solid #1c3a3a",
            borderRadius: 24,
            boxShadow: "10px 10px 0 rgba(31,147,207,0.25)",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 108,
              height: 108,
              alignItems: "center",
              justifyContent: "center",
              fontSize: 68,
              background: "linear-gradient(135deg, #4fb8e8, #4ecb8f)",
              border: "5px solid #1c3a3a",
              borderRadius: 20,
            }}
          >
            {COMPANY.logoLetter}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 58, fontWeight: 900, color: "#1c3a3a" }}>{COMPANY.name}</div>
            <div style={{ fontSize: 26, color: "#4f6d6b", marginTop: 8 }}>{COMPANY.description}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 44 }}>
          {ZONES.map((zone) => (
            <div
              key={zone.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                padding: "16px 20px",
                background: "#ffffff",
                border: "3px solid #1c3a3a",
                borderRadius: 14,
              }}
            >
              <div style={{ display: "flex", fontSize: 36 }}>{zone.icon}</div>
              <div style={{ display: "flex", fontSize: 16, fontWeight: 700, color: "#1c3a3a" }}>{zone.name}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}

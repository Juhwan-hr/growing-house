import { ImageResponse } from "next/og";
import { COMPANY } from "../../company.config";

const size = { width: 512, height: 512 };

/** PWA 매니페스트용 아이콘 (512x512) — app/icon.tsx(파비콘)와 별개 경로입니다 */
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 300,
          background: "linear-gradient(135deg, #4fb8e8, #4ecb8f)",
          borderRadius: 106,
        }}
      >
        {COMPANY.logoLetter}
      </div>
    ),
    { ...size },
  );
}

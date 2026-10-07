import { ImageResponse } from "next/og";
import { COMPANY } from "../../company.config";

const size = { width: 192, height: 192 };

/** PWA 매니페스트용 아이콘 (192x192) — app/icon.tsx(파비콘)와 별개 경로입니다 */
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
          fontSize: 112,
          background: "linear-gradient(135deg, #4fb8e8, #4ecb8f)",
          borderRadius: 40,
        }}
      >
        {COMPANY.logoLetter}
      </div>
    ),
    { ...size },
  );
}

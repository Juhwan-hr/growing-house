import { ImageResponse } from "next/og";
import { COMPANY } from "../company.config";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          background: "linear-gradient(135deg, #4fb8e8, #4ecb8f)",
          borderRadius: 7,
        }}
      >
        {COMPANY.logoLetter}
      </div>
    ),
    { ...size },
  );
}

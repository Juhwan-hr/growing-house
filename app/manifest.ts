import type { MetadataRoute } from "next";
import { COMPANY } from "../company.config";

/** 홈 화면에 앱처럼 설치할 수 있게 해주는 PWA 매니페스트 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: COMPANY.pageTitle,
    short_name: COMPANY.name,
    description: COMPANY.description,
    start_url: "/",
    display: "standalone",
    background_color: "#eaf7ff",
    theme_color: "#4ecb8f",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/icon-512", sizes: "512x512", type: "image/png" },
    ],
  };
}

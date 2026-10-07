import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./office.css";
import PwaRegister from "./components/PwaRegister";
import { COMPANY } from "../company.config";

export const metadata: Metadata = {
  // 링크 미리보기(썸네일) 주소의 기준 — Vercel에 올리면 운영 주소를 저절로 씁니다
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  ),
  title: COMPANY.pageTitle,
  description: COMPANY.description,
  openGraph: {
    title: COMPANY.name,
    description: COMPANY.description,
  },
  twitter: {
    card: "summary_large_image",
    title: COMPANY.name,
    description: COMPANY.description,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: COMPANY.name,
  },
};

export const viewport: Viewport = {
  themeColor: "#4ecb8f",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}

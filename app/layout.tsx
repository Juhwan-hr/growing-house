import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./office.css";
import PwaRegister from "./components/PwaRegister";
import { COMPANY } from "../company.config";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
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

/** 저장된 모드를 CSS가 그리기 전에 반영해서 전환 시 깜빡임을 막습니다.
 * 라이트/다크(시스템 설정 따라가기)를 없애고 3가지 모드 중 하나를 명시적으로
 * 고르는 방식으로 바뀌어서, 저장된 값이 없으면 그냥 기본값(soda)에 맡깁니다 —
 * CSS의 :root, :root[data-mode="soda"] 기본값이 이미 soda라 별도 처리가
 * 필요 없습니다. */
const MODE_INIT_SCRIPT = `
try {
  var m = localStorage.getItem("officeMode");
  if (m === "soda" || m === "candy" || m === "night") document.documentElement.setAttribute("data-mode", m);
} catch (e) {}
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <script dangerouslySetInnerHTML={{ __html: MODE_INIT_SCRIPT }} />
      </head>
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}

"use client";

import { useEffect } from "react";

/** 홈 화면 설치(PWA)를 위한 최소 서비스워커 등록 — 오프라인 캐싱은 하지 않습니다 */
export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}

"use client";

import { useEffect, useState } from "react";

/** 한국 시간 기준 오늘 날짜 + 현재 시각을 1초마다 갱신해서 보여줍니다 */
function formatNow(): string {
  const now = new Date();
  const datePart = now.toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  const timePart = now.toLocaleTimeString("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${datePart} ${timePart}`;
}

export default function LiveClock() {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setText(formatNow());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!text) return null;
  return <span className="clock-chip">🕒 {text}</span>;
}

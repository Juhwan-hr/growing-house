"use client";

// 12월엔 사무실 화면 위로 눈이 내립니다 (한국 시간 기준). 카메라 이동/줌과 무관하게
// 화면 자체에 내리는 것처럼 보이도록 world-viewport의 형제 요소로 얹습니다.
import { useEffect, useState } from "react";

function getKoreaMonth(): number {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", month: "numeric" })
    .formatToParts(new Date())
    .find((p) => p.type === "month");
  return part ? Number(part.value) : new Date().getMonth() + 1;
}

const SNOWFLAKES = Array.from({ length: 22 }, (_, i) => i);

export default function SeasonalTheme() {
  const [month, setMonth] = useState<number | null>(null);

  useEffect(() => {
    setMonth(getKoreaMonth());
    const timer = window.setInterval(() => setMonth(getKoreaMonth()), 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (month !== 12) return null;

  return (
    <div className="seasonal-snow" aria-hidden="true">
      {SNOWFLAKES.map((i) => (
        <span
          key={i}
          className="snowflake"
          style={{
            left: `${(i * 43) % 100}%`,
            animationDuration: `${6 + (i % 5)}s`,
            animationDelay: `${(i % 7) * -1.3}s`,
            fontSize: `${10 + (i % 3) * 4}px`,
          }}
        >
          ❄
        </span>
      ))}
    </div>
  );
}

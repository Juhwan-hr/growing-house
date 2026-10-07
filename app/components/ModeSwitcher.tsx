"use client";

import { useEffect, useState } from "react";

export type OfficeVisualMode = "soda" | "candy" | "night";

const MODES: { value: OfficeVisualMode; label: string }[] = [
  { value: "soda", label: "🫧 소다버블" },
  { value: "candy", label: "🍭 캔디팝" },
  { value: "night", label: "✨ 네온나이트" },
];

/**
 * 라이트/다크 토글을 없애고 이걸로 대체했습니다 — 시스템 설정을 따르는 개념 자체가
 * 없어져서(3가지 다 "명시적으로 고르는" 모드), layout.tsx의 초기화 스크립트가 저장된
 * 값이 없으면 그냥 기본값(soda)으로 둡니다. localStorage 키도 "theme"에서
 * "officeMode"로 바뀌었습니다.
 */
export default function ModeSwitcher() {
  const [mode, setMode] = useState<OfficeVisualMode | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("officeMode");
    setMode(stored === "soda" || stored === "candy" || stored === "night" ? stored : "soda");
  }, []);

  const select = (next: OfficeVisualMode) => {
    setMode(next);
    localStorage.setItem("officeMode", next);
    document.documentElement.setAttribute("data-mode", next);
  };

  if (!mode) return null;

  return (
    <div className="mode-switch">
      <div className="mode-switch-inner" role="group" aria-label="화면 모드 선택">
        {MODES.map((m) => (
          <button key={m.value} type="button" className={mode === m.value ? "active" : ""} onClick={() => select(m.value)}>
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}

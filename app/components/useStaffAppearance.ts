"use client";

import { useCallback, useEffect, useState } from "react";
import type { LpcConfig } from "../game/LpcSprite";

/** 식구 모습(🎨 모습 바꾸기) — company.config.ts의 lpc가 기본값, 여기 저장한 게 우선. 이 브라우저에 저장합니다. */
const STORE_KEY = "house_appearance";

export function useStaffAppearance() {
  const [overrides, setOverrides] = useState<Record<string, LpcConfig>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) setOverrides(JSON.parse(raw));
    } catch {
      /* 기본 모습 그대로 */
    }
    setLoaded(true);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const saveAppearance = useCallback(async (name: string, lpc: LpcConfig, _password?: string) => {
    setOverrides((prev) => {
      const next = { ...prev, [name]: lpc };
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(next));
      } catch {
        /* 지금 화면에는 반영 */
      }
      return next;
    });
  }, []);

  return { overrides, loaded, needsPassword: false, saveAppearance, isPasswordError: () => false };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchShared, putShared } from "./houseState";

// "오늘 집에서 있었던 일" — 오른쪽 패널에 그날 실제로 일어난 일을 시간순으로 쌓습니다.
// 할 일(일감이·짬짬이)은 page.tsx가 등록·완료 시각에서 바로 만들고, 그 밖의 일(알림·출퇴근·
// 모습 바꾸기 등)은 여기서 쌓습니다. 날짜별로 "house_log:YYYY-MM-DD"에 저장(/history에서 다시 봄).
const LOG_KEY = "office_house_log";
const MAX_ITEMS = 80;

export type HouseLogEntry = { t: number; icon: string; text: string; shared?: boolean };

export function kstDate(ms = Date.now()): string {
  return new Date(ms).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

function readLocal(): HouseLogEntry[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const saved = JSON.parse(raw) as { date?: string; items?: HouseLogEntry[] };
    return saved.date === kstDate() && Array.isArray(saved.items) ? saved.items : [];
  } catch {
    return [];
  }
}
function writeLocal(items: HouseLogEntry[]) {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify({ date: kstDate(), items }));
  } catch {
    /* 기억은 못 해도 지금 화면엔 보임 */
  }
}

export function useHouseLog() {
  const [items, setItems] = useState<HouseLogEntry[]>([]);
  const sharedRef = useRef(false);
  const itemsRef = useRef<HouseLogEntry[]>([]);
  itemsRef.current = items;

  const refresh = useCallback(async () => {
    const key = `house_log:${kstDate()}`;
    const res = await fetchShared<HouseLogEntry[]>(key);
    sharedRef.current = res.ok;
    if (!res.ok) {
      setItems(readLocal());
      return;
    }
    if (Array.isArray(res.value)) {
      setItems(res.value);
      writeLocal(res.value);
    } else {
      // 오늘 처음 — 이 기기에만 있던 오늘 기록을 올려둠(비밀번호가 기억돼 있을 때만)
      const local = readLocal();
      setItems(local);
      if (local.length) putShared(key, { value: local }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    setItems(readLocal());
    refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    const t = window.setInterval(refresh, 60 * 1000); // 다른 기기에서 생긴 일 + 자정 넘김
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(t);
    };
  }, [refresh]);

  const addLog = useCallback((icon: string, text: string) => {
    const entry: HouseLogEntry = { t: Date.now(), icon, text };
    const prev = itemsRef.current;
    // 자정을 넘겨 열어둔 탭이면 어제 기록에 이어 붙이지 않게
    const base = prev.length && kstDate(prev[prev.length - 1].t) !== kstDate() ? [] : prev;
    const next = [...base, entry].slice(-MAX_ITEMS);
    itemsRef.current = next;
    setItems(next);
    writeLocal(next);
    if (sharedRef.current) {
      putShared(`house_log:${kstDate()}`, { append: entry })
        .then((v) => {
          if (Array.isArray(v)) {
            itemsRef.current = v as HouseLogEntry[];
            setItems(v as HouseLogEntry[]);
          }
        })
        .catch(() => {}); // 비밀번호가 없으면 이 기기에만 남음
    }
  }, []);

  return { items, addLog };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchShared, putShared, SharedPasswordError } from "./houseState";
import { readStoredPassword } from "./useTodos";

export type Reminder = { id: string; time: string; text: string };

// 박일해 알림 — 2026-10-07부터 공용 저장소("reminders")에 둬서 어느 기기에서나 같은 목록이 보입니다.
// 이 기기 localStorage는 열자마자 보여주는 캐시이자, 공용 저장소가 아직 없을 때의 저장소입니다.
const STORAGE_KEY = "office_reminders";
/** 이 기기에서 이미 울렸거나 지운 알림 id — 서버 반영이 늦어도 같은 알림이 다시 나타나지 않게 */
const FIRED_KEY = "office_reminders_fired";
const SHARED_KEY = "reminders";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* noop */
  }
}

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  /** 공용 저장소를 쓰고 있는지(false면 예전처럼 이 기기에만 저장) */
  const [shared, setShared] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const listRef = useRef<Reminder[]>([]);
  listRef.current = reminders;
  const sharedRef = useRef(false);

  const refresh = useCallback(async () => {
    const res = await fetchShared<Reminder[]>(SHARED_KEY);
    sharedRef.current = res.ok;
    setShared(res.ok);
    if (!res.ok) return;
    if (Array.isArray(res.value)) {
      const fired = new Set(load<string[]>(FIRED_KEY, []));
      const next = res.value.filter((r) => !fired.has(r.id));
      setReminders(next);
      save(STORAGE_KEY, next);
    } else if (listRef.current.length) {
      // 공용 저장소를 처음 쓰는 날 — 이 기기에 있던 알림을 올려둠(비밀번호가 기억돼 있을 때만)
      putShared(SHARED_KEY, { value: listRef.current }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const local = load<Reminder[]>(STORAGE_KEY, []);
    listRef.current = local;
    setReminders(local);
    setNeedsPassword(readStoredPassword().length === 0);
    refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    const t = window.setInterval(refresh, 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(t);
    };
  }, [refresh]);

  /** 추가 — 공용 저장소를 쓰면 저장이 실패할 때(비밀번호 등) 되돌리고 오류를 던집니다 */
  const addReminder = useCallback(async (time: string, text: string, password?: string) => {
    const prev = listRef.current;
    const next = [...prev, { id: crypto.randomUUID(), time, text }];
    listRef.current = next;
    setReminders(next);
    save(STORAGE_KEY, next);
    if (!sharedRef.current) return;
    try {
      await putShared(SHARED_KEY, { value: next }, password);
      setNeedsPassword(false);
    } catch (err) {
      listRef.current = prev;
      setReminders(prev);
      save(STORAGE_KEY, prev);
      if (err instanceof SharedPasswordError) setNeedsPassword(true);
      throw err;
    }
  }, []);

  /** 지우기(직접 지우거나 시각이 돼서 울린 뒤) — 서버 반영이 안 돼도 이 기기에선 다시 안 나타남 */
  const removeReminders = useCallback((ids: string[]) => {
    save(FIRED_KEY, [...load<string[]>(FIRED_KEY, []), ...ids].slice(-200));
    const next = listRef.current.filter((r) => !ids.includes(r.id));
    listRef.current = next;
    setReminders(next);
    save(STORAGE_KEY, next);
    if (sharedRef.current) putShared(SHARED_KEY, { value: next }).catch(() => {});
  }, []);

  return { reminders, addReminder, removeReminders, shared, needsPassword };
}

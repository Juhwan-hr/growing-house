"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type TodoCategory = "업무" | "개인";
export type Todo = {
  id: string;
  text: string;
  done: boolean;
  category: TodoCategory;
  created_at?: string;
  completed_at?: string | null;
};

/** 할 일 전체(끝낸 일 포함) — 이 브라우저(localStorage)에 저장합니다 */
const STORE_KEY = "house_todos";

/** 데모 사이트(NEXT_PUBLIC_DEMO=1)에서 처음 온 사람에게 보여줄 예시 할 일 */
function demoTodos(): Todo[] {
  const now = new Date().toISOString();
  const t = (text: string, category: TodoCategory, done = false): Todo => ({ id: crypto.randomUUID(), text, category, done, created_at: now, completed_at: done ? now : null });
  return [t("회의 자료 정리", "업무"), t("주간 보고 보내기", "업무"), t("장보기", "개인"), t("물 2리터 마시기", "개인", true)];
}

function readAll(): Todo[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as Todo[];
    if (process.env.NEXT_PUBLIC_DEMO === "1") {
      const seed = demoTodos();
      writeAll(seed);
      return seed;
    }
    return [];
  } catch {
    return [];
  }
}
function writeAll(list: Todo[]) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
  } catch {
    /* 사생활 보호 모드 등 — 지금 화면에는 반영 */
  }
}
const kstDay = (v: string | number) => new Date(v).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

/** 이 브라우저에 저장한 할 일 전부(기록 페이지용) */
export function readAllTodos(): Todo[] {
  return readAll();
}

/**
 * 일감이(업무)·짬짬이(개인) 할 일 목록. 끝내도 지우지 않고 completed_at을 남깁니다 —
 * 화면에는 안 끝난 일 + 오늘 끝낸 일만 보여주고, 그 전에 끝낸 일은 /history에서 봅니다.
 */
export function useTodos() {
  const [all, setAll] = useState<Todo[]>([]);
  const allRef = useRef<Todo[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const list = readAll();
    allRef.current = list;
    setAll(list);
    setLoaded(true);
  }, []);

  const commit = useCallback((next: Todo[]) => {
    allRef.current = next;
    setAll(next);
    writeAll(next);
  }, []);

  const today = kstDay(Date.now());
  const visible = (t: Todo) => !t.done || (t.completed_at ? kstDay(t.completed_at) === today : false);
  const todos = all.filter(visible);
  const hidden = all.filter((t) => !visible(t));
  const hiddenCompletedByCategory: Record<TodoCategory, number> = {
    업무: hidden.filter((t) => t.category === "업무").length,
    개인: hidden.filter((t) => t.category === "개인").length,
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const addTodo = useCallback(async (text: string, category: TodoCategory, _password?: string) => {
    const t = text.trim();
    if (!t) throw new Error("할 일을 적어 주세요.");
    commit([...allRef.current, { id: crypto.randomUUID(), text: t, done: false, category, created_at: new Date().toISOString(), completed_at: null }]);
  }, [commit]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const toggleTodo = useCallback(async (id: string, _password?: string) => {
    commit(allRef.current.map((t) => (t.id === id ? { ...t, done: !t.done, completed_at: t.done ? null : new Date().toISOString() } : t)));
  }, [commit]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const editTodo = useCallback(async (id: string, text: string, _password?: string) => {
    commit(allRef.current.map((t) => (t.id === id ? { ...t, text: text.trim() } : t)));
  }, [commit]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const removeTodo = useCallback(async (id: string, _password?: string) => {
    commit(allRef.current.filter((t) => t.id !== id));
  }, [commit]);

  return {
    todos,
    loaded,
    listError: false,
    needsPassword: false,
    hiddenCompletedCount: hidden.length,
    hiddenCompletedByCategory,
    doneLinkUrl: null as string | null,
    addTodo,
    toggleTodo,
    editTodo,
    removeTodo,
    isPasswordError: () => false,
  };
}

/** 예전 코드와의 호환용 — 이 템플릿은 비밀번호가 없습니다 */
export function readStoredPassword(): string {
  return "local";
}

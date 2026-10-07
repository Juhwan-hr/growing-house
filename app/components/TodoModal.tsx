"use client";

import { useState } from "react";
import type { Todo, TodoCategory } from "./useTodos";

/** ISO(UTC) → 한국시간 "14:30" (오늘 완료한 것만 보여주므로 시각만 표시) */
function kstTime(iso?: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** ISO(UTC) → 한국시간 기준 날짜 "YYYY-MM-DD" */
function kstDay(iso?: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

/**
 * 일감이(업무)·짬짬이(개인) 공용 모달 — 둘 다 같은 office_todos 테이블을 쓰지만,
 * `category`를 고정값으로 받아서 자기 구분에 해당하는 할 일만 보여줍니다(구분을
 * 고르는 UI는 없음 — 어느 캐릭터를 클릭했는지가 곧 구분입니다).
 */
export default function TodoModal({
  category,
  todos,
  listError,
  needsPassword,
  hiddenCompletedByCategory,
  doneLinkUrl,
  onAdd,
  onToggle,
  onEdit,
  onRemove,
  onClose,
}: {
  category: TodoCategory;
  todos: Todo[];
  listError: boolean;
  needsPassword: boolean;
  hiddenCompletedByCategory: Record<TodoCategory, number>;
  /** (선택) 끝낸 업무를 모아 보는 바깥 링크 — 없으면 null */
  doneLinkUrl: string | null;
  onAdd: (text: string, password?: string) => Promise<void>;
  onToggle: (id: string, password?: string) => Promise<void>;
  onEdit: (id: string, text: string, password?: string) => Promise<void>;
  onRemove: (id: string, password?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 중 문제가 생겼어요.");
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    run(async () => {
      await onAdd(text.trim(), password || undefined);
      setText("");
    });
  };

  const mine = todos.filter((t) => t.category === category);
  const active = mine.filter((t) => !t.done);
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  // 오늘(KST) 끝낸 일만 보여주고, 그 전에 끝낸 일은 저장은 그대로 둔 채 /history에서 봅니다.
  const doneList = mine
    .filter((t) => t.done && kstDay(t.completed_at) === today)
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
  const hiddenDoneCount = hiddenCompletedByCategory[category] ?? 0;

  const startEdit = (t: Todo) => {
    setEditingId(t.id);
    setEditText(t.text);
    setError("");
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };
  const saveEdit = (id: string) => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    run(async () => {
      await onEdit(id, trimmed, password || undefined);
      setEditingId(null);
      setEditText("");
    });
  };

  const renderRow = (t: Todo) => {
    if (editingId === t.id) {
      return (
        <li key={t.id} className="todo-row todo-row-editing">
          <input
            type="text"
            className="todo-edit-input"
            value={editText}
            autoFocus
            disabled={busy}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveEdit(t.id);
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancelEdit();
              }
            }}
          />
          <button type="button" disabled={busy || !editText.trim()} onClick={() => saveEdit(t.id)} aria-label="저장">
            ✓
          </button>
          <button type="button" disabled={busy} onClick={cancelEdit} aria-label="취소">
            ✕
          </button>
        </li>
      );
    }
    return (
      <li key={t.id} className={t.done ? "todo-row done" : "todo-row"}>
        <label className="todo-check">
          <input
            type="checkbox"
            checked={t.done}
            disabled={busy}
            onChange={() => run(() => onToggle(t.id, password || undefined))}
          />
          <span className="reminder-text">{t.text}</span>
          {t.done && t.completed_at ? <span className="todo-date">{kstTime(t.completed_at)}</span> : null}
        </label>
        <button type="button" disabled={busy} onClick={() => startEdit(t)} aria-label="수정">
          ✏️
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => onRemove(t.id, password || undefined))}
          aria-label="삭제"
        >
          ✕
        </button>
      </li>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card win" onClick={(e) => e.stopPropagation()}>
        <div className="win-bar">
          <span>{category === "업무" ? "📋 work.todo" : "📋 my.todo"}</span>
          <button type="button" className="modal-close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="win-body">
          <p className="modal-hint">
            어느 기기에서 오피스를 열든 같은 목록이 보여요. 추가·체크·삭제할 때만 비밀번호가 필요하고, 한 번 맞추면 이 기기에서는 다시 안 물어봐요.
          </p>
          <form onSubmit={submit} className="modal-form">
            {category === "업무" && doneLinkUrl ? (
              <a href={doneLinkUrl} target="_blank" rel="noopener noreferrer" className="modal-link">
                📋 끝낸 업무 모아 보기 ↗
              </a>
            ) : null}
            <label>
              {category} 할 일
              <input
                type="text"
                required
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={category === "업무" ? "예: 채용 품의 작성하기" : "예: 헬스장 등록하기"}
              />
            </label>
            {needsPassword ? (
              <label>
                비밀번호
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="off"
                />
              </label>
            ) : null}
            {error ? <p className="modal-error">{error}</p> : null}
            <button type="submit" className="modal-submit" disabled={busy}>
              {busy ? "저장 중..." : "추가하기"}
            </button>
          </form>

          {listError && mine.length === 0 ? (
            <p className="panel-empty">목록을 불러오지 못했어요. 잠시 후 다시 열어보세요.</p>
          ) : active.length > 0 || doneList.length > 0 ? (
            <>
              <p className="todo-count">
                남은 일 {active.length}개 · 오늘 완료 {doneList.length}개
              </p>
              {active.length > 0 ? <ul className="reminder-list todo-list">{active.map(renderRow)}</ul> : null}
              {doneList.length > 0 ? (
                <>
                  <p className="todo-subhead">오늘 완료</p>
                  <ul className="reminder-list todo-list">{doneList.map(renderRow)}</ul>
                </>
              ) : null}
              {hiddenDoneCount > 0 ? (
                <p className="todo-archived-note">
                  그 전에 완료한 {hiddenDoneCount}개는 기록에 저장돼 있어요 (오피스 목록에서만 숨김)
                </p>
              ) : null}
            </>
          ) : hiddenDoneCount > 0 ? (
            <p className="panel-empty">
              오늘 할 일이 비어 있어요. 지난 완료 {hiddenDoneCount}개는 기록에 저장돼 있어요.
            </p>
          ) : (
            <p className="panel-empty">아직 등록된 할 일이 없어요.</p>
          )}
        </div>
      </div>
    </div>
  );
}

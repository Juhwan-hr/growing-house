"use client";

import { useState } from "react";
import type { Reminder } from "./useReminders";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

export default function ReminderModal({
  reminders,
  onAdd,
  onRemove,
  onClose,
  shared = false,
  needsPassword = false,
}: {
  reminders: Reminder[];
  onAdd: (time: string, text: string, password?: string) => Promise<void>;
  /** 공용 저장소를 쓰는지(어느 기기에서나 같은 목록) */
  shared?: boolean;
  needsPassword?: boolean;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [text, setText] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hour || !minute || !text.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await onAdd(`${hour}:${minute}`, text.trim(), password || undefined);
      setHour("");
      setMinute("");
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 중 문제가 생겼어요.");
    } finally {
      setBusy(false);
    }
  };

  const sorted = [...reminders].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card win" onClick={(e) => e.stopPropagation()}>
        <div className="win-bar">
          <span>✅ todo.reminder</span>
          <button type="button" className="modal-close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="win-body">
          <p className="modal-hint">
            {shared
              ? "어느 기기에서 열어도 같은 목록이 보여요. 오피스 탭을 열어둔 기기에서, 적어둔 시각이 되면 팝업으로 알려드려요."
              : "이 기기 브라우저에만 저장돼요. 오피스 탭을 열어둔 동안, 적어둔 시각이 되면 팝업으로 알려드려요."}
          </p>
          <form onSubmit={submit} className="modal-form">
            <label>
              시각 (24시간제)
              <span className="time-select-row">
                <select required value={hour} onChange={(e) => setHour(e.target.value)} aria-label="시">
                  <option value="" disabled>
                    시
                  </option>
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {h}시
                    </option>
                  ))}
                </select>
                <select required value={minute} onChange={(e) => setMinute(e.target.value)} aria-label="분">
                  <option value="" disabled>
                    분
                  </option>
                  {MINUTES.map((m) => (
                    <option key={m} value={m}>
                      {m}분
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <label>
              할 일
              <input
                type="text"
                required
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="예: 회의 준비"
              />
            </label>
            {shared && needsPassword ? (
              <label>
                비밀번호
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
              </label>
            ) : null}
            {error ? <p className="modal-error">{error}</p> : null}
            <button type="submit" className="modal-submit" disabled={busy}>
              {busy ? "저장 중..." : "추가하기"}
            </button>
          </form>

          {sorted.length > 0 ? (
            <ul className="reminder-list">
              {sorted.map((r) => (
                <li key={r.id}>
                  <span className="reminder-time">{r.time}</span>
                  <span className="reminder-text">{r.text}</span>
                  <button type="button" onClick={() => onRemove(r.id)} aria-label="삭제">
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel-empty">아직 오늘 등록된 할 일이 없어요.</p>
          )}
        </div>
      </div>
    </div>
  );
}

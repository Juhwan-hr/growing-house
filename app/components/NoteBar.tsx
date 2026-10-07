"use client";

// 쪽지 한 줄(2026-10-03) — 누가 맡을지 안 골라도 되는 입력 칸. 쓰는 동안 아래에 "누가 가져가서
// 어떻게 되는지"를 미리 보여주고, 틀렸으면 옆 칸에서 다른 식구로 바꿀 수 있어요.
import { useState } from "react";
import { NOTE_KINDS, routeNote, type NoteKind, type NoteRoute } from "../game/noteRoute";

export default function NoteBar({
  nowMin,
  needsTodoPassword,
  onPost,
}: {
  /** 한국 시각(분) — "3시"가 오전인지 오후인지 고를 때 씀 */
  nowMin: number;
  needsTodoPassword: boolean;
  /** 저장(또는 입력창 열기)까지 하고 결과 문구를 돌려줌. 실패하면 throw */
  onPost: (text: string, route: NoteRoute, password?: string) => Promise<string>;
}) {
  const [text, setText] = useState("");
  const [forced, setForced] = useState<NoteKind | "">("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const trimmed = text.trim();
  const route = trimmed ? routeNote(trimmed, nowMin, forced || null) : null;
  const askPw = needsTodoPassword && !!route && (route.kind.startsWith("todo") || route.kind === "reminder");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!route || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const msg = await onPost(trimmed, route, password || undefined);
      setResult({ ok: true, msg });
      setText("");
      setForced("");
    } catch (err) {
      setResult({ ok: false, msg: err instanceof Error ? err.message : "쪽지를 붙이지 못했어요." });
    } finally {
      setBusy(false);
    }
  };

  const hint = route ? `→ ${route.preview}` : result?.msg ?? "누가 맡을지 안 골라도 돼요. 예: 오후 4시 택배 확인 · 회의 자료 정리 · 장보기";
  const tone = route ? "" : result ? (result.ok ? " ok" : " err") : "";

  return (
    <section className="tile note-bar" aria-label="쪽지 한 줄 남기기">
      <b>📌 쪽지</b>
      <form className="note-form" onSubmit={submit}>
        <input
          type="text"
          value={text}
          onChange={(e) => { setText(e.target.value); setResult(null); }}
          placeholder="쪽지 한 줄 남기기"
          aria-label="쪽지 내용"
          autoComplete="off"
          maxLength={200}
        />
        <select value={forced} onChange={(e) => setForced(e.target.value as NoteKind | "")} aria-label="맡을 식구">
          <option value="">자동으로 고르기</option>
          {NOTE_KINDS.map((k) => (
            <option key={k.kind} value={k.kind}>{k.label}</option>
          ))}
        </select>
        {askPw ? (
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" aria-label="비밀번호" autoComplete="off" />
        ) : null}
        <button type="submit" disabled={!route || busy}>{busy ? "붙이는 중…" : "쪽지 붙이기"}</button>
      </form>
      <p className={`note-hint${tone}`} aria-live="polite">{hint}</p>
    </section>
  );
}

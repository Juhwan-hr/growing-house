"use client";

// 식구 모습 한 번에 고르기(2026-10-03) — 처음에 랜덤으로 배정된 모습 중 "험하게 생긴" 식구가
// 있다는 피드백 때문에, 한 명씩 꾸미기 창을 여는 대신 모두를 "무난하게 랜덤"으로 한꺼번에
// 다시 뽑아보고, 마음에 드는 사람만 골라 한 번에 저장합니다. 성별은 지금 모습 그대로 둡니다.
import { useState } from "react";
import type { StaffEntry } from "../../company.config";
import type { LpcConfig } from "../game/LpcSprite";
import { softRandom, Thumb } from "./AvatarCustomizerModal";

export default function AvatarBatchModal({
  staffList,
  current,
  needsPassword,
  onSave,
  onSaved,
  onClose,
}: {
  /** LPC 그림을 쓰는 식구만(집주인·단짝 제외) */
  staffList: StaffEntry[];
  /** 이름 → 지금 모습 */
  current: Record<string, LpcConfig>;
  needsPassword: boolean;
  onSave: (name: string, config: LpcConfig, password?: string) => Promise<void>;
  /** 다 저장했을 때(몇 명 바꿨는지) */
  onSaved?: (count: number) => void;
  onClose: () => void;
}) {
  const roll = (name: string) => softRandom(current[name]?.gender);
  const [drafts, setDrafts] = useState<Record<string, LpcConfig>>(() =>
    Object.fromEntries(staffList.map((s) => [s.name, roll(s.name)])),
  );
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  const toggle = (name: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  const reroll = (name: string) => {
    setDrafts((d) => ({ ...d, [name]: roll(name) }));
    setPicked((prev) => new Set(prev).add(name));
  };
  // 이미 고른(체크한) 식구는 그대로 두고 나머지만 다시 뽑기
  const rerollRest = () =>
    setDrafts((d) => Object.fromEntries(staffList.map((s) => [s.name, picked.has(s.name) ? d[s.name] : roll(s.name)])));

  const submit = async () => {
    const names = staffList.map((s) => s.name).filter((n) => picked.has(n));
    if (!names.length) return;
    setBusy(true);
    setError("");
    try {
      for (let i = 0; i < names.length; i += 1) {
        setProgress(`${i + 1}/${names.length}명 저장 중…`);
        // 비밀번호는 첫 저장에서 맞추면 이 기기에 기억되므로 두 번째부터는 안 보내도 됩니다
        await onSave(names[i], drafts[names[i]], i === 0 ? password || undefined : undefined);
      }
      setProgress(`✅ ${names.length}명 모습을 바꿨어요!`);
      onSaved?.(names.length);
      setPicked(new Set());
      window.setTimeout(onClose, 1200);
    } catch (err) {
      setProgress("");
      setError(err instanceof Error ? err.message : "저장 중 문제가 생겼어요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card win batch-modal" onClick={(e) => e.stopPropagation()}>
        <div className="win-bar">
          <span>🎨 식구 모습 한 번에 고르기</span>
          <button type="button" className="modal-close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="win-body batch-body">
          <p className="batch-lead">
            왼쪽은 지금 모습, 오른쪽은 새로 뽑은 무난한 모습이에요. 바꾸고 싶은 식구를 눌러 고른 뒤 한 번에 저장해요.
            성별은 그대로 두고, 대머리·민소매·튀는 머리색은 빼고 뽑아요.
          </p>
          <div className="batch-actions">
            <button type="button" onClick={rerollRest} disabled={busy}>
              🎲 안 고른 식구만 다시 뽑기
            </button>
            <button type="button" onClick={() => setPicked(new Set(staffList.map((s) => s.name)))} disabled={busy}>
              모두 고르기
            </button>
            <button type="button" onClick={() => setPicked(new Set())} disabled={busy}>
              모두 빼기
            </button>
          </div>
          <ul className="batch-grid">
            {staffList.map((s) => {
              const on = picked.has(s.name);
              return (
                <li key={s.name} className={on ? "on" : ""}>
                  <button type="button" className="batch-pick" onClick={() => toggle(s.name)} aria-pressed={on} disabled={busy}>
                    <span className="batch-pair">
                      <Thumb config={current[s.name]} focus="full" />
                      <span className="batch-arrow">→</span>
                      <Thumb config={drafts[s.name]} focus="full" />
                    </span>
                    <b>{s.role ?? s.name}</b>
                    <small>{on ? "✓ 바꿀게요" : "지금 모습 유지"}</small>
                  </button>
                  <button type="button" className="batch-reroll" onClick={() => reroll(s.name)} disabled={busy} aria-label={`${s.role ?? s.name} 다시 뽑기`}>
                    🎲
                  </button>
                </li>
              );
            })}
          </ul>
          {needsPassword ? (
            <label className="avatar-pw">
              비밀번호
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
            </label>
          ) : null}
          {error ? <p className="modal-error">{error}</p> : null}
          {progress ? <p className="batch-progress">{progress}</p> : null}
          <button type="button" className="modal-submit" disabled={busy || picked.size === 0} onClick={submit}>
            {picked.size ? `고른 ${picked.size}명 저장` : "바꿀 식구를 골라주세요"}
          </button>
        </div>
      </div>
    </div>
  );
}

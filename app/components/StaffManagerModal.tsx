"use client";

// 🏠 식구 들이기·관리(2026-10-07) — 코드 수정 없이 화면에서 새 앱 식구를 들이고, 기존 식구를 다른 방으로
// 옮기거나 맡은 일 이름을 바꾸거나 내보냅니다. 저장은 houseState.ts(custom_staff / custom_zones / staff_edits).
// 화면에서 들일 수 있는 건 "앱 주소로 연결되는 식구"뿐 — 입력창이 있는 식구(할 일 등)는 입력창 자체를
// 새로 만들어야 해서 코드로 추가합니다.
import { useState } from "react";
import type { HouseItem, StaffEntry } from "../../company.config";
import { ITEM_SPECS, type CustomZone, type RosterExtras } from "../game/house";
import type { LpcConfig, LpcGender } from "../game/LpcSprite";
import { softRandom, Thumb } from "./AvatarCustomizerModal";

const ROOM_ICONS = ["🏡", "📚", "🎮", "🎵", "🌱", "🧪", "🏋️", "🍳", "✈️", "💼", "🎨", "📷"];
const ITEMS = Object.entries(ITEM_SPECS) as [HouseItem, (typeof ITEM_SPECS)[HouseItem]][];

type Zone = { id: string; name: string; icon: string; custom?: boolean };

export default function StaffManagerModal({
  roster,
  zones,
  extras,
  canSave,
  needsPassword,
  onSave,
  onClose,
  onCustomize,
}: {
  /** 지금 집에 사는 식구 */
  roster: StaffEntry[];
  zones: Zone[];
  /** 지금 저장돼 있는 추가·수정 */
  extras: RosterExtras;
  /** 공용 저장소를 쓸 수 있는지(없으면 저장 불가 안내) */
  canSave: boolean;
  needsPassword: boolean;
  onSave: (next: RosterExtras, password?: string) => Promise<void>;
  onClose: () => void;
  onCustomize: (staff: StaffEntry) => void;
}) {
  const [tab, setTab] = useState<"add" | "manage">("add");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // 새 식구 입력
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [zone, setZone] = useState(zones.find((z) => z.id === "hobby")?.id ?? zones[0]?.id ?? "");
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneIcon, setNewZoneIcon] = useState(ROOM_ICONS[0]);
  const [url, setUrl] = useState("");
  const [item, setItem] = useState<HouseItem>("monitor");
  const [gender, setGender] = useState<LpcGender>("female");
  const [lines, setLines] = useState("");
  const [look, setLook] = useState<LpcConfig>(() => softRandom("female"));
  const [confirmOut, setConfirmOut] = useState<string | null>(null);

  const taken = new Set([...roster.map((s) => s.name), ...extras.staff.map((s) => s.name), ...Object.keys(extras.edits)]);
  const customNames = new Set(extras.staff.map((s) => s.name));

  const save = async (next: RosterExtras, okText: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await onSave(next, password || undefined);
      setMsg({ ok: true, text: okText });
      return true;
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "저장 중 문제가 생겼어요." });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    const r = role.trim();
    const u = url.trim();
    if (!n || !r) return setMsg({ ok: false, text: "이름과 맡은 일을 적어주세요." });
    if (taken.has(n)) return setMsg({ ok: false, text: "같은 이름의 식구가 이미 있어요(내보낸 식구 포함)." });
    if (!/^https:\/\/\S+\.\S+/.test(u)) return setMsg({ ok: false, text: "앱 주소는 https://로 시작하는 실제 주소를 적어주세요." });
    let zones2 = extras.zones;
    let zoneId = zone;
    if (zone === "__new") {
      const zn = newZoneName.trim();
      if (!zn) return setMsg({ ok: false, text: "새 방 이름을 적어주세요." });
      const z: CustomZone = { id: `z${Date.now().toString(36)}`, name: zn, icon: newZoneIcon };
      zones2 = [...extras.zones, z];
      zoneId = z.id;
    }
    const thoughts = lines.split("\n").map((l) => l.trim()).filter(Boolean);
    const staff: StaffEntry = {
      name: n,
      role: r,
      zone: zoneId,
      url: u,
      item,
      gender,
      lpc: { ...look, gender },
      thoughts: thoughts.length ? thoughts : [`${r} 일은 저한테 맡겨주세요!`],
    };
    const ok = await save({ ...extras, staff: [...extras.staff, staff], zones: zones2 }, `🎉 ${n}(${r})가 이사 왔어요! 출근하면 집에서 볼 수 있어요.`);
    if (ok) {
      setName(""); setRole(""); setUrl(""); setLines(""); setNewZoneName(""); setZone(zoneId);
      setLook(softRandom(gender));
    }
  };

  /** 기존 식구 고치기 — 화면에서 들인 식구는 그 항목을, 기본 명단 식구는 staff_edits를 바꿈 */
  const editStaff = (s: StaffEntry, change: { zone?: string; role?: string; hidden?: boolean }, okText: string) => {
    if (customNames.has(s.name)) {
      const staff = change.hidden
        ? extras.staff.filter((x) => x.name !== s.name)
        : extras.staff.map((x) => (x.name === s.name ? { ...x, ...(change.zone ? { zone: change.zone } : {}), ...(change.role ? { role: change.role } : {}) } : x));
      return save({ ...extras, staff }, okText);
    }
    const edits = { ...extras.edits, [s.name]: { ...extras.edits[s.name], ...change } };
    return save({ ...extras, edits }, okText);
  };
  const restore = (staffName: string) => {
    const e = { ...extras.edits[staffName] };
    delete e.hidden;
    const edits = { ...extras.edits, [staffName]: e };
    return save({ ...extras, edits }, `${staffName}가 다시 돌아왔어요.`);
  };
  const removeZone = (z: Zone) =>
    save({ ...extras, zones: extras.zones.filter((x) => x.id !== z.id) }, `${z.name}을(를) 없앴어요.`);

  const hiddenNames = Object.entries(extras.edits).filter(([, e]) => e.hidden).map(([n]) => n);
  const people = roster.filter((s) => !s.alwaysPresent);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card win sm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="win-bar">
          <span>🏠 식구 들이기·관리</span>
          <button type="button" className="modal-close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="win-body sm-body">
          <div className="avatar-tabs">
            <button type="button" className={tab === "add" ? "active" : ""} onClick={() => setTab("add")}>새 식구 들이기</button>
            <button type="button" className={tab === "manage" ? "active" : ""} onClick={() => setTab("manage")}>식구 관리 ({people.length})</button>
          </div>

          {!canSave ? (
            <p className="modal-error">이 브라우저에 저장할 수 없어요. (사생활 보호 모드인지 확인해 주세요)</p>
          ) : null}

          {tab === "add" ? (
            <form className="modal-form sm-form" onSubmit={addStaff}>
              <p className="modal-hint">
                앱 주소로 연결되는 식구를 들여요. 입력창이 있는 식구(할 일처럼 바로 적는 것)는 입력창을 새로 만들어야
                해서 코드로 추가해요.
              </p>
              <div className="sm-grid">
                <label>이름<input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 책벌레" maxLength={12} /></label>
                <label>맡은 일(이름표에 보여요)<input value={role} onChange={(e) => setRole(e.target.value)} placeholder="예: 독서 기록 매니저" maxLength={16} /></label>
                <label className="sm-wide">앱 주소<input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." inputMode="url" /></label>
                <label>
                  방
                  <select value={zone} onChange={(e) => setZone(e.target.value)}>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.icon} {z.name}</option>
                    ))}
                    <option value="__new">＋ 새 방 만들기</option>
                  </select>
                </label>
                <label>
                  맡은 물건
                  <select value={item} onChange={(e) => setItem(e.target.value as HouseItem)}>
                    {ITEMS.map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </label>
                {zone === "__new" ? (
                  <div className="sm-wide sm-newroom">
                    <label>새 방 이름<input value={newZoneName} onChange={(e) => setNewZoneName(e.target.value)} placeholder="예: 서재" maxLength={8} /></label>
                    <div className="sm-icons" role="group" aria-label="방 아이콘">
                      {ROOM_ICONS.map((ic) => (
                        <button key={ic} type="button" className={ic === newZoneIcon ? "active" : ""} onClick={() => setNewZoneIcon(ic)}>{ic}</button>
                      ))}
                    </div>
                    <small>새 방은 집 규칙대로 빈자리에 저절로 붙어요.</small>
                  </div>
                ) : null}
                <label className="sm-wide">혼잣말(한 줄에 하나, 비워도 돼요)<textarea value={lines} onChange={(e) => setLines(e.target.value)} rows={2} placeholder="오늘은 몇 쪽 읽었어요?" /></label>
              </div>
              <div className="sm-look">
                <Thumb config={{ ...look, gender }} focus="full" />
                <div>
                  <div className="avatar-chips">
                    {(["female", "male"] as const).map((g) => (
                      <button key={g} type="button" className={gender === g ? "active" : ""} onClick={() => { setGender(g); setLook(softRandom(g)); }}>
                        {g === "female" ? "여자" : "남자"}
                      </button>
                    ))}
                    <button type="button" onClick={() => setLook(softRandom(gender))}>🎲 다른 모습</button>
                  </div>
                  <small>들인 뒤 식구 카드의 🎨 모습 바꾸기로 자세히 꾸밀 수 있어요.</small>
                </div>
              </div>
              {needsPassword ? (
                <label>비밀번호<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" /></label>
              ) : null}
              {msg ? <p className={msg.ok ? "batch-progress" : "modal-error"}>{msg.text}</p> : null}
              <button type="submit" className="modal-submit" disabled={busy || !canSave}>{busy ? "이사 오는 중…" : "🏠 식구로 들이기"}</button>
            </form>
          ) : (
            <div className="sm-manage">
              {needsPassword ? (
                <label className="avatar-pw">비밀번호<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" /></label>
              ) : null}
              {msg ? <p className={msg.ok ? "batch-progress" : "modal-error"}>{msg.text}</p> : null}
              <ul className="sm-list">
                {people.map((s) => (
                  <li key={s.name}>
                    <div className="sm-who">
                      <b>{s.role ?? s.name}</b>
                      <small>{s.name}{customNames.has(s.name) ? " · 화면에서 들인 식구" : ""}</small>
                    </div>
                    <select
                      value={s.zone}
                      disabled={busy || !canSave}
                      onChange={(e) => editStaff(s, { zone: e.target.value }, `${s.role ?? s.name}을(를) 옮겼어요.`)}
                      aria-label={`${s.name} 방`}
                    >
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>{z.icon} {z.name}</option>
                      ))}
                    </select>
                    <div className="sm-acts">
                      <button
                        type="button"
                        disabled={busy || !canSave}
                        onClick={() => {
                          const next = window.prompt?.("이름표에 보일 맡은 일", s.role ?? "");
                          if (next && next.trim()) editStaff(s, { role: next.trim() }, "이름표를 바꿨어요.");
                        }}
                      >
                        ✏️
                      </button>
                      <button type="button" onClick={() => onCustomize(s)} disabled={!s.lpc}>🎨</button>
                      {confirmOut === s.name ? (
                        <button type="button" className="sm-out yes" disabled={busy || !canSave}
                          onClick={() => { setConfirmOut(null); editStaff(s, { hidden: true }, `${s.role ?? s.name}을(를) 내보냈어요.`); }}>
                          정말 내보내기
                        </button>
                      ) : (
                        <button type="button" className="sm-out" disabled={busy || !canSave} onClick={() => setConfirmOut(s.name)}>내보내기</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {hiddenNames.length ? (
                <div>
                  <p className="avatar-label">내보낸 식구 (다시 들일 수 있어요)</p>
                  <div className="avatar-chips">
                    {hiddenNames.map((n) => (
                      <button key={n} type="button" disabled={busy || !canSave} onClick={() => restore(n)}>↩ {n}</button>
                    ))}
                  </div>
                </div>
              ) : null}
              {extras.zones.length ? (
                <div>
                  <p className="avatar-label">새로 만든 방</p>
                  <div className="avatar-chips">
                    {zones.filter((z) => z.custom).map((z) => {
                      const used = roster.some((s) => s.zone === z.id);
                      return (
                        <button key={z.id} type="button" disabled={busy || used || !canSave} title={used ? "식구가 있는 방은 없앨 수 없어요" : "이 방 없애기"} onClick={() => removeZone(z)}>
                          {z.icon} {z.name} {used ? "" : "✕"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

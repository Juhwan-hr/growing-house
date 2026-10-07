"use client";

// 자라는 집 오른쪽 패널(2026-10-02) — 평소엔 "오늘 집 상태", 캐릭터·물건을 누르면 그
// 식구의 "식구 카드"로 바뀝니다.
// 숫자는 전부 실제 데이터(할 일, 알림)에서 옵니다.
import Link from "next/link";
import { useState } from "react";
import type { StaffEntry } from "../../company.config";
import { ITEM_SPECS, STAFF_HOME, ROOM_BY_ID, type HouseLayout } from "../game/house";
import { lpcLayerUrls, type LpcConfig } from "../game/LpcSprite";
import type { Reminder } from "./useReminders";
import type { HouseLogEntry } from "./useHouseLog";
import type { Todo } from "./useTodos";

const hhmm = (t: number) => new Date(t).toLocaleTimeString("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" });
const LOG_PREVIEW = 6;

const floorName = (f: number) => `${f + 1}층`;

function slotText(layout: HouseLayout): string {
  const n = layout.next;
  const where = n.i === 0 ? "왼쪽 끝" : n.i === n.width - 1 ? "오른쪽 끝" : `왼쪽에서 ${n.i + 1}번째`;
  if (n.ev === "widen") return `다음 방부터는 집이 옆으로 한 칸 넓어져요. 새 방은 ${floorName(n.f)} ${where}에 붙어요.`;
  if (n.ev === "floor") return `다음 방은 ${floorName(n.f)}을 새로 올려서 왼쪽 끝에 붙어요.`;
  return `다음 방은 ${floorName(n.f)} ${where}에 붙어요.`;
}

export default function HousePanel({
  layout,
  roomCount,
  todoCounts,
  reminders,
  person,
  appearance,
  onBack,
  onAction,
  onCustomize,
  onZoomRoom,
  roomAlerts,
  log,
  onBatchLooks,
  onStaffManager,
  todos,
  todoNeedsPassword,
  onToggleTodo,
}: {
  layout: HouseLayout;
  roomCount: number;
  todoCounts: { work: number; personal: number; done: number; total: number };
  reminders: Reminder[];
  person: StaffEntry | null;
  appearance: LpcConfig | null;
  onBack: () => void;
  onAction: (action: NonNullable<StaffEntry["action"]>) => void;
  onCustomize: (staff: StaffEntry) => void;
  onZoomRoom: (room: string) => void;
  /** 방 id → 지금 손볼 일 — 그 방 이름표에 불이 켜져 있음 */
  roomAlerts: Record<string, string[]>;
  /** 오늘 집에서 있었던 일(최신이 위) */
  log: HouseLogEntry[];
  onBatchLooks: () => void;
  onStaffManager: () => void;
  /** 할 일 목록 — 패널에서 바로 보고 체크(입력창을 안 열어도 되게) */
  todos: Todo[];
  todoNeedsPassword: boolean;
  onToggleTodo: (id: string) => Promise<void>;
}) {
  const [logOpen, setLogOpen] = useState(false);
  if (person) {
    const home = STAFF_HOME[person.name];
    const room = home ? ROOM_BY_ID.get(home.room) : null;
    const pos = room ? layout.pos[room.id] : null;
    const item = person.alwaysPresent ? null : (person.item ?? "monitor");
    const spec = item ? ITEM_SPECS[item] : null;
    return (
      <aside className="tile house-panel" aria-live="polite">
        <button type="button" className="hp-back" onClick={onBack}>
          ← 집 상태로
        </button>
        <div className="hp-person">
          <span className="hp-pic">
            {appearance ? (
              <span className="hp-sprite">
                {lpcLayerUrls(appearance).map((l) => (
                  <span key={l.key} style={{ backgroundImage: `url(${l.url})` }} />
                ))}
              </span>
            ) : null}
          </span>
          <div>
            <h2>{person.role ?? person.name}</h2>
            <p className="hp-sub">
              {person.role ? `${person.name} · ` : ""}
              {room && pos ? `${floorName(pos.f)} ${room.name}` : ""}
            </p>
          </div>
        </div>
        {person.thoughts[0] ? <p className="hp-quote">“{person.thoughts[0]}”</p> : null}
        <div className="hp-acts">
          {person.url ? (
            <a className="hp-go primary" href={person.url} target="_blank" rel="noopener noreferrer">
              앱 열기 ↗
            </a>
          ) : person.action ? (
            <button type="button" className="hp-go primary" onClick={() => onAction(person.action!)}>
              입력창 열기
            </button>
          ) : (
            <p className="hp-note">아직 연결된 사이트가 없어요.</p>
          )}
          {person.lpc ? (
            <button type="button" className="hp-go" onClick={() => onCustomize(person)}>
              🎨 모습 바꾸기
            </button>
          ) : null}
          {room ? (
            <button type="button" className="hp-go" onClick={() => onZoomRoom(room.id)}>
              🔍 {room.name} 가까이 보기
            </button>
          ) : null}
        </div>
        {spec && item ? (
          <div className="hp-item">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/house/item-${item}.png`} alt="" />
            <div>
              <b>맡은 물건 · {spec.label}</b>
              <p>{spec.desc}</p>
            </div>
          </div>
        ) : null}
        <p className="hp-note">
          캐릭터를 누르면 이 카드가 떠요. 바로 앱으로 넘어가지 않고 여기서 한 번 더 눌러서, 모습 바꾸기와 함께 둘 수 있어요.
        </p>
      </aside>
    );
  }

  const litRooms = Object.entries(roomAlerts).filter(([, why]) => why.length);
  const nextReminder = reminders.length ? [...reminders].sort((a, b) => a.time.localeCompare(b.time))[0] : null;
  const rows: { icon: string; title: string; sub: string; value: string; alert?: boolean; action?: NonNullable<StaffEntry["action"]>; todo?: "업무" | "개인" }[] = [
    { icon: "notepad", title: "업무 할 일", sub: "일감이가 맡아요", value: `${todoCounts.work}개 남음`, alert: todoCounts.work > 0, action: "todo-work", todo: "업무" },
    { icon: "notepad", title: "개인 할 일", sub: "짬짬이가 맡아요", value: `${todoCounts.personal}개 남음`, alert: todoCounts.personal > 0, action: "todo-personal", todo: "개인" },
    {
      icon: "clock",
      title: "다음 알림",
      sub: nextReminder ? nextReminder.text : "등록된 알림이 없어요",
      value: nextReminder ? nextReminder.time : "–",
      action: "reminder",
    },
    { icon: "pot", title: "오늘 끝낸 일", sub: "거실 화분이 이만큼 자라요", value: `${todoCounts.done}/${todoCounts.total}` },
  ];

  return (
    <aside className="tile house-panel" aria-live="polite">
      <h2 className="hp-title">오늘 집 상태</h2>
      <div>
        <p className="hp-label">집 모양</p>
        <div className="hp-shape">
          <span>방 {roomCount}개</span>
          <span>{layout.floors}층</span>
          <span>가로 {layout.width}칸</span>
        </div>
        <p className="hp-note">{slotText(layout)}</p>
      </div>
      <div>
        <p className="hp-label">물건이 알려주는 것</p>
        <ul className="hp-rows">
          {rows.map((r) => (
            <li key={r.title}>
              <button type="button" disabled={!r.action} onClick={() => r.action && onAction(r.action)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/house/item-${r.icon}.png`} alt="" />
                <span className="hp-row-text">
                  <b>{r.title}</b>
                  <small>{r.sub}</small>
                </span>
                <span className={`hp-val${r.alert ? " alert" : ""}`}>{r.value}</span>
              </button>
              {r.todo ? (
                <TodoChecks
                  items={todos.filter((t) => t.category === r.todo && !t.done)}
                  needsPassword={todoNeedsPassword}
                  onToggle={onToggleTodo}
                  onOpen={() => r.action && onAction(r.action)}
                />
              ) : null}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="hp-label">💡 불 켜진 방</p>
        {litRooms.length ? (
          <ul className="hp-lit">
            {litRooms.map(([id, why]) => {
              const room = ROOM_BY_ID.get(id);
              return room ? (
                <li key={id}>
                  <button type="button" onClick={() => onZoomRoom(id)}>
                    <i className="hz-lamp" aria-hidden="true" />
                    <b>{room.icon} {room.name}</b>
                    <small>{why.join(" · ")}</small>
                  </button>
                </li>
              ) : null;
            })}
          </ul>
        ) : (
          <p className="hp-note">지금 손볼 방이 없어요. 할 일이 생기면 그 방 이름표에 불이 켜져요.</p>
        )}
      </div>
      <div>
        <p className="hp-label">오늘 집에서 있었던 일</p>
        {log.length ? (
          <ol className="hp-log">
            {(logOpen ? log : log.slice(0, LOG_PREVIEW)).map((e, i) => (
              <li key={`${e.t}-${i}`}>
                <time>{hhmm(e.t)}</time>
                <span aria-hidden="true">{e.icon}</span>
                <p>{e.text}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="hp-note">아직 오늘 있었던 일이 없어요.</p>
        )}
        {log.length > LOG_PREVIEW ? (
          <button type="button" className="hp-more" onClick={() => setLogOpen((o) => !o)}>
            {logOpen ? "접기" : `${log.length - LOG_PREVIEW}개 더 보기`}
          </button>
        ) : null}
        <p className="hp-note hp-log-note">할 일은 어느 기기에서나 보여요. 나머지는 이 기기에서 한 일만 남아요.</p>
      </div>
      <button type="button" className="hp-go" onClick={onStaffManager}>
        🏠 식구 들이기·관리
      </button>
      <button type="button" className="hp-go" onClick={onBatchLooks}>
        🎨 식구 모습 한 번에 고르기
      </button>
      <Link href="/history" className="hp-link">
        📒 오늘·이번 주 기록 보기
      </Link>
    </aside>
  );
}

const TODO_PREVIEW = 4;

/** 오늘 집 상태 안에서 바로 보는 남은 할 일 — 체크하면 끝낸 걸로(담당 식구가 화분에 물 주러 감).
 *  비밀번호를 아직 이 기기에 안 넣었으면 체크 대신 입력창을 열어서 거기서 넣게 합니다. */
function TodoChecks({
  items,
  needsPassword,
  onToggle,
  onOpen,
}: {
  items: Todo[];
  needsPassword: boolean;
  onToggle: (id: string) => Promise<void>;
  onOpen: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  if (!items.length) return null;
  const shown = open ? items : items.slice(0, TODO_PREVIEW);
  const check = async (id: string) => {
    if (needsPassword) return onOpen();
    setBusy(id);
    try {
      await onToggle(id);
    } catch {
      onOpen(); // 비밀번호가 바뀌었거나 저장이 안 되면 입력창에서 다시
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="hp-todos">
      <ul>
        {shown.map((t) => (
          <li key={t.id}>
            <label>
              <input type="checkbox" checked={busy === t.id} disabled={busy === t.id} onChange={() => check(t.id)} />
              <span>{t.text}</span>
            </label>
          </li>
        ))}
      </ul>
      {items.length > TODO_PREVIEW ? (
        <button type="button" className="hp-more" onClick={() => setOpen((o) => !o)}>
          {open ? "접기" : `${items.length - TODO_PREVIEW}개 더 보기`}
        </button>
      ) : null}
    </div>
  );
}

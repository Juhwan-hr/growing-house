"use client";

// 오른쪽 패널 — 평소엔 "오늘 집 상태"(집 모양), 식구를 누르면 그 식구의 카드로 바뀝니다.
import type { StaffEntry } from "../../company.config";
import { STAFF_HOME, ROOM_BY_ID, type HouseLayout } from "../game/house";
import { lpcLayerUrls, type LpcConfig } from "../game/LpcSprite";

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
  person,
  appearance,
  onBack,
  onCustomize,
  onZoomRoom,
}: {
  layout: HouseLayout;
  roomCount: number;
  person: StaffEntry | null;
  appearance: LpcConfig | null;
  onBack: () => void;
  onCustomize: (staff: StaffEntry) => void;
  onZoomRoom: (room: string) => void;
}) {
  if (person) {
    const home = STAFF_HOME[person.name];
    const room = home ? ROOM_BY_ID.get(home.room) : null;
    const pos = room ? layout.pos[room.id] : null;
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
          ) : (
            <p className="hp-note">아직 연결된 앱이 없어요.</p>
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
      </aside>
    );
  }

  return (
    <aside className="tile house-panel" aria-live="polite">
      <h2 className="hp-title">오늘 집 상태</h2>
      <div>
        <p className="hp-label">집 모양</p>
        <div className="hp-shape">
          <span>방 {roomCount}개</span>
          <span>{layout.floors}층</span>
          <span>가로 {Math.max(1, ...Object.entries(layout.pos).map(([id, p]) => p.i + (ROOM_BY_ID.get(id)?.w ?? 1)))}칸</span>
        </div>
        <p className="hp-note">{slotText(layout)}</p>
      </div>
    </aside>
  );
}

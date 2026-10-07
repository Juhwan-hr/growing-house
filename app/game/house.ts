// "자라는 집"(2026-10-02) — 옆에서 잘라 본 집 한 채. 직원(앱)이 늘면 방이 하나씩 덧붙습니다.
// 예전 위에서 내려다본 사무실(world.ts의 중앙 허브 배치)을 대신합니다. 설계 과정과 다른
// 시안들은 docs/blueprints/ 참고(5번이 이 구조).
//
// 좌표는 전부 화면 픽셀 단위(타일 격자 없음). 집 왼쪽 끝에 계단실이 있고, 그 오른쪽으로
// 한 칸(BW)짜리 방이 층마다 붙습니다. f층 바닥선의 y = fy(f).
import { STAFF_LIST, ZONES, type HouseItem, type StaffEntry } from "../../company.config";

/** 한 칸(방 1개) 가로 폭 */
export const BW = 230;
/** 한 층 높이(바닥판 포함) */
export const FH = 150;
/** 방 안쪽 높이(바닥판 10px 제외) */
export const RH = 140;
/** 계단실 폭 */
export const SW = 84;
/** 계단실 왼쪽 벽의 x — 집 왼쪽에 마당·나무 자리를 남깁니다 */
export const X0 = 420;
/** 1층 바닥선(땅)의 y */
export const GY = 1180;
/** 처음 집 가로 칸 수 */
export const START_W = 4;

export const fy = (f: number) => GY - f * FH;
export const bx = (i: number) => X0 + SW + i * BW;

/** 방 하나에 직원 자리(물건+사람) 3개까지 — 넘으면 두 칸짜리 방 */
const STATIONS_PER_BAY = 3;

export type HouseRoom = {
  id: string;
  name: string;
  icon: string;
  kind: "entrance" | "living" | "zone";
  /** 가로 칸 수(1 또는 2) */
  w: number;
  color: string;
  staff: StaffEntry[];
};

const ZONE_COLORS: Record<string, string> = {
  bedroom: "#f7e3ea",
  secretary: "#e3ecfb",
  work: "#e2f2ea",
  studio: "#ece4fa",
  hobby: "#fbe9dc",
  growth: "#dff0f7",
};
const EXTRA_COLORS = ["#f3ead9", "#e7edf9", "#e0f3da", "#f7e6f0", "#e6e3f7"];

/** ZONES에 없는 특수 방(비서실) — 예전 world.ts의 SECRETARY_ROOM과 같은 이름·아이콘 */
const SPECIAL_ZONES = [{ id: "secretary", name: "비서실", icon: "🛎️" }];

// ── 식구 명단(2026-10-07 "새 식구 들이기") ─────────────────────
// 기본 명단은 company.config.ts(STAFF_LIST·ZONES)이고, 화면에서 들인 식구·새로 만든 방·기존 식구 수정
// (방 옮기기·맡은 일 이름·내보내기)은 공용 저장소(custom_staff / custom_zones / staff_edits)에 있습니다.
// applyRoster()가 둘을 합쳐 아래 ROSTER·HOUSE_ROOMS·ROOM_BY_ID·STAFF_HOME을 "그 자리에서" 다시 채웁니다
// (다른 파일이 같은 객체를 계속 쓰도록 새로 만들지 않고 내용만 바꿈). 화면은 page.tsx의 rosterVersion으로 다시 그림.

/** 화면에서 새로 만든 방 */
export type CustomZone = { id: string; name: string; icon: string };
/** 기존 식구 수정 — 방 옮기기·맡은 일 이름 바꾸기·내보내기(hidden) */
export type StaffEdit = { zone?: string; role?: string; hidden?: boolean };
export type RosterExtras = { staff: StaffEntry[]; zones: CustomZone[]; edits: Record<string, StaffEdit> };

/** 지금 집에 사는 식구 전원(기본 명단 + 들인 식구 − 내보낸 식구) */
export const ROSTER: StaffEntry[] = [];
/** 지금 있는 구역(기본 ZONES + 새로 만든 방) — 방 고르기 목록용 */
export const ZONE_LIST: { id: string; name: string; icon: string; custom?: boolean }[] = [];

function zoneRooms(staffList: StaffEntry[], customZones: CustomZone[]): HouseRoom[] {
  const zones = [
    ...ZONES.map((z) => ({ id: z.id, name: z.name, icon: z.icon })),
    ...SPECIAL_ZONES,
    ...customZones,
  ];
  return zones.map((z, i) => {
    const staff = staffList.filter((s) => s.zone === z.id);
    const stations = staff.filter((s) => !s.alwaysPresent).length;
    return {
      id: z.id,
      name: z.name,
      icon: z.icon,
      kind: "zone" as const,
      w: stations > STATIONS_PER_BAY ? 2 : 1,
      color: ZONE_COLORS[z.id] ?? EXTRA_COLORS[i % EXTRA_COLORS.length],
      staff,
    };
  });
}

/** 집 안의 모든 방(현관·거실 + 구역마다 하나) */
export const HOUSE_ROOMS: HouseRoom[] = [];
export const ROOM_BY_ID = new Map<string, HouseRoom>();

/** 처음 배치 순서 — 1층(현관·거실·작업실·안방), 2층(비서실·업무방·취미방·자기개발실).
 *  여기 없는 새 구역은 맨 뒤에 붙어서, 아래 규칙대로 빈자리에 자동으로 들어갑니다. */
const DEFAULT_ORDER = ["entrance", "living", "studio", "bedroom", "secretary", "work", "hobby", "growth"];

/** 저장된 순서(방 자리 바꾸기 결과)를 지금 방 목록에 맞춰 정리 — 없어진 방은 빼고 새 방은 뒤에 붙임 */
export function normalizeOrder(saved: string[] | null): string[] {
  const ids = HOUSE_ROOMS.map((r) => r.id);
  const base = (saved ?? DEFAULT_ORDER).filter((id) => ids.includes(id));
  for (const id of [...DEFAULT_ORDER, ...ids]) if (ids.includes(id) && !base.includes(id)) base.push(id);
  return base;
}

export type Slot = { f: number; i: number; ev: "floor" | "widen" | null };
export type HouseLayout = { width: number; floors: number; pos: Record<string, Slot>; next: Slot & { width: number; floors: number } };

/**
 * 집이 자라는 규칙:
 *  1) 새 방은 가장 낮은 층의 왼쪽 빈칸부터 채운다(아래층이 받쳐주는 칸에만).
 *  2) 층이 다 차면 한 층 올리되, 층 수가 "가로 칸 수 - 1"이 되면 대신 옆으로 한 칸 넓힌다.
 * 방 순서가 같으면 항상 같은 모양이 나오고, 앞쪽 방의 자리는 뒤에 방이 붙어도 안 바뀝니다.
 */
function place(list: { id: string; w: number }[]) {
  let width = START_W;
  let floors = 1;
  const used = [0];
  const pos: Record<string, Slot> = {};
  for (const { id, w } of list) {
    let ev: Slot["ev"] = null;
    for (;;) {
      let done = false;
      for (let f = 0; f < floors; f += 1) {
        if (width - used[f] >= w && (f === 0 || used[f - 1] >= used[f] + w)) {
          pos[id] = { f, i: used[f], ev };
          used[f] += w;
          done = true;
          break;
        }
      }
      if (done) break;
      if (floors < width - 1) {
        floors += 1;
        used.push(0);
        ev = "floor";
      } else {
        width += 1;
        ev = "widen";
      }
    }
  }
  return { width, floors, pos };
}

export function computeLayout(order: string[]): HouseLayout {
  const list = order.map((id) => ({ id, w: ROOM_BY_ID.get(id)?.w ?? 1 }));
  const now = place(list);
  const probe = place([...list, { id: "__next", w: 1 }]);
  return { ...now, next: { ...probe.pos.__next, width: probe.width, floors: probe.floors } };
}

// ── 방 안 자리(직원 + 맡은 물건) ─────────────────────────────

export type ItemSpec = { label: string; place: "wall" | "floor" | "desk"; w: number; furniture?: "desk" | "table"; desc: string };
export const ITEM_SPECS: Record<HouseItem, ItemSpec> = {
  monitor: { label: "모니터", place: "desk", w: 20, furniture: "desk", desc: "자리마다 있는 기본 물건이에요. 새 앱을 들여도 이 모니터로 시작해요." },
  mailbox: { label: "우편함", place: "floor", w: 24, desc: "우편함이에요. 편지·메시지 앱을 맡은 식구에게 어울려요." },
  piggy: { label: "저금통", place: "desk", w: 28, furniture: "table", desc: "저금통이에요. 가계부 앱을 맡은 식구에게 어울려요." },
  clock: { label: "벽시계", place: "wall", w: 22, desc: "다음 알림 시각이 시계 위에 떠 있어요." },
  notepad: { label: "수첩", place: "desk", w: 22, furniture: "desk", desc: "남은 할 일 수가 떠 있어요. 할 일을 끝내면 담당 직원이 거실 화분에 물을 줘요." },
  fridge: { label: "냉장고", place: "floor", w: 24, desc: "냉장고예요. 요리·레시피 앱에 어울려요." },
  calendar: { label: "벽 달력", place: "wall", w: 24, desc: "벽 달력이에요. 일정 앱에 어울려요." },
  suitcase: { label: "여행 캐리어", place: "floor", w: 24, desc: "여행 캐리어예요. 여행 계획 앱에 어울려요." },
  easel: { label: "이젤", place: "floor", w: 24, desc: "이젤이에요. 그림·창작 앱에 어울려요." },
  paper: { label: "화선지", place: "desk", w: 26, furniture: "table", desc: "화선지예요. 글씨·필기 앱에 어울려요." },
  map: { label: "벽 지도", place: "wall", w: 36, desc: "벽 지도예요. 운동·지도 앱에 어울려요." },
};

export type Station = { staff: StaffEntry; item: HouseItem | null; homeX: number; itemX: number };

/** 방 안에서 직원마다 자리 하나 — 가로로 고르게 나누고, 물건은 사람 왼쪽에 둡니다 */
export function stationsFor(room: HouseRoom): Station[] {
  const W = room.w * BW;
  if (room.id === "bedroom") {
    // 안방: 침대(오른쪽)·책장(왼쪽)을 피해서 가운데에 나란히
    return room.staff.map((staff, k) => ({ staff, item: null, homeX: 78 + k * 40, itemX: 0 }));
  }
  const n = Math.max(1, room.staff.length);
  const slot = W / n;
  return room.staff.map((staff, k) => {
    const cx = slot * (k + 0.5);
    return { staff, item: staff.alwaysPresent ? null : (staff.item ?? "monitor"), homeX: cx + 16, itemX: cx - 24 };
  });
}

/** tagUp: 같은 방 이웃끼리 이름표가 겹치지 않게 한 칸 위로 올려 그릴지(번갈아 가며) */
export type StaffHome = { room: string; homeX: number; tagUp: boolean };
/** 직원 이름 → 집 안 자기 자리(방 id + 방 안 x) */
export const STAFF_HOME: Record<string, StaffHome> = {};

/** 기본 명단 + 공용 저장소의 추가·수정을 합쳐 집을 다시 계산합니다(내용만 바꿈 — 위 설명 참고) */
export function applyRoster(extras?: Partial<RosterExtras>) {
  const edits = extras?.edits ?? {};
  const customZones = (extras?.zones ?? []).filter((z) => z && z.id && z.name);
  const zoneIds = new Set([...ZONES.map((z) => z.id), ...SPECIAL_ZONES.map((z) => z.id), ...customZones.map((z) => z.id)]);
  const base = [...STAFF_LIST, ...(extras?.staff ?? []).filter((s) => s && s.name && !STAFF_LIST.some((b) => b.name === s.name))];
  const staff = base
    .filter((s) => !edits[s.name]?.hidden)
    .map((s) => {
      const e = edits[s.name];
      const zone = e?.zone && zoneIds.has(e.zone) ? e.zone : zoneIds.has(s.zone) ? s.zone : "secretary";
      return { ...s, zone, role: e?.role ?? s.role };
    });
  ROSTER.splice(0, ROSTER.length, ...staff);
  ZONE_LIST.splice(0, ZONE_LIST.length,
    ...ZONES.map((z) => ({ id: z.id, name: z.name, icon: z.icon })),
    ...SPECIAL_ZONES,
    ...customZones.map((z) => ({ ...z, custom: true })),
  );
  const rooms: HouseRoom[] = [
    { id: "entrance", name: "현관", icon: "🚪", kind: "entrance", w: 1, color: "#f4ecdf", staff: [] },
    { id: "living", name: "거실", icon: "🛋️", kind: "living", w: 1, color: "#fff2dc", staff: [] },
    ...zoneRooms(staff, customZones),
  ];
  HOUSE_ROOMS.splice(0, HOUSE_ROOMS.length, ...rooms);
  ROOM_BY_ID.clear();
  rooms.forEach((r) => ROOM_BY_ID.set(r.id, r));
  for (const k of Object.keys(STAFF_HOME)) delete STAFF_HOME[k];
  rooms.forEach((room) =>
    stationsFor(room).forEach((st, k) => {
      STAFF_HOME[st.staff.name] = { room: room.id, homeX: st.homeX, tagUp: k % 2 === 1 };
    }),
  );
}
applyRoster();

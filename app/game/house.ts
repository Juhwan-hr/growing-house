// 자라는 집 — 옆에서 잘라 본 집 한 채. 처음엔 현관 하나뿐이고, company.config.ts의 ZONES에
// 방을 추가할 때마다 방이 하나씩 덧붙습니다.
//
// 좌표는 전부 화면 픽셀 단위(타일 격자 없음). 집 왼쪽 끝에 계단실이 있고, 그 오른쪽으로
// 한 칸(BW)짜리 방이 층마다 붙습니다. f층 바닥선의 y = fy(f).
import { STAFF_LIST, ZONES, type StaffEntry } from "../../company.config";

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

/** 방 하나에 식구 4명까지 — 넘으면 두 칸짜리 방 */
const PEOPLE_PER_BAY = 4;

export type HouseRoom = {
  id: string;
  name: string;
  icon: string;
  kind: "entrance" | "zone";
  /** 가로 칸 수(1 또는 2) */
  w: number;
  color: string;
  staff: StaffEntry[];
};

const ROOM_COLORS = ["#e3ecfb", "#e2f2ea", "#fbe9dc", "#dff0f7", "#ece4fa", "#f7e3ea", "#f3ead9", "#e0f3da"];

/** 집에 사는 식구 전원 — 없는 방(zone)을 적은 식구는 현관에서 지냅니다 */
const zoneIds = new Set(ZONES.map((z) => z.id));
export const ROSTER: StaffEntry[] = STAFF_LIST.map((s) => (zoneIds.has(s.zone) ? s : { ...s, zone: "entrance" }));

const roomOf = (id: string, name: string, icon: string, kind: HouseRoom["kind"], color: string): HouseRoom => {
  const staff = ROSTER.filter((s) => s.zone === id);
  return { id, name, icon, kind, w: staff.length > PEOPLE_PER_BAY ? 2 : 1, color, staff };
};

/** 집 안의 모든 방(현관 + ZONES마다 하나) */
export const HOUSE_ROOMS: HouseRoom[] = [
  roomOf("entrance", "현관", "🚪", "entrance", "#f4ecdf"),
  ...ZONES.map((z, i) => roomOf(z.id, z.name, z.icon, "zone", ROOM_COLORS[i % ROOM_COLORS.length])),
];
export const ROOM_BY_ID = new Map(HOUSE_ROOMS.map((r) => [r.id, r]));

/** 저장된 순서(방 자리 바꾸기 결과)를 지금 방 목록에 맞춰 정리 — 없어진 방은 빼고 새 방은 뒤에 붙임 */
export function normalizeOrder(saved: string[] | null): string[] {
  const ids = HOUSE_ROOMS.map((r) => r.id);
  const base = (saved ?? ids).filter((id) => ids.includes(id));
  for (const id of ids) if (!base.includes(id)) base.push(id);
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

/** tagUp: 같은 방 이웃끼리 이름표가 겹치지 않게 한 칸 위로 올려 그릴지(번갈아 가며) */
export type StaffHome = { room: string; homeX: number; tagUp: boolean };
/** 식구 이름 → 집 안 자기 자리(방 id + 방 안 x). 방 안에서 가로로 고르게 나눠 섭니다 */
export const STAFF_HOME: Record<string, StaffHome> = {};
for (const room of HOUSE_ROOMS) {
  const W = room.w * BW;
  const slot = W / Math.max(1, room.staff.length);
  room.staff.forEach((s, k) => {
    STAFF_HOME[s.name] = { room: room.id, homeX: slot * (k + 0.5), tagUp: k % 2 === 1 };
  });
}

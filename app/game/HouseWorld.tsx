"use client";

// 자라는 집 — 옆에서 잘라 본 집 한 채를 그리고, 식구들이 계단으로 층을 오가며 지냅니다.
// 걷기는 React state가 아니라 rAF 루프에서 DOM을 직접 갱신합니다(성능 때문).
// 집 모양(어느 방이 어디 붙는지)은 house.ts의 computeLayout()이 정합니다.
import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { StaffEntry } from "../../company.config";
import LpcSprite, { type LpcConfig } from "./LpcSprite";
import OfficeWindow from "./OfficeWindow";
import PetSprite, { type PetColor, type PetKind } from "./PetSprite";
import SeasonalTheme from "./SeasonalTheme";
import {
  BW, FH, GY, RH, ROOM_BY_ID, ROSTER, STAFF_HOME, SW, X0,
  bx, fy, type HouseLayout, type HouseRoom,
} from "./house";

/** off = 퇴근(안 보임) · work = 자기 자리 · free = 집 안을 자유롭게 돌아다님 */
export type OfficeMode = "off" | "work" | "free";
/** 출퇴근 애니메이션 속도 — 보통 / 빠르게(배속) / 건너뛰기(즉시 등장·퇴장) */
export type CommuteMode = "normal" | "fast" | "skip";
type TimeOfDay = "morning" | "day" | "evening" | "night";
type Facing = "down" | "up" | "left" | "right";

const SPEED = 110; // px/초
const COMMUTE_SPEED = 170;
const COMMUTE_FAST = 3;
const DOOR: [number, number] = [X0 - 70, GY];
const WORLD_W = 3200;
const WORLD_H = 1420;
/** 이보다 좁은 화면(휴대폰)에선 집 전체를 한 화면에 줄여 넣지 않고, 실제 크기에 가깝게 그려서
 *  손가락으로 위아래(층)·옆(방)으로 넘겨 봅니다 */
const NARROW_W = 640;
/** 휴대폰 화면 배율 — 방 한 칸 반이 보이는 정도, 1배를 넘지 않게(글씨가 가장 또렷) */
const mobileScale = (W: number) => Math.min(1, W / (BW * 1.5));
const PET_REACTIONS = { dog: ["🐾", "❤️", "🦴", "✨"], cat: ["😺", "💤", "❤️", "🐟"] } as const;

const CHAT_PROMPTS = [
  { ask: "오늘 점심 뭐 드실 거예요?", reply: "저는 아직 못 정했어요!" },
  { ask: "이번 주 진짜 빨리 가지 않아요?", reply: "그러니까요, 벌써 이렇게 됐네요." },
  { ask: "커피 한 잔 하러 갈래요?", reply: "좋죠, 저도 딱 필요했어요." },
  { ask: "요즘 잘 지내요?", reply: "네 덕분에요, 그쪽은 어때요?" },
  { ask: "오늘 날씨 완전 좋죠?", reply: "그러게요, 산책이라도 하고 싶네요." },
];

const SKY: Record<TimeOfDay, [string, string]> = {
  morning: ["#ffd9a8", "#ffb199"],
  day: ["#8fd3f4", "#c7ecfb"],
  evening: ["#ff9a76", "#5b3a6e"],
  night: ["#1c2340", "#0b0e1f"],
};
const OUTSHADE: Record<TimeOfDay, string> = {
  morning: "rgba(255,180,120,.12)",
  day: "rgba(0,0,0,0)",
  evening: "rgba(120,60,90,.25)",
  night: "rgba(10,14,40,.55)",
};
function band([a, b]: [string, string]) {
  const p = (h: string) => parseInt(h.slice(1), 16);
  const [x, y] = [p(a), p(b)];
  const mix = (t: number) => {
    const c = (s: number) => Math.round(((x >> s) & 255) + ((((y >> s) & 255) - ((x >> s) & 255)) * t));
    return `rgb(${c(16)},${c(8)},${c(0)})`;
  };
  return `linear-gradient(180deg, ${mix(0)} 0 25%, ${mix(0.33)} 25% 50%, ${mix(0.66)} 50% 75%, ${mix(1)} 75% 100%)`;
}
function kstTimeOfDay(): TimeOfDay {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", hour: "numeric", hour12: false }).format(new Date())) % 24;
  return h >= 6 && h < 11 ? "morning" : h < 17 && h >= 11 ? "day" : h >= 17 && h < 20 ? "evening" : "night";
}

/** 방 하나의 화면 좌표 */
function roomBox(layout: HouseLayout, room: HouseRoom) {
  const p = layout.pos[room.id];
  return { x: bx(p.i), y: fy(p.f + 1) + 10, w: room.w * BW, h: RH, f: p.f };
}

type Walker = {
  x: number;
  y: number;
  path: { x: number; y: number }[];
  facing: Facing;
  moving: boolean;
  leaving: boolean;
  arriving: boolean;
  pauseUntil: number;
};

const PETS: { room: string; kind: PetKind; color: PetColor; x: number }[] = [
  { room: "entrance", kind: "dog", color: "white", x: 70 },
  { room: "entrance", kind: "cat", color: "black", x: 140 },
];

export default function HouseWorld({
  layout,
  order,
  onSwap,
  mode,
  commuteMode = "normal",
  appearanceOverrides,
  onPerson,
  zoomRequest,
}: {
  layout: HouseLayout;
  order: string[];
  onSwap: (a: string, b: string) => void;
  mode: OfficeMode;
  commuteMode?: CommuteMode;
  appearanceOverrides?: Record<string, LpcConfig>;
  onPerson: (staff: StaffEntry) => void;
  /** 바깥(식구 카드)에서 특정 방을 가까이 보게 할 때 */
  zoomRequest?: { id: number; room: string } | null;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const clipRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  const [curFloor, setCurFloor] = useState(0);
  const mobileRef = useRef({ s: 1, init: false });
  const [zoomed, setZoomed] = useState<string | null>(null);
  const [swapMode, setSwapMode] = useState(false);
  const [swapFirst, setSwapFirst] = useState<string | null>(null);
  const [time, setTime] = useState<TimeOfDay>("day");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenSupported, setFullscreenSupported] = useState(false);
  const [present, setPresent] = useState<Set<string>>(new Set());
  const [moving, setMoving] = useState(false);

  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const modeRef = useRef(mode);
  const commuteRef = useRef(commuteMode);
  commuteRef.current = commuteMode;
  const walkers = useRef(new Map<string, Walker>());
  const elRefs = useRef(new Map<string, HTMLElement>());
  const bubbleRefs = useRef(new Map<string, HTMLElement>());
  const petRefs = useRef<(HTMLElement | null)[]>([]);
  const busyUntil = useRef(new Map<string, number>());
  const mountedAt = useRef(0);
  const chatCooldown = useRef(new Map<string, number>());

  // ── 시간대(한국 시각) ──
  useEffect(() => {
    mountedAt.current = performance.now();
    const update = () => setTime(kstTimeOfDay());
    update();
    const t = window.setInterval(update, 60 * 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    setFullscreenSupported(typeof document.documentElement.requestFullscreen === "function");
    const onChange = () => setIsFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const rooms = useMemo(() => order.map((id) => ROOM_BY_ID.get(id)!).filter(Boolean), [order]);

  // 집 전체가 들어오는 상자 — 다음 방 자리(점선)까지 포함
  // 실제로 방이 있는 칸까지만(처음 현관 하나일 땐 집이 화면을 꽉 채우게) + 다음 방 자리
  const usedCols = Math.max(1, ...Object.entries(layout.pos).map(([id, p]) => p.i + (ROOM_BY_ID.get(id)?.w ?? 1)));
  const houseRight = bx(usedCols);
  const topY = fy(layout.floors);
  const houseBox = useMemo(() => {
    const right = Math.max(houseRight, bx(layout.next.i + 1));
    const top = Math.min(topY, fy(layout.next.f + 1));
    return { x: X0 - 170, y: top - 90, w: right + 120 - (X0 - 170), h: GY + 40 - (top - 90) };
  }, [houseRight, topY, layout.next.i, layout.next.f]);
  /** 집 모양에 맞춘 화면 비율 — 납작한 집이면 화면도 납작하게(하늘만 크게 남지 않게) */
  const viewAspect = Math.min(3.2, Math.max(16 / 9, houseBox.w / houseBox.h));

  // ── 카메라: 집 전체 또는 방 하나에 맞춤 ──
  // 휴대폰(좁은 화면)에선 집 전체를 줄여 넣으면 글씨가 너무 작아져서, 실제 크기에 가깝게 그리고
  // 화면을 손가락으로 넘겨 보게 합니다(층 버튼으로 바로 이동, 방을 고르면 그 방으로 스크롤).
  useEffect(() => {
    const viewport = viewportRef.current;
    const stage = stageRef.current;
    const clip = clipRef.current;
    if (!viewport || !stage || !clip) return;
    const apply = () => {
      const W = viewport.clientWidth;
      const H = viewport.clientHeight;
      if (!W || !H) return;
      const room = zoomed ? ROOM_BY_ID.get(zoomed) : null;
      const isNarrow = W < NARROW_W;
      setNarrow(isNarrow);
      if (isNarrow) {
        const s = mobileScale(W);
        mobileRef.current.s = s;
        stage.style.transform = `translate(${-houseBox.x * s}px, ${-houseBox.y * s}px) scale(${s})`;
        clip.style.width = `${houseBox.w * s}px`;
        clip.style.height = `${houseBox.h * s}px`;
        if (room && layout.pos[room.id]) {
          const r = roomBox(layout, room);
          viewport.scrollTo({ left: (r.x + r.w / 2 - houseBox.x) * s - W / 2, top: (r.y + RH / 2 - houseBox.y) * s - H / 2, behavior: "smooth" });
        } else if (!mobileRef.current.init) {
          // 처음엔 1층 현관 쪽(계단실부터, 맨 아래)
          mobileRef.current.init = true;
          viewport.scrollTo({ left: (X0 - 40 - houseBox.x) * s, top: houseBox.h * s });
        }
        return;
      }
      clip.style.width = "";
      clip.style.height = "";
      const b = room && layout.pos[room.id]
        ? (() => { const r = roomBox(layout, room); return { x: r.x - 40, y: r.y - 60, w: r.w + 80, h: FH + 80 }; })()
        : houseBox;
      const s = Math.min(W / b.w, H / b.h, room ? 2.1 : 9);
      // 남는 세로 공간은 하늘 쪽으로(땅이 과하게 보이지 않게)
      const ty = room ? H / 2 - (b.y + b.h / 2) * s : H - (b.y + b.h) * s;
      stage.style.transform = `translate(${W / 2 - (b.x + b.w / 2) * s}px, ${ty}px) scale(${s})`;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(viewport);
    return () => ro.disconnect();
  }, [zoomed, layout, houseBox]);

  useEffect(() => {
    if (zoomRequest) setZoomed(zoomRequest.room);
  }, [zoomRequest]);

  // 휴대폰: 지금 화면 가운데에 있는 층을 층 버튼에 표시 + 층 버튼을 누르면 그 층으로
  const onViewportScroll = () => {
    const v = viewportRef.current;
    if (!v || !narrow) return;
    const { s } = mobileRef.current;
    // 맨 위·맨 아래까지 넘기면 그 끝 층으로(가운데 기준으로는 끝 층이 가운데에 못 오니까)
    if (v.scrollTop <= 2) return setCurFloor(layout.floors - 1);
    if (v.scrollTop + v.clientHeight >= v.scrollHeight - 2) return setCurFloor(0);
    const cy = (v.scrollTop + v.clientHeight / 2) / s + houseBox.y;
    setCurFloor(Math.max(0, Math.min(layout.floors - 1, Math.floor((GY - cy) / FH))));
  };
  const goFloor = (f: number) => {
    const v = viewportRef.current;
    if (!v) return;
    const { s } = mobileRef.current;
    setZoomed(null);
    v.scrollTo({ top: (fy(f + 1) + FH / 2 - houseBox.y) * s - v.clientHeight / 2, behavior: "smooth" });
  };

  // ── 위치 계산 도우미 ──
  const homeOf = (name: string): [number, number] => {
    const h = STAFF_HOME[name];
    const room = h && ROOM_BY_ID.get(h.room);
    const p = room && layoutRef.current.pos[room.id];
    if (!h || !p) return DOOR;
    return [bx(p.i) + h.homeX, fy(p.f)];
  };
  const floorOf = (y: number) => Math.round((GY - y) / FH);
  /** 층이 다르면 왼쪽 계단실을 거쳐 갑니다 (아래층 왼쪽 → 위층 오른쪽으로 오르는 계단) */
  const route = (from: { x: number; y: number }, to: [number, number]) => {
    const pts: { x: number; y: number }[] = [];
    let f = floorOf(from.y);
    const t = floorOf(to[1]);
    const lo = X0 + 12;
    const hi = X0 + SW - 14;
    while (f < t) { pts.push({ x: lo, y: fy(f) }, { x: hi, y: fy(f + 1) }); f += 1; }
    while (f > t) { pts.push({ x: hi, y: fy(f) }, { x: lo, y: fy(f - 1) }); f -= 1; }
    pts.push({ x: to[0], y: to[1] });
    return pts;
  };
  const randomSpot = (): [number, number] => {
    const L = layoutRef.current;
    const ids = Object.keys(L.pos);
    const room = ROOM_BY_ID.get(ids[Math.floor(Math.random() * ids.length)])!;
    const p = L.pos[room.id];
    return [bx(p.i) + 24 + Math.random() * (room.w * BW - 48), fy(p.f)];
  };
  const say = (name: string, text: string, ms = 3200) => {
    const el = bubbleRefs.current.get(name);
    if (!el) return;
    el.textContent = text;
    el.classList.add("show");
    busyUntil.current.set(name, performance.now() + ms);
    window.setTimeout(() => el.classList.remove("show"), ms);
  };

  // ── 출근/근무/자유시간/퇴근 ──
  useEffect(() => {
    modeRef.current = mode;
    // walkers(실제 위치)를 먼저 고친 뒤 화면에 그릴 목록을 그대로 따라가게 합니다 —
    // setState 갱신 함수 안에서 walkers를 고치면 개발 모드(StrictMode)가 그 함수를 두 번
    // 불러서 두 번째에 "이미 있음"으로 처리돼 아무도 안 나타나는 문제가 있었습니다.
    // 내보낸 식구는 걷는 목록에서도 빼기
    const names = new Set(ROSTER.map((s) => s.name));
    [...walkers.current.keys()].forEach((k) => { if (!names.has(k)) walkers.current.delete(k); });
    ROSTER.forEach((staff) => {
      const key = staff.name;
      const w = walkers.current.get(key);
      // alwaysPresent 식구는 항상 있고, 나머지는 출근하면 나타나 퇴근하면 나감
      const stay = staff.alwaysPresent || mode !== "off";
      if (!stay) {
        if (!w) return;
        if (commuteRef.current === "skip") {
          walkers.current.delete(key);
        } else {
          w.leaving = true;
          w.path = route(w, DOOR);
        }
        return;
      }
      if (!w) {
        // 페이지를 막 연 직후(시간 따라 자동 출근)엔 현관부터 걸어오지 않고 바로 자리에 있게
        const justOpened = performance.now() - mountedAt.current < 2000;
        const atHome = staff.alwaysPresent || commuteRef.current === "skip" || justOpened;
        const [x, y] = atHome ? homeOf(key) : DOOR;
        walkers.current.set(key, {
          x, y, path: atHome ? [] : route({ x, y }, homeOf(key)), facing: "down", moving: false,
          leaving: false, arriving: !atHome, pauseUntil: 0,
        });
      } else {
        w.leaving = false;
        w.path = [];
        w.pauseUntil = 0;
      }
    });
    setPresent(new Set(walkers.current.keys()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // 방 자리를 바꾸면 그 방 식구들도 새 자리로 옮겨갑니다(잠깐 미끄러지듯)
  const prevLayout = useRef(layout);
  useEffect(() => {
    if (prevLayout.current === layout) return;
    prevLayout.current = layout;
    setMoving(true);
    walkers.current.forEach((w, name) => {
      const [x, y] = homeOf(name);
      w.x = x; w.y = y; w.path = []; w.facing = "down";
    });
    const t = window.setTimeout(() => setMoving(false), 700);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  // ── 말풍선: 혼잣말(직원마다 자기 대사) ──
  useEffect(() => {
    const timers: number[] = [];
    ROSTER.forEach((staff) => {
      const speak = () => {
        if (performance.now() >= (busyUntil.current.get(staff.name) ?? 0) && walkers.current.has(staff.name)) {
          const lines = staff.thoughts.length ? staff.thoughts : ["오늘도 화이팅!"];
          say(staff.name, lines[Math.floor(Math.random() * lines.length)]);
        }
        timers.push(window.setTimeout(speak, 18000 + Math.random() * 9000));
      };
      timers.push(window.setTimeout(speak, 2000 + Math.random() * 10000));
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 걷기 루프 ──
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const pets = PETS.map((p) => ({ x: p.x, tx: 0, wait: Math.random() * 3 }));
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const gone: string[] = [];
      ROSTER.forEach((staff) => {
        const key = staff.name;
        const w = walkers.current.get(key);
        if (!w) return;
        const m = staff.alwaysPresent && modeRef.current === "off" ? "work" : modeRef.current;
        if (w.path.length === 0) {
          if (w.leaving) {
            gone.push(key);
            return;
          }
          if (now >= w.pauseUntil) {
            if (m === "free") {
              w.path = route(w, randomSpot());
            } else {
              const [hx, hy] = homeOf(key);
              if (Math.abs(hx - w.x) > 1 || Math.abs(hy - w.y) > 1) w.path = route(w, [hx, hy]);
              else w.pauseUntil = now + 1500;
            }
          }
        }
        w.moving = false;
        if (w.path.length > 0) {
          const t = w.path[0];
          const dx = t.x - w.x;
          const dy = t.y - w.y;
          const d = Math.hypot(dx, dy);
          const speed = w.leaving || w.arriving ? COMMUTE_SPEED * (commuteRef.current === "fast" ? COMMUTE_FAST : 1) : SPEED;
          const step = speed * dt;
          if (Math.abs(dx) > 0.5) w.facing = dx > 0 ? "right" : "left";
          if (d <= step) {
            w.x = t.x; w.y = t.y; w.path.shift();
            if (w.path.length === 0) {
              w.arriving = false;
              w.pauseUntil = now + (m === "free" ? 2000 + Math.random() * 4000 : 1500);
            }
          } else {
            w.x += (dx / d) * step;
            w.y += (dy / d) * step;
            w.moving = true;
          }
        }
        const working = m === "work" && !w.leaving && w.path.length === 0;
        if (!w.moving && w.path.length === 0 && w.facing !== "right" && w.facing !== "left") w.facing = "down";
        if (working) w.facing = "down";
        const el = elRefs.current.get(key);
        if (el) {
          el.style.transform = `translate3d(${w.x}px, ${w.y}px, 0)`;
          const cls = `staff f-${w.facing}${w.moving ? " walking" : ""}${working ? " working" : ""}${STAFF_HOME[key]?.tagUp ? " tag-up" : ""}${staff.halo ? " halo" : ""}`;
          if (el.className !== cls) el.className = cls;
        }
      });
      if (gone.length) {
        gone.forEach((k) => walkers.current.delete(k));
        setPresent(new Set(walkers.current.keys()));
      }

      // 가까이 마주친 두 사람(같은 층)끼리 짧은 대화
      const free = [...walkers.current.entries()].filter(
        ([k]) => now >= (busyUntil.current.get(k) ?? 0) && now >= (chatCooldown.current.get(k) ?? 0),
      );
      outer: for (let a = 0; a < free.length; a += 1) {
        for (let b = a + 1; b < free.length; b += 1) {
          const [ka, wa] = free[a];
          const [kb, wb] = free[b];
          if (Math.abs(wa.y - wb.y) > 4 || Math.abs(wa.x - wb.x) > 34) continue;
          const pr = CHAT_PROMPTS[Math.floor(Math.random() * CHAT_PROMPTS.length)];
          [ka, kb].forEach((k) => chatCooldown.current.set(k, now + 50000 + Math.random() * 40000));
          say(ka, pr.ask, 2200);
          busyUntil.current.set(kb, now + 5200);
          window.setTimeout(() => say(kb, pr.reply, 2600), 2700);
          break outer;
        }
      }

      // 반려동물 — 현관 안에서만 왔다 갔다
      pets.forEach((p, i) => {
        const el = petRefs.current[i];
        if (!el) return;
        if (p.wait > 0) p.wait -= dt;
        else {
          if (!p.tx) p.tx = 26 + Math.random() * 176;
          const dx = p.tx - p.x;
          const step = 40 * dt;
          el.classList.toggle("f-left", dx < 0);
          el.classList.toggle("walking", true);
          if (Math.abs(dx) <= step) { p.x = p.tx; p.tx = 0; p.wait = 1 + Math.random() * 3; el.classList.remove("walking"); }
          else p.x += Math.sign(dx) * step;
        }
        el.style.transform = `translate3d(${p.x}px, ${RH}px, 0)`;
      });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 방 이름표: 평소엔 가까이 보기, 자리 바꾸기 중엔 두 방을 차례로 골라 맞바꿈 ──
  const onPlate = (id: string) => {
    if (!swapMode) {
      setZoomed((z) => (z === id ? null : id));
      return;
    }
    if (!swapFirst) return setSwapFirst(id);
    if (swapFirst === id) return setSwapFirst(null);
    const a = ROOM_BY_ID.get(swapFirst)!;
    const b = ROOM_BY_ID.get(id)!;
    if (a.w !== b.w) {
      setSwapFirst(null);
      return;
    }
    onSwap(swapFirst, id);
    setSwapFirst(null);
    setSwapMode(false);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else frameRef.current?.requestFullscreen().catch(() => {});
  };

  const night = time === "night";
  const warm = night ? 1 : time === "evening" ? 0.5 : 0;
  const sunStyle: CSSProperties = {
    left: time === "night" ? houseBox.x + 160 : time === "morning" ? houseBox.x + 120 : houseBox.x + houseBox.w - 180,
    top: time === "morning" || time === "evening" ? houseBox.y + 90 : houseBox.y + 34,
  };
  const swapHint = swapFirst
    ? `${ROOM_BY_ID.get(swapFirst)?.name}와 바꿀 방 이름을 눌러요 (같은 크기 방끼리만)`
    : "자리를 바꿀 방 이름을 두 개 차례로 눌러요";

  return (
    <div className="world-frame house-frame" ref={frameRef}>
      <OfficeWindow />

      <div className="world-toolbar house-toolbar">
        <div className="house-rooms" role="group" aria-label="방 바로가기">
          {!narrow ? (
            <button type="button" className={zoomed === null ? "on" : ""} onClick={() => setZoomed(null)}>
              🏠 집 전체
            </button>
          ) : null}
          {[...rooms]
            .sort((a, b) => layout.pos[a.id].f - layout.pos[b.id].f || layout.pos[a.id].i - layout.pos[b.id].i)
            .map((r) => (
              <button
                key={r.id}
                type="button"
                className={zoomed === r.id ? "on" : ""}
                onClick={() => setZoomed((z) => (z === r.id ? null : r.id))}
              >
                {r.icon} {r.name}
              </button>
            ))}
        </div>
        {narrow && layout.floors > 1 ? (
          <div className="house-floors" role="group" aria-label="층 이동">
            {Array.from({ length: layout.floors }, (_, k) => layout.floors - 1 - k).map((f) => (
              <button key={f} type="button" className={curFloor === f ? "on" : ""} onClick={() => goFloor(f)}>
                {f + 1}층
              </button>
            ))}
          </div>
        ) : null}
        <div className="house-tools">
          <button type="button" className={swapMode ? "on" : ""} onClick={() => { setSwapMode((s) => !s); setSwapFirst(null); setZoomed(null); }}>
            ⇄ 방 자리 바꾸기
          </button>
          {fullscreenSupported ? <button type="button" onClick={toggleFullscreen}>{isFullscreen ? "⛶ 나가기" : "⛶ 전체화면"}</button> : null}
        </div>
      </div>

      <div className={`world-viewport house-viewport${narrow ? " narrow" : ""}`} ref={viewportRef} onScroll={onViewportScroll} style={narrow || isFullscreen ? undefined : { aspectRatio: String(viewAspect) }}>
        <div className="house-clip" ref={clipRef}>
        <div
          className={`house-stage${zoomed && !narrow ? " zoomed" : ""}${ROSTER.length > 6 ? " crowded" : ""}${swapMode ? " swap" : ""}${moving ? " moving" : ""}`}
          ref={stageRef}
          style={{ width: WORLD_W, height: WORLD_H }}
        >
          <div className="hz-sky" style={{ background: band(SKY[time]) }} />
          <div className={`hz-sun${night ? " moon" : time === "evening" ? " dusk" : ""}`} style={sunStyle} />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="hz-cloud" style={{ left: houseBox.x + houseBox.w * (0.12 + i * 0.24), top: houseBox.y + 30 + (i % 2) * 34, opacity: night ? 0.15 : 0.9 }} />
          ))}
          {night
            ? Array.from({ length: 26 }, (_, i) => (
                <div key={i} className="hz-star" style={{ left: houseBox.x + ((i * 397) % houseBox.w), top: houseBox.y + ((i * 211) % 260) }} />
              ))
            : null}
          <div className="hz-ground" style={{ top: GY + 8 }} />
          <div className="hz-path" style={{ left: X0 - 200, top: GY + 8, width: 200 }} />
          <Tree src="win-tree-a" x={X0 - 150} w={58} />
          <Tree src="win-tree-d" x={X0 - 90} w={44} />
          <Tree src="win-tree-b" x={Math.max(houseRight, bx(layout.next.i + 1)) + 20} w={46} />
          <Tree src="win-tree-e" x={Math.max(houseRight, bx(layout.next.i + 1)) + 80} w={58} />
          <div className="hz-outshade" style={{ background: OUTSHADE[time] }} />

          <Structure layout={layout} rooms={rooms} />

          {rooms.map((room) => (
            <RoomView
              key={room.id}
              room={room}
              layout={layout}
              warm={warm}
              night={night}
              sky={band(SKY[time])}
              selected={swapFirst === room.id}
              onPlate={() => onPlate(room.id)}
              petRefs={petRefs}
            />
          ))}

          {layout.next ? (
            <div className="hz-ghost" style={{ left: bx(layout.next.i), top: fy(layout.next.f + 1) + 10, width: BW, height: RH }}>
              <span>다음 방 자리</span>
            </div>
          ) : null}

          <div className="hz-people">
            {ROSTER.map((staff) => {
              if (!present.has(staff.name)) return null;
              const w = walkers.current.get(staff.name);
              const lpc = staff.lpc ? (appearanceOverrides?.[staff.name] ?? staff.lpc) : null;
              return (
                <button
                  key={staff.name}
                  type="button"
                  ref={(el) => { if (el) elRefs.current.set(staff.name, el); else elRefs.current.delete(staff.name); }}
                  className="staff f-down"
                  style={{ transform: `translate3d(${w?.x ?? DOOR[0]}px, ${w?.y ?? DOOR[1]}px, 0)` }}
                  onClick={() => onPerson(staff)}
                  aria-label={`${staff.role ?? staff.name} 식구 카드`}
                >
                  {lpc ? <LpcSprite config={lpc} /> : null}
                  <div className="st-tag">
                    <b>{staff.role ?? staff.name}</b>
                  </div>
                  <div className="st-bubble" ref={(el) => { if (el) bubbleRefs.current.set(staff.name, el); else bubbleRefs.current.delete(staff.name); }} />
                </button>
              );
            })}
          </div>
        </div>
        </div>

        <SeasonalTheme />
        <div className={`world-hint house-hint${swapMode ? " swap" : ""}`}>
          {swapMode ? swapHint : "방 이름을 누르면 가까이 봐요"}
        </div>
      </div>
    </div>
  );
}

function Tree({ src, x, w }: { src: string; x: number; w: number }) {
  return (
    <div className="hz-tree" style={{ left: x, top: GY + 12 - w }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/kenney/${src}.png`} alt="" style={{ width: w }} />
    </div>
  );
}

/** 바닥판·벽·계단·지붕 — 방 배치가 바뀔 때만 다시 그립니다 */
const Structure = memo(function Structure({ layout, rooms }: { layout: HouseLayout; rooms: HouseRoom[] }) {
  const parts: { cls: string; x: number; y: number; w: number; h: number }[] = [];
  const add = (cls: string, x: number, y: number, w: number, h: number) => parts.push({ cls, x, y, w, h });
  const topY = fy(layout.floors);
  add("hz-shaftbg", X0, topY + 10, SW, GY - topY - 10);
  for (let f = 0; f < layout.floors - 1; f += 1) {
    for (let k = 0; k < 10; k += 1) add("hz-step", X0 + 8 + k * 6.4, fy(f) - (k + 1) * 15, SW - 14 - k * 6.4, 15);
  }
  for (let f = 0; f <= layout.floors; f += 1) add("hz-slab", X0 - 6, fy(f), SW + 6, 10);
  const colTop = Array(layout.width).fill(-1) as number[];
  const lastOnFloor: Record<number, HouseRoom> = {};
  for (const room of rooms) {
    const p = layout.pos[room.id];
    add("hz-slab", bx(p.i), fy(p.f), room.w * BW, 10);
    add("hz-slab", bx(p.i), fy(p.f + 1), room.w * BW, 10);
    add("hz-wall", bx(p.i) - 4, fy(p.f + 1) + 10, 8, RH - 66);
    for (let c = p.i; c < p.i + room.w; c += 1) colTop[c] = Math.max(colTop[c], p.f);
    const cur = lastOnFloor[p.f];
    if (!cur || p.i > layout.pos[cur.id].i) lastOnFloor[p.f] = room;
  }
  for (const room of Object.values(lastOnFloor)) {
    const p = layout.pos[room.id];
    add("hz-wall", bx(p.i + room.w) - 6, fy(p.f + 1), 12, FH + 10);
  }
  add("hz-wall", X0 - 12, topY, 12, GY - topY + 10);
  add("hz-roof", X0 - 14, topY - 20, SW + 20, 20);
  colTop.forEach((f, c) => {
    if (f >= 0) add(c % 2 ? "hz-roof o" : "hz-roof", bx(c) - 6, fy(f + 1) - 20, BW + 12, 20);
  });
  if (colTop[0] >= 0) add("hz-chimney", bx(0) + 40, fy(colTop[0] + 1) - 44, 18, 26);
  add("hz-frontdoor", X0 - 14, GY - 74, 16, 74);
  return (
    <div className="hz-struct">
      {parts.map((p, i) => (
        <div key={i} className={p.cls} style={{ left: p.x, top: p.y, width: p.w, height: p.h }} />
      ))}
    </div>
  );
});

function RoomView({
  room,
  layout,
  warm,
  night,
  sky,
  selected,
  onPlate,
  petRefs,
}: {
  room: HouseRoom;
  layout: HouseLayout;
  warm: number;
  night: boolean;
  sky: string;
  selected: boolean;
  onPlate: () => void;
  petRefs: React.MutableRefObject<(HTMLElement | null)[]>;
}) {
  const box = roomBox(layout, room);
  const W = room.w * BW;
  return (
    <div className="hz-room" style={{ left: box.x, top: box.y, width: W, height: RH }}>
      <div className="hz-backwall" style={{ background: room.color }} />
      <div className="hz-window" style={{ left: W - 66, background: night ? "#ffcf7a" : sky }} />
      {room.kind === "entrance" ? <div className="hz-mat" style={{ left: 8, width: 70 }} /> : null}

      {PETS.map((p, i) =>
        p.room === room.id ? (
          <div
            key={i}
            className="pet hz-pet"
            ref={(el) => { petRefs.current[i] = el; }}
            onClick={(e) => {
              const pop = e.currentTarget.querySelector<HTMLElement>(".pet-reaction");
              if (!pop) return;
              const list = PET_REACTIONS[p.kind];
              pop.textContent = list[Math.floor(Math.random() * list.length)];
              pop.classList.remove("show");
              void pop.offsetWidth;
              pop.classList.add("show");
            }}
          >
            <PetSprite kind={p.kind} color={p.color} />
            <span className="pet-reaction" aria-hidden="true" />
          </div>
        ) : null,
      )}

      <div className="hz-warm" style={{ opacity: warm }} />
      <button type="button" className={`hz-plate${selected ? " sel" : ""}`} onClick={onPlate}>
        {room.icon} {room.name}
      </button>
    </div>
  );
}

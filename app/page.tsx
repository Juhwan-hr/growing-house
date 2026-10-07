"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import HousePanel from "./components/HousePanel";
import HouseLegend from "./components/HouseLegend";
import CommandPalette from "./components/CommandPalette";
import ReminderModal from "./components/ReminderModal";
import TodoModal from "./components/TodoModal";
import AvatarCustomizerModal from "./components/AvatarCustomizerModal";
import AvatarBatchModal from "./components/AvatarBatchModal";
import NoteBar from "./components/NoteBar";
import type { NoteRoute } from "./game/noteRoute";
import { kstDate, useHouseLog, type HouseLogEntry } from "./components/useHouseLog";
import { fetchShared, putShared } from "./components/houseState";
import { useStaffAppearance } from "./components/useStaffAppearance";
import { useReminders, type Reminder } from "./components/useReminders";
import { useTodos } from "./components/useTodos";
import ModeSwitcher from "./components/ModeSwitcher";
import LiveClock from "./components/LiveClock";
import HouseWorld, { type CommuteMode, type HouseSignals, type ItemChip, type OfficeMode } from "./game/HouseWorld";
import { applyRoster, computeLayout, HOUSE_ROOMS, normalizeOrder, ROOM_BY_ID, ROSTER, STAFF_HOME, ZONE_LIST, type RosterExtras } from "./game/house";
import { COMPANY, CREDIT, type StaffEntry } from "../company.config";
import StaffManagerModal from "./components/StaffManagerModal";

/** 방 자리 바꾸기 결과의 이 기기 캐시(공용 저장소 "house_order"가 기준) */
const HOUSE_ORDER_KEY = "office_house_order";

/** 한국 시간 기준 "HH:MM" (24시간제) — 리마인더 시각과 비교하는 용도 */
function nowHHMM(): string {
  return new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" });
}

/** 로고를 짧은 시간 안에 여러 번 클릭하면 뜨는 숨겨진 반응 */
const CONFETTI_EMOJI = ["🎉", "✨", "💚", "💙", "🎊", "⭐"];
const CONFETTI_CLICKS = 5;
const CONFETTI_WINDOW_MS = 2500;
const CONFETTI_DURATION_MS = 1600;

/** 출퇴근 애니메이션 속도 버튼을 누를 때마다 이 순서대로 돌아갑니다 */
const COMMUTE_MODES: { value: CommuteMode; label: string }[] = [
  { value: "normal", label: "🚶 출퇴근: 보통" },
  { value: "fast", label: "⏩ 출퇴근: 빠르게" },
  { value: "skip", label: "⏭️ 출퇴근: 건너뛰기" },
];

/** 한국 시간 기준으로 오피스를 연 날(COMPANY.openedAt)부터 오늘까지 며칠째인지 계산 (연 날 = 1일째) */
function daysSinceOpened(): number {
  const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const today = new Date(`${todayStr}T00:00:00+09:00`);
  const opened = new Date(`${COMPANY.openedAt}T00:00:00+09:00`);
  return Math.floor((today.getTime() - opened.getTime()) / 86400000) + 1;
}

export default function Home() {
  const [mode, setMode] = useState<OfficeMode>("off");
  const { items: localLog, addLog } = useHouseLog();
  const pickMode = (m: OfficeMode) => {
    if (m !== mode) {
      if (m === "work") addLog("🚪", mode === "off" ? "식구들이 출근했어요" : "다시 근무 시작이에요");
      else if (m === "free") addLog("🚶", "자유시간이에요. 다들 집 안을 돌아다녀요");
      else addLog("🌙", "식구들이 퇴근했어요");
    }
    setMode(m);
  };
  const [batchOpen, setBatchOpen] = useState(false);
  // ── 식구 명단(2026-10-07) — 화면에서 들인 식구·새 방·기존 식구 수정을 공용 저장소에서 불러와 합칩니다 ──
  const [rosterExtras, setRosterExtras] = useState<RosterExtras>({ staff: [], zones: [], edits: {} });
  const [rosterVersion, setRosterVersion] = useState(0);
  const [rosterShared, setRosterShared] = useState(false);
  const [staffManagerOpen, setStaffManagerOpen] = useState(false);
  const applyExtras = (x: RosterExtras) => {
    applyRoster(x);
    setRosterExtras(x);
    setRosterVersion((v) => v + 1);
    setOrder((o) => normalizeOrder(o));
  };
  useEffect(() => {
    (async () => {
      const [staff, zones, edits] = await Promise.all([
        fetchShared<StaffEntry[]>("custom_staff"),
        fetchShared<RosterExtras["zones"]>("custom_zones"),
        fetchShared<RosterExtras["edits"]>("staff_edits"),
      ]);
      setRosterShared(staff.ok && zones.ok && edits.ok);
      if (!staff.ok) return;
      applyExtras({
        staff: Array.isArray(staff.value) ? staff.value : [],
        zones: Array.isArray(zones.value) ? zones.value : [],
        edits: edits.value && typeof edits.value === "object" ? edits.value : {},
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const saveRoster = async (next: RosterExtras, password?: string) => {
    // 바뀐 것만 저장(첫 저장에서 비밀번호를 맞추면 이 기기에 기억돼서 나머지는 그걸로)
    const jobs: [string, unknown, unknown][] = [
      ["custom_zones", next.zones, rosterExtras.zones],
      ["staff_edits", next.edits, rosterExtras.edits],
      ["custom_staff", next.staff, rosterExtras.staff],
    ];
    let pw = password;
    for (const [key, value, prev] of jobs) {
      if (JSON.stringify(value) === JSON.stringify(prev)) continue;
      await putShared(key, { value }, pw);
      pw = undefined;
    }
    const added = next.staff.filter((s) => !rosterExtras.staff.some((x) => x.name === s.name));
    added.forEach((s) => addLog("🏠", `${s.role ?? s.name}(${s.name})가 새 식구로 이사 왔어요`));
    applyExtras(next);
  };
  // 쪽지 한 줄 — 집 안 장면(게시판에서 떼어 가기)
  const [note, setNote] = useState<{ id: number; who: string; text: string; reply: string } | null>(null);
  // 알림이 "곧"(1시간 안)인지처럼 시각에 따라 바뀌는 표시를 위해 1분마다 다시 그림
  const [, setMinuteTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setMinuteTick((n) => n + 1), 60 * 1000);
    return () => window.clearInterval(t);
  }, []);
  const [greet, setGreet] = useState<{ id: number } | null>(null);
  const [alarm, setAlarm] = useState<{ id: number; text: string } | null>(null);
  const [commuteModeIndex, setCommuteModeIndex] = useState(0);
  const commuteMode = COMMUTE_MODES[commuteModeIndex];
  const [activeAction, setActiveAction] = useState<StaffEntry["action"] | null>(null);
  const [customizingStaff, setCustomizingStaff] = useState<StaffEntry | null>(null);
  const { overrides: appearanceOverrides, needsPassword: appearanceNeedsPassword, saveAppearance } =
    useStaffAppearance();
  const [showConfetti, setShowConfetti] = useState(false);
  const [capturing, setCapturing] = useState(false);
  // 캡처 버튼을 눌러도 성공/실패 여부를 알 방법이 없다는 피드백을 반영 — 저장(다운로드)
  // 또는 공유 시트가 뜬 직후 잠깐 "저장했어요" 상태로 버튼 라벨을 바꿔서 결과를 알려줍니다.
  const [shareResult, setShareResult] = useState<"idle" | "done" | "failed">("idle");
  const [daysTogether, setDaysTogether] = useState<number | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [reaction, setReaction] = useState<{ id: number; name: string; text: string } | null>(null);
  const reactionIdRef = useRef(0);
  // 모달에서 실제로 뭔가 성공했을 때(할 일 추가·알림 등) 그 직원의
  // 말풍선에 결과를 잠깐 띄웁니다 — 말풍선이 랜덤 로테이션이라 실제 상태와 무관하다는
  // 피드백을 반영했습니다.
  const triggerReaction = (name: string, text: string) => {
    reactionIdRef.current += 1;
    setReaction({ id: reactionIdRef.current, name, text });
  };
  const logoClickTimes = useRef<number[]>([]);

  // ── 자라는 집(2026-10-02) ──
  // 방 순서(= 어느 방이 어디 붙는지). "방 자리 바꾸기" 결과는 공용 저장소("house_order")에 둬서
  // 어느 기기에서나 같습니다(2026-10-07). 이 기기 localStorage는 열자마자 보여주는 캐시이자,
  // 공용 저장소가 없을 때의 저장소입니다.
  const [order, setOrder] = useState<string[]>(() => normalizeOrder(null));
  const orderShared = useRef(false);
  /** 공용 저장소에 못 올린(비밀번호 없음 등) 자리 바꾸기가 있으면, 서버 값으로 덮어쓰지 않음 */
  const orderLocalOnly = useRef(false);
  useEffect(() => {
    let local: string[] | null = null;
    try {
      const saved = localStorage.getItem(HOUSE_ORDER_KEY);
      if (saved) {
        local = JSON.parse(saved);
        setOrder(normalizeOrder(local));
      }
    } catch {
      /* 저장된 순서가 없거나 읽을 수 없으면 기본 순서 그대로 */
    }
    const load = async () => {
      const res = await fetchShared<string[]>("house_order");
      orderShared.current = res.ok;
      if (!res.ok || orderLocalOnly.current) return;
      if (Array.isArray(res.value)) {
        setOrder(normalizeOrder(res.value));
        try {
          localStorage.setItem(HOUSE_ORDER_KEY, JSON.stringify(res.value));
        } catch {
          /* noop */
        }
      } else if (local) {
        // 공용 저장소를 처음 쓰는 날 — 이 기기에서 바꿔둔 배치를 올려둠(비밀번호가 기억돼 있을 때만)
        putShared("house_order", { value: local }).catch(() => {});
      }
    };
    load();
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
  const layout = useMemo(() => computeLayout(order), [order]);
  const swapRooms = (a: string, b: string) => {
    const [ra, rb] = [ROOM_BY_ID.get(a), ROOM_BY_ID.get(b)];
    if (ra && rb) addLog("⇄", `${ra.name} ↔ ${rb.name} 자리를 바꿨어요`);
    const next = [...order];
    const ia = next.indexOf(a);
    const ib = next.indexOf(b);
    [next[ia], next[ib]] = [next[ib], next[ia]];
    setOrder(next);
    try {
      localStorage.setItem(HOUSE_ORDER_KEY, JSON.stringify(next));
    } catch {
      /* 기억은 못 해도 지금 화면에는 반영 */
    }
    if (orderShared.current) {
      putShared("house_order", { value: next }).catch(() => {
        orderLocalOnly.current = true;
      });
    }
  };
  const [person, setPerson] = useState<StaffEntry | null>(null);
  const [zoomRequest, setZoomRequest] = useState<{ id: number; room: string } | null>(null);
  const [water, setWater] = useState<{ id: number; who: string } | null>(null);

  const { reminders, addReminder, removeReminders, shared: remindersShared, needsPassword: reminderNeedsPassword } = useReminders();
  const [dueReminders, setDueReminders] = useState<Reminder[]>([]);
  const {
    todos,
    listError: todoListError,
    needsPassword: todoNeedsPassword,
    hiddenCompletedByCategory: todoHiddenByCategory,
    notionDatabaseUrl: todoNotionUrl,
    addTodo,
    toggleTodo,
    editTodo,
    removeTodo,
  } = useTodos();

  // Ctrl/Cmd+K로 직원 검색 팔레트를 엽니다 — 직원이 계속 늘어날 예정이라, 방을
  // 일일이 찾아다니지 않고 이름을 쳐서 바로 링크·입력창으로 이동할 수 있게 합니다.
  // 다른 입력창(할 일·알림)이 이미 떠 있으면 겹쳐 뜨지 않게 무시합니다.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (!activeAction) setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeAction]);

  // 브라우저 알림 권한 — 리마인더를 하나라도 등록해두면 슬쩍 요청합니다 (탭이 백그라운드여도 알림이 뜨도록)
  useEffect(() => {
    if (reminders.length > 0 && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, [reminders.length]);

  // 15초마다 등록된 할 일 중 시각이 된 게 있는지 확인합니다 (오피스 탭이 열려있는 동안만 동작)
  useEffect(() => {
    const check = () => {
      const now = nowHHMM();
      const due = reminders.filter((r) => r.time <= now);
      if (due.length === 0) return;
      setDueReminders((prev) => [...prev, ...due]);
      setAlarm({ id: Date.now(), text: due.map((r) => r.text).join(", ") });
      due.forEach((r) => addLog("⏰", `${r.time} "${r.text}" 알림이 울렸어요`));
      removeReminders(due.map((r) => r.id));
      if ("Notification" in window && Notification.permission === "granted") {
        due.forEach((r) => new Notification("⏰ 할 일 시간이에요", { body: r.text }));
      }
    };
    check();
    const timer = window.setInterval(check, 15000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reminders, removeReminders]);

  const confettiPieces = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        emoji: CONFETTI_EMOJI[i % CONFETTI_EMOJI.length],
        style: {
          "--l": `${Math.random() * 100}%`,
          "--dur": `${0.9 + Math.random() * 0.6}s`,
          "--delay": `${Math.random() * 0.25}s`,
          "--rot": `${Math.random() * 360}deg`,
        } as CSSProperties,
      })),
    [showConfetti],
  );

  const onShareSnapshot = async () => {
    const node = document.querySelector<HTMLElement>(".world-frame");
    if (!node || capturing) return;
    setCapturing(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(node, { backgroundColor: null, scale: 2 });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) {
        setShareResult("failed");
        return;
      }
      const fileName = `my-house-${new Date().toISOString().slice(0, 10)}.png`;
      const file = new File([blob], fileName, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: COMPANY.pageTitle });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
      // 캡처 버튼을 눌러도 성공했는지 알 방법이 없다는 피드백을 반영 — 완료되면 버튼
      // 라벨을 잠깐 바꿔서 결과를 알려줍니다.
      setShareResult("done");
      window.setTimeout(() => setShareResult("idle"), 2500);
    } catch (err) {
      // AbortError는 사용자가 공유 시트를 직접 취소한 경우라 실패로 안 보여줍니다
      if (err instanceof DOMException && err.name === "AbortError") return;
      setShareResult("failed");
      window.setTimeout(() => setShareResult("idle"), 2500);
    } finally {
      setCapturing(false);
    }
  };

  const onLogoClick = () => {
    const now = Date.now();
    logoClickTimes.current = [...logoClickTimes.current.filter((t) => now - t < CONFETTI_WINDOW_MS), now];
    if (logoClickTimes.current.length >= CONFETTI_CLICKS) {
      logoClickTimes.current = [];
      setShowConfetti(true);
      window.setTimeout(() => setShowConfetti(false), CONFETTI_DURATION_MS);
    }
  };

  useEffect(() => {
    const update = () => setDaysTogether(daysSinceOpened());
    update();
    const timer = window.setInterval(update, 30 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  // 할 일을 체크하면(끝내면) 담당 직원이 거실 화분에 물을 주러 갑니다
  const onToggleTodo = async (id: string, password?: string) => {
    const before = todos.find((t) => t.id === id);
    await toggleTodo(id, password);
    if (before && !before.done) {
      setWater({ id: Date.now(), who: before.category === "업무" ? "일감이" : "짬짬이" });
    }
  };

  const badges: Record<string, { count: number; label: string }> = {};
  if (reminders.length > 0) {
    badges["박일해"] = { count: reminders.length, label: `오늘 남은 할 일 ${reminders.length}건` };
  }
  const workTodosRemaining = todos.filter((t) => !t.done && t.category === "업무").length;
  if (workTodosRemaining > 0) {
    badges["일감이"] = { count: workTodosRemaining, label: `안 끝난 업무 ${workTodosRemaining}개` };
  }
  const personalTodosRemaining = todos.filter((t) => !t.done && t.category === "개인").length;
  if (personalTodosRemaining > 0) {
    badges["짬짬이"] = { count: personalTodosRemaining, label: `안 끝난 개인 할 일 ${personalTodosRemaining}개` };
  }

  // 집 안 물건 위에 띄우는 실제 숫자
  const workLeft = todos.filter((t) => !t.done && t.category === "업무").length;
  const personalLeft = todos.filter((t) => !t.done && t.category === "개인").length;
  const todoCounts = { work: workLeft, personal: personalLeft, done: todos.filter((t) => t.done).length, total: todos.length };
  const nextReminder = reminders.length ? [...reminders].sort((a, b) => a.time.localeCompare(b.time))[0] : null;
  const chips: Record<string, ItemChip> = {
    박일해: { text: nextReminder ? `다음 ${nextReminder.time}` : "알림 없음" },
    일감이: { text: `남은 일 ${workLeft}`, tone: workLeft ? "alert" : "good" },
    짬짬이: { text: `남은 일 ${personalLeft}`, tone: personalLeft ? "alert" : "good" },
  };

  const signals: HouseSignals = {
    workLeft,
    personalLeft,
    nextReminder: nextReminder ? { time: nextReminder.time, text: nextReminder.text } : null,
  };

  // 방 이름표 불 — 손볼 일이 있는 식구의 방(전부 실제 데이터, 숫자가 0이면 안 켜짐)
  const nowMin = (() => { const [h, m] = nowHHMM().split(":").map(Number); return h * 60 + m; })();
  const staffAlerts: [string, string][] = [];
  if (workLeft) staffAlerts.push(["일감이", `남은 업무 ${workLeft}개`]);
  if (personalLeft) staffAlerts.push(["짬짬이", `개인 할 일 ${personalLeft}개`]);
  if (nextReminder) {
    const [h, m] = nextReminder.time.split(":").map(Number);
    if (h * 60 + m - nowMin <= 60) staffAlerts.push(["박일해", `${nextReminder.time} 알림이 곧이에요`]);
  }
  const roomAlerts: Record<string, string[]> = {};
  for (const [name, why] of staffAlerts) {
    const room = STAFF_HOME[name]?.room;
    if (room) (roomAlerts[room] ??= []).push(why);
  }

  // 오늘 집에서 있었던 일 — 할 일은 서버 기록(등록·완료 시각)에서, 나머지는 이 기기 기록에서
  const today = kstDate();
  const short = (t: string) => (t.length > 22 ? `${t.slice(0, 21)}…` : t);
  const todoLog: HouseLogEntry[] = todos.flatMap((t) => {
    const who = t.category === "업무" ? "일감이" : "짬짬이";
    const out: HouseLogEntry[] = [];
    const created = t.created_at ? Date.parse(t.created_at) : NaN;
    if (!Number.isNaN(created) && kstDate(created) === today) out.push({ t: created, icon: "📋", text: `${who} 수첩에 "${short(t.text)}" 적었어요`, shared: true });
    const done = t.completed_at ? Date.parse(t.completed_at) : NaN;
    if (t.done && !Number.isNaN(done) && kstDate(done) === today) out.push({ t: done, icon: "✅", text: `${who}가 "${short(t.text)}" 끝냈어요`, shared: true });
    return out;
  });
  const houseLog = [...localLog, ...todoLog].sort((a, b) => b.t - a.t);
  const lpcStaff = ROSTER.filter((s) => s.lpc);

  // 집 안에서 식구나 물건을 누르면 식구 카드를 띄우되, 입력창이 있는 식구(할 일·알림)는
  // 입력창도 바로 엽니다 — 카드 → "입력창 열기"를 한 번 더 누르는 게 번거롭다는 피드백(2026-10-06).
  // 창을 닫으면 뒤에 식구 카드(모습 바꾸기 등)가 그대로 있습니다.
  const onPersonClick = (staff: StaffEntry) => {
    setPerson(staff);
    if (staff.action) setActiveAction(staff.action);
  };

  // 쪽지 붙이기 — 할 일·알림으로 바로 저장하고, 저장된 뒤에 게시판에 붙습니다.
  const postNote = async (text: string, r: NoteRoute, password?: string): Promise<string> => {
    const pin = () => setNote({ id: Date.now(), who: r.who, text, reply: r.reply });
    if (r.kind === "todo-work" || r.kind === "todo-personal") {
      await addTodo(text, r.kind === "todo-work" ? "업무" : "개인", password);
      pin();
      return `✅ ${r.who}가 ${r.kind === "todo-work" ? "업무" : "개인"} 할 일에 적었어요: "${short(text)}"`;
    }
    if (r.kind === "reminder" && r.time) {
      await addReminder(r.time, text, password);
      pin();
      addLog("📌", `쪽지 → 박일해가 ${r.time} "${short(text)}" 알림을 적어뒀어요`);
      return `✅ 박일해가 오늘 ${r.time}에 알려드릴게요`;
    }
    throw new Error("이 쪽지는 맡을 식구가 없어요.");
  };

  return (
    <main className="page-shell">
      <ModeSwitcher />
      <div className="wrap">
        <div className="house-top">
          <div className="tile t-brand" onClick={onLogoClick}>
            <div className="badge">{COMPANY.logoLetter}</div>
            <b>{COMPANY.name}</b>
            <LiveClock />
            {daysTogether !== null ? <span className="days-badge">🗓️ 함께한 지 {daysTogether}일째</span> : null}
            {showConfetti
              ? confettiPieces.map((piece, i) => (
                  <span key={i} className="confetti-piece" style={piece.style}>
                    {piece.emoji}
                  </span>
                ))
              : null}
          </div>

          <div className="tile t-controls" role="group" aria-label="근무 상태">
            <div className="controls-kicker">
              <b>내 프로그램들이 한집에 사는 식구가 됐어요</b>
              <span>지금 {ROSTER.length}명이 방 {HOUSE_ROOMS.length}개에 살아요</span>
            </div>
            <button className={mode !== "off" ? "active" : ""} onClick={() => pickMode("work")}>
              🚪 출근
            </button>
            <button className={mode === "work" ? "active" : ""} onClick={() => pickMode("work")}>
              💻 근무시작
            </button>
            <button className={mode === "free" ? "active" : ""} onClick={() => pickMode("free")}>
              🚶 자유시간
            </button>
            <button className={mode === "off" ? "active" : ""} onClick={() => pickMode("off")}>
              🌙 퇴근
            </button>
            <button onClick={onShareSnapshot} disabled={capturing}>
              {capturing
                ? "📸 캡처 중…"
                : shareResult === "done"
                  ? "✅ 저장했어요!"
                  : shareResult === "failed"
                    ? "⚠️ 저장 실패했어요"
                    : "📸 오늘 기록 남기기"}
            </button>
            <button
              className={commuteMode.value !== "normal" ? "active" : ""}
              onClick={() => setCommuteModeIndex((i) => (i + 1) % COMMUTE_MODES.length)}
              title="출근·퇴근할 때 걸어가는 애니메이션의 속도를 바꿔요 — 지금 상태가 '보통'이 아니면 버튼이 강조돼요"
            >
              {commuteMode.label}
            </button>
            <button onClick={() => { setGreet({ id: Date.now() }); addLog("🙋", "집주인이 나왔어요"); }} title="집주인이 집에 나와요. 오늘 할 말이 있는 식구가 한 명씩 와서 말하고, 단짝이 집주인을 안방으로 데려가요">
              🙋 나왔어
            </button>
          </div>
        </div>

        <NoteBar nowMin={nowMin} needsTodoPassword={todoNeedsPassword || (remindersShared && reminderNeedsPassword)} onPost={postNote} />

        <div className="house-main">
          <HouseWorld
            layout={layout}
            order={order}
            onSwap={swapRooms}
            mode={mode}
            commuteMode={commuteMode.value}
            badges={badges}
            reaction={reaction}
            appearanceOverrides={appearanceOverrides}
            chips={chips}
            plant={{ done: todoCounts.done, total: todoCounts.total }}
            water={water}
            onPerson={onPersonClick}
            zoomRequest={zoomRequest}
            signals={signals}
            alarm={alarm}
            greet={greet}
            roomAlerts={roomAlerts}
            note={note}
            remindersLocal={!remindersShared}
            rosterVersion={rosterVersion}
          />
          <HousePanel
            layout={layout}
            roomCount={order.length}
            todoCounts={todoCounts}
            reminders={reminders}
            person={person}
            appearance={person?.lpc ? (appearanceOverrides[person.name] ?? person.lpc) : null}
            onBack={() => setPerson(null)}
            onAction={(action) => setActiveAction(action)}
            onCustomize={(staff) => setCustomizingStaff(staff)}
            onZoomRoom={(room) => setZoomRequest({ id: Date.now(), room })}
            roomAlerts={roomAlerts}
            log={houseLog}
            onBatchLooks={() => setBatchOpen(true)}
            onStaffManager={() => setStaffManagerOpen(true)}
            todos={todos}
            todoNeedsPassword={todoNeedsPassword}
            onToggleTodo={onToggleTodo}
          />
        </div>

        <HouseLegend onPerson={setPerson} rosterVersion={rosterVersion} />

        <footer className="credit-foot">
          {process.env.NEXT_PUBLIC_DEMO === "1" ? <p>데모예요 — 여기 적은 내용은 내 브라우저에만 저장되고 다른 사람에겐 안 보여요.</p> : null}
          <a href={CREDIT.url} target="_blank" rel="noopener noreferrer">{CREDIT.text}</a>
        </footer>
      </div>

      {activeAction === "reminder" ? (
        <ReminderModal
          reminders={reminders}
          shared={remindersShared}
          needsPassword={reminderNeedsPassword}
          onAdd={async (time, text, password) => {
            await addReminder(time, text, password);
            triggerReaction("박일해", "적어뒀어요! ✅");
            addLog("⏰", `박일해가 ${time} "${short(text)}" 알림을 적어뒀어요`);
          }}
          onRemove={(id) => removeReminders([id])}
          onClose={() => setActiveAction(null)}
        />
      ) : null}
      {activeAction === "todo-work" ? (
        <TodoModal
          category="업무"
          todos={todos}
          listError={todoListError}
          needsPassword={todoNeedsPassword}
          hiddenCompletedByCategory={todoHiddenByCategory}
          notionDatabaseUrl={todoNotionUrl}
          onAdd={async (text, password) => {
            await addTodo(text, "업무", password);
            triggerReaction("일감이", "체크리스트에 넣었어요! 📋");
          }}
          onToggle={onToggleTodo}
          onEdit={editTodo}
          onRemove={removeTodo}
          onClose={() => setActiveAction(null)}
        />
      ) : null}
      {activeAction === "todo-personal" ? (
        <TodoModal
          category="개인"
          todos={todos}
          listError={todoListError}
          needsPassword={todoNeedsPassword}
          hiddenCompletedByCategory={todoHiddenByCategory}
          notionDatabaseUrl={null}
          onAdd={async (text, password) => {
            await addTodo(text, "개인", password);
            triggerReaction("짬짬이", "체크리스트에 넣었어요! 📋");
          }}
          onToggle={onToggleTodo}
          onEdit={editTodo}
          onRemove={removeTodo}
          onClose={() => setActiveAction(null)}
        />
      ) : null}

      {customizingStaff && customizingStaff.lpc ? (
        <AvatarCustomizerModal
          staff={customizingStaff}
          initial={appearanceOverrides[customizingStaff.name] ?? customizingStaff.lpc}
          needsPassword={appearanceNeedsPassword}
          onSave={async (config, password) => {
            await saveAppearance(customizingStaff.name, config, password);
            triggerReaction(customizingStaff.name, "새 모습, 어때요? ✨");
            addLog("🎨", `${customizingStaff.role ?? customizingStaff.name} 모습을 바꿨어요`);
          }}
          onClose={() => setCustomizingStaff(null)}
        />
      ) : null}

      {staffManagerOpen ? (
        <StaffManagerModal
          roster={ROSTER}
          zones={ZONE_LIST}
          extras={rosterExtras}
          canSave={rosterShared}
          needsPassword={todoNeedsPassword}
          onSave={saveRoster}
          onClose={() => setStaffManagerOpen(false)}
          onCustomize={(staff) => setCustomizingStaff(staff)}
        />
      ) : null}

      {batchOpen ? (
        <AvatarBatchModal
          staffList={lpcStaff}
          current={Object.fromEntries(lpcStaff.map((s) => [s.name, appearanceOverrides[s.name] ?? s.lpc!]))}
          needsPassword={appearanceNeedsPassword}
          onSave={saveAppearance}
          onSaved={(n) => addLog("🎨", `식구 ${n}명 모습을 한 번에 바꿨어요`)}
          onClose={() => setBatchOpen(false)}
        />
      ) : null}

      {paletteOpen ? (
        <CommandPalette
          staffList={ROSTER}
          onAction={(staff) => setActiveAction(staff.action ?? null)}
          onClose={() => setPaletteOpen(false)}
        />
      ) : null}

      {dueReminders.length > 0 ? (
        <div className="modal-overlay" onClick={() => setDueReminders([])}>
          <div className="modal-card win" onClick={(e) => e.stopPropagation()}>
            <div className="win-bar">
              <span>⏰ 할 일 시간이에요!</span>
            </div>
            <div className="win-body">
              <ul className="reminder-list">
                {dueReminders.map((r, i) => (
                  <li key={`${r.id}-${i}`}>
                    <span className="reminder-time">{r.time}</span>
                    <span className="reminder-text">{r.text}</span>
                  </li>
                ))}
              </ul>
              <button type="button" className="modal-submit" onClick={() => setDueReminders([])}>
                확인했어요
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

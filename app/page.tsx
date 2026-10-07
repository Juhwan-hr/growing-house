"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import HousePanel from "./components/HousePanel";
import AvatarCustomizerModal from "./components/AvatarCustomizerModal";
import { useStaffAppearance } from "./components/useStaffAppearance";
import LiveClock from "./components/LiveClock";
import HouseWorld, { type CommuteMode, type OfficeMode } from "./game/HouseWorld";
import { computeLayout, HOUSE_ROOMS, normalizeOrder, ROOM_BY_ID, ROSTER } from "./game/house";
import { COMPANY, CREDIT, type StaffEntry } from "../company.config";

/** 방 자리 바꾸기 결과 — 이 브라우저에 기억합니다 */
const HOUSE_ORDER_KEY = "house_order";

/** 로고를 짧은 시간 안에 여러 번 누르면 뜨는 숨겨진 반응 */
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

/** 한국 시간 기준으로 집을 연 날(COMPANY.openedAt)부터 오늘까지 며칠째인지 (연 날 = 1일째) */
function daysSinceOpened(): number {
  const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const today = new Date(`${todayStr}T00:00:00+09:00`);
  const opened = new Date(`${COMPANY.openedAt}T00:00:00+09:00`);
  return Math.floor((today.getTime() - opened.getTime()) / 86400000) + 1;
}

export default function Home() {
  const [mode, setMode] = useState<OfficeMode>("off");
  const [commuteModeIndex, setCommuteModeIndex] = useState(0);
  const commuteMode = COMMUTE_MODES[commuteModeIndex];
  const [person, setPerson] = useState<StaffEntry | null>(null);
  const [zoomRequest, setZoomRequest] = useState<{ id: number; room: string } | null>(null);
  const [customizingStaff, setCustomizingStaff] = useState<StaffEntry | null>(null);
  const { overrides: appearanceOverrides, saveAppearance } = useStaffAppearance();
  const [showConfetti, setShowConfetti] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [shareResult, setShareResult] = useState<"idle" | "done" | "failed">("idle");
  const [daysTogether, setDaysTogether] = useState<number | null>(null);
  const logoClickTimes = useRef<number[]>([]);

  // 방 순서(= 어느 방이 어디 붙는지). "방 자리 바꾸기" 결과는 이 브라우저에 기억합니다.
  const [order, setOrder] = useState<string[]>(() => normalizeOrder(null));
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HOUSE_ORDER_KEY);
      if (saved) setOrder(normalizeOrder(JSON.parse(saved)));
    } catch {
      /* 저장된 순서가 없거나 읽을 수 없으면 기본 순서 그대로 */
    }
  }, []);
  const layout = useMemo(() => computeLayout(order), [order]);
  const swapRooms = (a: string, b: string) => {
    if (!ROOM_BY_ID.get(a) || !ROOM_BY_ID.get(b)) return;
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
  };

  useEffect(() => {
    const update = () => setDaysTogether(daysSinceOpened());
    update();
    const timer = window.setInterval(update, 30 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showConfetti],
  );

  const onLogoClick = () => {
    const now = Date.now();
    logoClickTimes.current = [...logoClickTimes.current.filter((t) => now - t < CONFETTI_WINDOW_MS), now];
    if (logoClickTimes.current.length >= CONFETTI_CLICKS) {
      logoClickTimes.current = [];
      setShowConfetti(true);
      window.setTimeout(() => setShowConfetti(false), CONFETTI_DURATION_MS);
    }
  };

  // 📸 집 그림을 PNG로 저장(휴대폰은 공유 시트) — 끝나면 버튼 글자로 결과를 잠깐 알려줌
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
      setShareResult("done");
      window.setTimeout(() => setShareResult("idle"), 2500);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setShareResult("failed");
      window.setTimeout(() => setShareResult("idle"), 2500);
    } finally {
      setCapturing(false);
    }
  };

  return (
    <main className="page-shell">
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
              <b>내 프로그램들이 한집에 사는 식구가 돼요</b>
              <span>지금 {ROSTER.length}명이 방 {HOUSE_ROOMS.length}개에 살아요</span>
            </div>
            <button className={mode !== "off" ? "active" : ""} onClick={() => setMode("work")}>
              🚪 출근
            </button>
            <button className={mode === "work" ? "active" : ""} onClick={() => setMode("work")}>
              💻 근무시작
            </button>
            <button className={mode === "free" ? "active" : ""} onClick={() => setMode("free")}>
              🚶 자유시간
            </button>
            <button className={mode === "off" ? "active" : ""} onClick={() => setMode("off")}>
              🌙 퇴근
            </button>
            <button onClick={onShareSnapshot} disabled={capturing}>
              {capturing ? "📸 캡처 중…" : shareResult === "done" ? "✅ 저장했어요!" : shareResult === "failed" ? "⚠️ 저장 실패했어요" : "📸 집 사진 남기기"}
            </button>
            <button
              className={commuteMode.value !== "normal" ? "active" : ""}
              onClick={() => setCommuteModeIndex((i) => (i + 1) % COMMUTE_MODES.length)}
              title="출근·퇴근할 때 걸어가는 애니메이션의 속도를 바꿔요"
            >
              {commuteMode.label}
            </button>
          </div>
        </div>

        <div className="house-main">
          <HouseWorld
            layout={layout}
            order={order}
            onSwap={swapRooms}
            mode={mode}
            commuteMode={commuteMode.value}
            appearanceOverrides={appearanceOverrides}
            onPerson={setPerson}
            zoomRequest={zoomRequest}
          />
          <HousePanel
            layout={layout}
            roomCount={order.length}
            person={person}
            appearance={person?.lpc ? (appearanceOverrides[person.name] ?? person.lpc) : null}
            onBack={() => setPerson(null)}
            onCustomize={(staff) => setCustomizingStaff(staff)}
            onZoomRoom={(room) => setZoomRequest({ id: Date.now(), room })}
          />
        </div>

        <footer className="credit-foot">
          <a href={CREDIT.url} target="_blank" rel="noopener noreferrer">{CREDIT.text}</a>
        </footer>
      </div>

      {customizingStaff && customizingStaff.lpc ? (
        <AvatarCustomizerModal
          staff={customizingStaff}
          initial={appearanceOverrides[customizingStaff.name] ?? customizingStaff.lpc}
          needsPassword={false}
          onSave={(config) => saveAppearance(customizingStaff.name, config)}
          onClose={() => setCustomizingStaff(null)}
        />
      ) : null}
    </main>
  );
}

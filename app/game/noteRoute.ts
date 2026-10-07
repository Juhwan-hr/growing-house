// 쪽지 한 줄(2026-10-03) — 누가 맡을지 고르지 않고 한 줄만 쓰면, 내용을 보고 알맞은 식구가
// 현관 게시판에서 쪽지를 가져가 진짜로 저장합니다.
//  - 할 일(업무/개인) → 일감이·짬짬이 목록에 바로 저장
//  - 오늘 안의 시각 → 박일해 알림으로 바로 저장(이 기기)

export type NoteKind = "todo-work" | "todo-personal" | "reminder";

export type NoteRoute = {
  kind: NoteKind;
  /** 쪽지를 가져가는 식구 이름 */
  who: string;
  /** 가져가면서 하는 말 */
  reply: string;
  /** 쪽지 칸 아래 미리보기 문구 */
  preview: string;
  time?: string;
};

export const NOTE_KINDS: { kind: NoteKind; who: string; label: string }[] = [
  { kind: "todo-personal", who: "짬짬이", label: "짬짬이 · 개인 할 일" },
  { kind: "todo-work", who: "일감이", label: "일감이 · 업무 할 일" },
  { kind: "reminder", who: "박일해", label: "박일해 · 오늘 알림" },
];

const pad = (n: number) => String(n).padStart(2, "0");

function kstToday(): Date {
  return new Date(`${new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" })}T00:00:00+09:00`);
}
const ymd = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

/** "오늘/내일/모레/N월 N일/N일" → YYYY-MM-DD (한국 날짜). 없으면 null */
export function parseDate(text: string): string | null {
  const base = kstToday();
  const plus = (days: number) => ymd(new Date(base.getTime() + days * 86400000));
  if (/모레/.test(text)) return plus(2);
  if (/내일/.test(text)) return plus(1);
  if (/오늘/.test(text)) return plus(0);
  const [y, m] = ymd(base).split("-").map(Number);
  const md = text.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (md) {
    const mm = Number(md[1]);
    const dd = Number(md[2]);
    const year = mm < m ? y + 1 : y;
    return `${year}-${pad(mm)}-${pad(dd)}`;
  }
  const d = text.match(/(\d{1,2})\s*일/);
  if (d && !/매달|매월/.test(text)) {
    const dd = Number(d[1]);
    const today = Number(ymd(base).split("-")[2]);
    const [yy, mm] = dd >= today ? [y, m] : m === 12 ? [y + 1, 1] : [y, m + 1];
    return `${yy}-${pad(mm)}-${pad(dd)}`;
  }
  return null;
}

/** "3시", "오후 3시 반", "15:30" → 오늘 앞으로 올 "HH:MM". 시각이 없으면 null */
export function parseTime(text: string, nowMin: number): string | null {
  const hm = text.match(/(\d{1,2}):(\d{2})/);
  let h: number;
  let m = 0;
  if (hm) {
    h = Number(hm[1]);
    m = Number(hm[2]);
  } else {
    const t = text.match(/(\d{1,2})\s*시(?:\s*(반|(\d{1,2})\s*분))?/);
    if (!t) return null;
    h = Number(t[1]);
    m = t[2] === "반" ? 30 : t[3] ? Number(t[3]) : 0;
  }
  if (h > 23 || m > 59) return null;
  const pm = /오후|저녁|밤/.test(text);
  const am = /오전|아침|새벽/.test(text);
  if (pm && h < 12) h += 12;
  else if (!am && !hm && h >= 1 && h <= 11 && h * 60 + m <= nowMin && (h + 12) * 60 + m > nowMin) h += 12; // "3시"가 지났으면 오후 3시로
  return `${pad(h)}:${pad(m)}`;
}

/** "13,500원", "1만 3500원", "2만원" → "13500" */
export function parseAmount(text: string): string | null {
  const man = text.match(/(\d+(?:\.\d+)?)\s*만\s*(\d{1,4})?\s*원?/);
  if (man) return String(Math.round(Number(man[1]) * 10000 + (man[2] ? Number(man[2]) : 0)));
  const won = text.match(/(\d[\d,]*)\s*(원|₩)/) ?? text.match(/₩\s*(\d[\d,]*)/);
  return won ? won[1].replace(/,/g, "") : null;
}

const has = (re: RegExp, t: string) => re.test(t);

/** kind를 정해 주면(직접 고른 경우) 그 식구로, 아니면 내용을 보고 고릅니다 */
export function routeNote(raw: string, nowMin: number, forced?: NoteKind | null): NoteRoute {
  const text = raw.trim();
  const time = parseTime(text, nowMin);
  const future = /내일|모레|다음\s*주|\d{1,2}\s*월\s*\d{1,2}\s*일/.test(text);
  const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
  // 알림은 오늘 아직 안 지난 시각만 — 지난 시각을 넣으면 바로 울려버려서
  const timeOk = !!time && !future && toMin(time) > nowMin;
  const todoKind: NoteKind = has(/업무|회사|출근|면접|근태|급여|보고|회의|결재|인사|채용|입사|퇴사|팀장|메일/, text) ? "todo-work" : "todo-personal";
  const auto: NoteKind = timeOk ? "reminder" : todoKind;
  let kind = forced ?? auto;
  let reminderNote = "";
  if (kind === "reminder" && !timeOk) {
    reminderNote = !time ? "시각이 없어서" : future ? "오늘이 아니라서" : "이미 지난 시각이라";
    kind = todoKind;
  }
  const why = reminderNote ? ` (${reminderNote} 알림 대신)` : "";

  switch (kind) {
    case "reminder":
      return { kind, who: "박일해", reply: `${time}에 알려드릴게요 ⏰`, time: time!, preview: `박일해가 가져가요 · 오늘 ${time}에 알림이 울려요(이 기기)` };
    case "todo-work":
      return { kind, who: "일감이", reply: "업무 수첩에 적어둘게요 📝", preview: `일감이가 가져가요 · 업무 할 일에 바로 적어요${why}` };
    default:
      return { kind: "todo-personal", who: "짬짬이", reply: "개인 수첩에 적어둘게요 🧺", preview: `짬짬이가 가져가요 · 개인 할 일에 바로 적어요${why}` };
  }
}

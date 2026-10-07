"use client";

// 오늘·이번 주 기록 — 이 브라우저에 저장된 끝낸 할 일과 집에서 있었던 일을 날마다 모아 봅니다.
import { useEffect, useState } from "react";
import Link from "next/link";
import { COMPANY } from "../../company.config";
import { readAllTodos } from "../components/useTodos";
import { fetchShared } from "../components/houseState";

type Day = {
  date: string;
  done: { text: string; category: string; at: string }[];
  log: { t: number; icon: string; text: string }[];
};

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const kstDay = (ms: number) => new Date(ms).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
const hhmm = (v: string | number) => new Date(v).toLocaleTimeString("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" });

function dayTitle(date: string, today: string) {
  const d = new Date(`${date}T12:00:00+09:00`);
  const label = `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일 (${DOW[d.getUTCDay()]})`;
  const diff = Math.round((new Date(`${today}T12:00:00+09:00`).getTime() - d.getTime()) / 86400000);
  return diff === 0 ? `오늘 · ${label}` : diff === 1 ? `어제 · ${label}` : label;
}

/** 이번 주(월요일부터, 한국 시각) 날짜들 — 요일은 정오로 계산해야 날짜가 안 밀림 */
function thisWeek(): { today: string; dates: string[] } {
  const today = kstDay(Date.now());
  const back = (new Date(`${today}T12:00:00+09:00`).getUTCDay() + 6) % 7;
  const noon = new Date(`${today}T12:00:00+09:00`).getTime();
  const dates = Array.from({ length: back + 1 }, (_, i) => kstDay(noon - (back - i) * 86400000));
  return { today, dates };
}

export default function HistoryPage() {
  const [data, setData] = useState<{ today: string; days: Day[] } | null>(null);

  useEffect(() => {
    (async () => {
      const { today, dates } = thisWeek();
      const todos = readAllTodos();
      const days: Day[] = [];
      for (const date of dates) {
        const log = (await fetchShared<Day["log"]>(`house_log:${date}`)).value;
        days.push({
          date,
          done: todos
            .filter((t) => t.done && t.completed_at && kstDay(Date.parse(t.completed_at)) === date)
            .sort((a, b) => (a.completed_at ?? "").localeCompare(b.completed_at ?? ""))
            .map((t) => ({ text: t.text, category: t.category, at: t.completed_at! })),
          log: Array.isArray(log) ? log : [],
        });
      }
      setData({ today, days: days.reverse() }); // 오늘이 맨 위
    })();
  }, []);

  const weekDone = data?.days.reduce((s, d) => s + d.done.length, 0) ?? 0;

  return (
    <main className="page-shell">
      <div className="wrap hist-wrap">
        <nav className="app-nav" aria-label="기록 헤더">
          <div className="brand-chip">
            <span>{COMPANY.logoLetter}</span>
            <b>{COMPANY.name}</b>
          </div>
          <Link href="/" className="hist-back">
            ← 집으로 돌아가기
          </Link>
        </nav>

        <header className="hist-head">
          <h1>오늘·이번 주 기록</h1>
          <p>
            이번 주(월요일부터)에 끝낸 할 일과 집에서 있었던 일을 날마다 모아 봐요.
            {data ? ` 이번 주에 끝낸 일은 ${weekDone}개예요.` : ""}
          </p>
        </header>

        {!data ? (
          <p className="panel-empty">불러오는 중…</p>
        ) : (
          <div className="hist-days">
            {data.days.map((d) => (
              <section key={d.date} className={`tile hist-day${d.date === data.today ? " today" : ""}`}>
                <h2>{dayTitle(d.date, data.today)}</h2>
                <p className="hist-label">✅ 끝낸 일 {d.done.length ? `${d.done.length}개` : ""}</p>
                {d.done.length ? (
                  <ul className="hist-list">
                    {[...d.done].reverse().map((it, k) => (
                      <li key={k}>
                        <time>{hhmm(it.at)}</time>
                        <span className={it.category === "업무" ? "tw-tag w" : "tw-tag p"}>{it.category}</span>
                        <span>{it.text}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="hist-none">끝낸 일이 없어요.</p>
                )}
                {d.log.length ? (
                  <details className="hist-log">
                    <summary>🏠 집에서 있었던 일 {d.log.length}개</summary>
                    <ul className="hist-list">
                      {[...d.log].reverse().map((e, k) => (
                        <li key={k}>
                          <time>{hhmm(e.t)}</time>
                          <span aria-hidden="true">{e.icon}</span>
                          <span>{e.text}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

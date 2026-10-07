"use client";

// "이 집의 물건들"(2026-10-02) — 집 안 물건이 각각 뭘 알려주는지, 누가 맡는지 한눈에.
// 카드를 누르면 그 물건을 맡은 식구 카드가 오른쪽 패널에 뜹니다. 예전 직원 명단·구역 안내
// 위젯(BentoWidgets)을 대신합니다 — 새 직원을 추가하면 카드도 저절로 늘어납니다.
import type { StaffEntry } from "../../company.config";
import { ITEM_SPECS, ROSTER, STAFF_HOME, ROOM_BY_ID } from "../game/house";

const ROOM_PROPS = [
  { img: "/house/item-pot.png", title: "거실 화분", sub: "오늘 할 일 진행도", desc: "오늘 끝낸 할 일만큼 자라요. 할 일을 끝내면 담당 직원이 물을 주러 계단을 내려와요." },
  { img: "/kenney/furn-sign.png", title: "현관 게시판", sub: "게시판", desc: "누르면 게시판 사이트로 바로 가요." },
  { img: "/kenney/furn-cabinet.png", title: "안방 책장", sub: "웹툰", desc: "누르면 웹툰 사이트로 바로 가요." },
];

export default function HouseLegend({ onPerson }: { onPerson: (staff: StaffEntry) => void; rosterVersion?: number }) {
  const cards = ROSTER.filter((s) => !s.alwaysPresent);
  return (
    <section className="tile house-legend">
      <h2 className="hp-title">이 집의 물건들</h2>
      <p className="hp-note">식구마다 맡은 물건 옆에서 일해요. 물건은 누르지 않아도 지금 상태를 보여줘요.</p>
      <div className="hl-grid">
        {cards.map((s) => {
          const item = s.item ?? "monitor";
          const spec = ITEM_SPECS[item];
          const room = ROOM_BY_ID.get(STAFF_HOME[s.name]?.room ?? "");
          return (
            <button key={s.name} type="button" className="hl-card" onClick={() => onPerson(s)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/house/item-${item}.png`} alt="" />
              <span>
                <b>{spec.label}</b>
                <small>
                  {s.role ?? s.name}
                  {room ? ` · ${room.name}` : ""}
                </small>
                <em>{spec.desc}</em>
              </span>
            </button>
          );
        })}
        {ROOM_PROPS.map((p) => (
          <div key={p.title} className="hl-card static">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.img} alt="" />
            <span>
              <b>{p.title}</b>
              <small>{p.sub}</small>
              <em>{p.desc}</em>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

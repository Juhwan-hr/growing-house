"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { StaffEntry } from "../../company.config";

/**
 * Ctrl/Cmd+K로 열리는 직원 검색 팔레트 — 직원이 15명이고 앞으로 계속 늘어날
 * 예정이라, 방을 일일이 찾아다니지 않고 이름을 쳐서 바로 그 직원의 링크(새 탭)나
 * 입력창(모달)로 이동할 수 있게 해줍니다. 아직 연결된 사이트가 없는 직원은
 * 선택해도 안내만 보여주고 팔레트를 닫지 않습니다 — 역할이 없다는 게 아니라
 * 대표 페이지만 아직 없다는 뜻이라, "준비 중" 같은 표현은 쓰지 않습니다.
 */
export default function CommandPalette({
  staffList,
  onAction,
  onClose,
}: {
  staffList: StaffEntry[];
  onAction: (staff: StaffEntry) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? staffList.filter(
          (s) => s.name.toLowerCase().includes(q) || (s.role ?? "").toLowerCase().includes(q) || s.zone.toLowerCase().includes(q),
        )
      : staffList;
    return list;
  }, [query, staffList]);

  useEffect(() => {
    setHighlight(0);
    setNotice(null);
  }, [query]);

  const select = (staff: StaffEntry) => {
    if (staff.url) {
      window.open(staff.url, "_blank", "noopener,noreferrer");
      onClose();
    } else if (staff.action) {
      onAction(staff);
      onClose();
    } else {
      setNotice(`"${staff.role ?? staff.name}"은(는) 아직 연결된 사이트가 없어요.`);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const staff = results[highlight];
      if (staff) select(staff);
    }
  };

  return (
    <div className="modal-overlay palette-overlay" onClick={onClose}>
      <div className="modal-card win palette-card" onClick={(e) => e.stopPropagation()}>
        <div className="win-bar">
          <span>🔍 직원 검색</span>
          <button type="button" className="modal-close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="win-body palette-body">
          <input
            ref={inputRef}
            className="palette-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="이름이나 담당 업무로 검색... (예: 할 일, 알림)"
          />
          {notice ? <p className="palette-notice">{notice}</p> : null}
          <ul className="palette-list">
            {results.length === 0 ? (
              <li className="palette-empty">검색 결과가 없어요.</li>
            ) : (
              results.map((staff, i) => (
                <li key={`${staff.zone}-${staff.name}`}>
                  <button
                    type="button"
                    className={i === highlight ? "palette-item active" : "palette-item"}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => select(staff)}
                  >
                    <span className="palette-item-name">{staff.role ?? staff.name}</span>
                    <span className="palette-item-hint">
                      {staff.url ? "🔗 새 탭 열기" : staff.action ? "💬 입력창 열기" : "🔕 아직 링크 없음"}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

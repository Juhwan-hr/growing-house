"use client";

import { useState, type CSSProperties } from "react";
import type { StaffEntry } from "../../company.config";
import LpcSprite, { lpcLayerUrls, type LpcConfig, type LpcGender } from "../game/LpcSprite";
import {
  BEARD_STYLES,
  CLOTH_COLORS,
  EYEBROW_STYLES,
  FACE_STYLES,
  FEET_COLORS,
  FEET_STYLES,
  GLASSES_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  HAT_STYLES,
  LEGS_COLORS,
  LEGS_STYLES,
  NOSE_STYLES,
  OUTER_STYLES,
  SKIN_TONES,
  TORSO_EXTRA_STYLES,
  TORSO_STYLES,
  swatchesFor,
  type LpcColorSwatch,
  type LpcExtraStyle,
} from "../game/lpcCatalog";

type Tab = "face" | "hair" | "beard" | "hat" | "torso" | "outer" | "legs" | "feet";
const TABS: { key: Tab; label: string }[] = [
  { key: "face", label: "피부·얼굴" },
  { key: "hair", label: "머리" },
  { key: "beard", label: "수염·안경" },
  { key: "hat", label: "모자" },
  { key: "torso", label: "상의" },
  { key: "outer", label: "겉옷" },
  { key: "legs", label: "하의" },
  { key: "feet", label: "신발" },
];

/** 썸네일에서 크게 보여줄 부위 — 64×64 한 칸 안의 세로 위치(y)와 확대 배율(s).
 *  전신을 작게 보여주면 "머리 스타일을 고르는데 몸만 보인다"는 문제가 있어서, 고르는
 *  부위를 확대해서 보여줍니다. */
const FOCUS: Record<string, { s: number; y: number }> = {
  hair: { s: 1.6, y: 24 }, face: { s: 2.2, y: 27 }, nose: { s: 2.6, y: 28 }, eyebrows: { s: 2.6, y: 25 },
  beard: { s: 2.2, y: 31 }, glasses: { s: 2.4, y: 27 }, hat: { s: 1.5, y: 20 }, torso: { s: 1.6, y: 44 },
  outer: { s: 1.5, y: 44 }, legs: { s: 1.6, y: 54 }, feet: { s: 2, y: 61 },
};

/** "무난하게 랜덤" — 대머리·민소매·튀는 머리색처럼 센 느낌이 나는 조합은 빼고 고릅니다
 *  (2026-10-01 "일부 캐릭터가 너무 험하게 생겼다"는 피드백). 피부색은 전부 그대로 씁니다. */
const SOFT = {
  // buzzcut(짧은 삭발)은 작게 보면 대머리처럼 보여서 뺐습니다
  hair: ["bob", "bob_side_part", "curly_short", "bangs_bun", "ponytail"],
  hairColor: ["black", "dark_brown", "chestnut", "blonde", "platinum"],
  torso: ["tshirt", "shortsleeve", "longsleeve", "longsleeve_polo", "cardigan"],
  torsoColor: ["white", "sky", "yellow", "pink", "teal", "gray"],
  legsColor: ["navy", "gray", "tan", "brown"],
  feetColor: ["black", "brown", "white"],
  face: [null, null, "happy", "blush"],
};
const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
/** gender를 주면 그 성별은 그대로 두고 나머지만 무난하게 고릅니다(여러 명 한 번에 고르기에서 씀) */
export function softRandom(keepGender?: LpcGender): LpcConfig {
  const gender: LpcGender = keepGender ?? pick(["male", "female"] as const);
  return {
    gender,
    skin: pick(SKIN_TONES).name,
    hair: { style: pick(SOFT.hair), color: pick(SOFT.hairColor) },
    torso: { style: pick(SOFT.torso), color: pick(SOFT.torsoColor) },
    legs: { style: pick(gender === "female" ? ["pants", "shorts", "skirt"] : ["pants", "shorts"]), color: pick(SOFT.legsColor) },
    feet: { style: "shoes", color: pick(SOFT.feetColor) },
    face: pick(SOFT.face),
  };
}
const PRESETS: LpcConfig[] = [
  { gender: "female", skin: "light", hair: { style: "bob", color: "chestnut" }, torso: { style: "cardigan", color: "pink" }, legs: { style: "skirt", color: "navy" }, feet: { style: "shoes", color: "brown" }, face: "happy" },
  { gender: "male", skin: "amber", hair: { style: "curly_short", color: "dark_brown" }, torso: { style: "longsleeve_polo", color: "sky" }, legs: { style: "pants", color: "gray" }, feet: { style: "shoes", color: "white" }, glasses: { style: "round", color: "black" } },
  { gender: "female", skin: "olive", hair: { style: "ponytail", color: "black" }, torso: { style: "tshirt", color: "yellow" }, legs: { style: "pants", color: "navy" }, feet: { style: "shoes", color: "white" }, face: "blush" },
  { gender: "male", skin: "light", hair: { style: "bob_side_part", color: "blonde" }, torso: { style: "tshirt", color: "teal" }, legs: { style: "pants", color: "tan" }, feet: { style: "shoes", color: "brown" }, hat: { style: "bonnie", color: "navy" } },
  { gender: "female", skin: "taupe", hair: { style: "bangs_bun", color: "dark_brown" }, torso: { style: "blouse", color: "white" }, legs: { style: "pants", color: "navy" }, feet: { style: "shoes", color: "black" }, outer: { style: "apron", color: "yellow" } },
  { gender: "male", skin: "bronze", hair: { style: "bob", color: "black" }, torso: { style: "longsleeve", color: "white" }, legs: { style: "pants", color: "brown" }, feet: { style: "shoes", color: "black" }, outer: { style: "vest", color: "navy" } },
];

const DIRS: { key: "down" | "left" | "right" | "up"; label: string }[] = [
  { key: "down", label: "앞" },
  { key: "left", label: "왼쪽" },
  { key: "right", label: "오른쪽" },
  { key: "up", label: "뒤" },
];

const allows = (s: LpcExtraStyle, g: LpcGender) => !s.genders || s.genders.includes(g);

/** 성별을 바꾸면 그 성별에 그림이 없는 옷은 무난한 기본값으로 되돌립니다 */
function fitGender(d: LpcConfig, gender: LpcGender): LpcConfig {
  const torsoExtra = TORSO_EXTRA_STYLES.find((s) => s.style === d.torso?.style);
  const outer = OUTER_STYLES.find((s) => s.style === d.outer?.style);
  return {
    ...d,
    gender,
    legs: d.legs?.style === "skirt" && gender === "male" ? { style: "pants", color: d.legs.color } : d.legs,
    torso: torsoExtra && !allows(torsoExtra, gender) ? { style: "tshirt", color: "white" } : d.torso,
    outer: outer && !allows(outer, gender) ? null : d.outer ?? null,
  };
}

export default function AvatarCustomizerModal({
  staff,
  initial,
  needsPassword,
  onSave,
  onClose,
}: {
  staff: StaffEntry;
  initial: LpcConfig;
  needsPassword: boolean;
  onSave: (config: LpcConfig, password?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<LpcConfig>(initial);
  const [tab, setTab] = useState<Tab>("face");
  const [dir, setDir] = useState<(typeof DIRS)[number]["key"]>("down");
  const [walking, setWalking] = useState(true);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const patch = (p: Partial<LpcConfig>) => setDraft((d) => ({ ...d, ...p }));

  const submit = async () => {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await onSave(draft, password || undefined);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 중 문제가 생겼어요.");
    } finally {
      setBusy(false);
    }
  };

  const g = draft.gender;
  const torsoStyles: LpcExtraStyle[] = [...TORSO_STYLES, ...TORSO_EXTRA_STYLES.filter((s) => allows(s, g))];
  const torsoExtra = TORSO_EXTRA_STYLES.find((s) => s.style === draft.torso?.style);
  const torsoColors = torsoExtra ? swatchesFor(torsoExtra.colors ?? []) : CLOTH_COLORS;
  const legsStyles = LEGS_STYLES.filter((s) => !("femaleOnly" in s && s.femaleOnly) || g === "female");
  const outerStyles = OUTER_STYLES.filter((s) => allows(s, g));

  /** 스타일 하나를 고르면 색은 지금 색을 유지하되, 그 스타일에 없는 색이면 첫 색으로 */
  const partWith = (styles: LpcExtraStyle[], style: string, color: string | undefined) => {
    const colors = styles.find((s) => s.style === style)?.colors;
    return { style, color: colors && (!color || !colors.includes(color)) ? colors[0] : color ?? "black" };
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card win avatar-modal" onClick={(e) => e.stopPropagation()}>
        <div className="win-bar">
          <span>🎨 모습 바꾸기 — {staff.role ?? staff.name}</span>
          <button type="button" className="modal-close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="win-body avatar-body">
          <div className="avatar-side">
            <div className="avatar-preview">
              <div className={`staff f-${dir}${walking ? " walking" : ""}`}>
                <LpcSprite config={draft} />
              </div>
            </div>
            <div className="avatar-chips">
              {DIRS.map((d) => (
                <button key={d.key} type="button" className={dir === d.key ? "active" : ""} onClick={() => setDir(d.key)}>
                  {d.label}
                </button>
              ))}
              <button type="button" className={walking ? "active" : ""} onClick={() => setWalking((w) => !w)}>
                걷기
              </button>
            </div>
            <div className="avatar-chips">
              {(["female", "male"] as const).map((gg) => (
                <button key={gg} type="button" className={g === gg ? "active" : ""} onClick={() => setDraft((d) => fitGender(d, gg))}>
                  {gg === "female" ? "여자" : "남자"}
                </button>
              ))}
            </div>
            <div className="avatar-chips">
              <button type="button" onClick={() => setDraft(softRandom())}>🎲 무난하게 랜덤</button>
              <button type="button" onClick={() => setDraft(initial)}>↺ 원래대로</button>
            </div>
            <div>
              <p className="avatar-label">추천 조합</p>
              <div className="avatar-presets">
                {PRESETS.map((p, i) => (
                  <button key={i} type="button" aria-label={`추천 조합 ${i + 1}`} onClick={() => setDraft(p)}>
                    <Thumb config={p} focus="full" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="avatar-main">
            <div className="avatar-tabs">
              {TABS.map((t) => (
                <button key={t.key} type="button" className={t.key === tab ? "active" : ""} onClick={() => setTab(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "face" ? (
              <>
                <Section title="피부">
                  <ColorRow colors={SKIN_TONES} current={draft.skin} onPick={(c) => patch({ skin: c })} />
                </Section>
                <Section title="표정">
                  <StyleGrid draft={draft} focus="face" none="기본"
                    items={FACE_STYLES} current={draft.face ?? null} make={(s) => ({ face: s })} onPick={(s) => patch({ face: s })} />
                </Section>
                <Section title="눈썹 (색은 머리색을 따라가요)">
                  <StyleGrid draft={draft} focus="eyebrows" none="없음"
                    items={EYEBROW_STYLES} current={draft.eyebrows ?? null} make={(s) => ({ eyebrows: s })} onPick={(s) => patch({ eyebrows: s })} />
                </Section>
                <Section title="코">
                  <StyleGrid draft={draft} focus="nose" none="기본"
                    items={NOSE_STYLES} current={draft.nose ?? null} make={(s) => ({ nose: s })} onPick={(s) => patch({ nose: s })} />
                </Section>
              </>
            ) : null}

            {tab === "hair" ? (
              <Section title="머리">
                <StyleGrid draft={draft} focus="hair" items={HAIR_STYLES} current={draft.hair?.style ?? null}
                  rough={["balding"]}
                  make={(s) => ({ hair: s ? { style: s, color: draft.hair?.color ?? "black" } : null })}
                  onPick={(s) => s && patch({ hair: { style: s, color: draft.hair?.color ?? "black" } })} />
                <ColorRow colors={HAIR_COLORS} current={draft.hair?.color}
                  onPick={(c) => patch({ hair: { style: draft.hair?.style ?? "bob", color: c } })} />
              </Section>
            ) : null}

            {tab === "beard" ? (
              <>
                <Section title="수염 (색은 머리색을 따라가요)">
                  <StyleGrid draft={draft} focus="beard" none="없음"
                    items={BEARD_STYLES} current={draft.beard ?? null} make={(s) => ({ beard: s })} onPick={(s) => patch({ beard: s })} />
                </Section>
                <Section title="안경">
                  <StyleGrid draft={draft} focus="glasses" none="없음" items={GLASSES_STYLES} current={draft.glasses?.style ?? null}
                    make={(s) => ({ glasses: s ? partWith(GLASSES_STYLES, s, draft.glasses?.color) : null })}
                    onPick={(s) => patch({ glasses: s ? partWith(GLASSES_STYLES, s, draft.glasses?.color) : null })} />
                  {draft.glasses ? (
                    <ColorRow colors={swatchesFor(GLASSES_STYLES.find((s) => s.style === draft.glasses?.style)?.colors ?? [])}
                      current={draft.glasses.color} onPick={(c) => patch({ glasses: { style: draft.glasses!.style, color: c } })} />
                  ) : null}
                </Section>
              </>
            ) : null}

            {tab === "hat" ? (
              <Section title="모자·머리띠">
                <StyleGrid draft={draft} focus="hat" none="없음" items={HAT_STYLES} current={draft.hat?.style ?? null}
                  make={(s) => ({ hat: s ? partWith(HAT_STYLES, s, draft.hat?.color) : null })}
                  onPick={(s) => patch({ hat: s ? partWith(HAT_STYLES, s, draft.hat?.color) : null })} />
                {draft.hat ? (
                  <ColorRow colors={swatchesFor(HAT_STYLES.find((s) => s.style === draft.hat?.style)?.colors ?? [])}
                    current={draft.hat.color} onPick={(c) => patch({ hat: { style: draft.hat!.style, color: c } })} />
                ) : null}
              </Section>
            ) : null}

            {tab === "torso" ? (
              <Section title="상의">
                <StyleGrid draft={draft} focus="torso" items={torsoStyles} current={draft.torso?.style ?? null} rough={["sleeveless"]}
                  make={(s) => ({ torso: s ? partWith(torsoStyles, s, draft.torso?.color) : null })}
                  onPick={(s) => s && patch({ torso: partWith(torsoStyles, s, draft.torso?.color) })} />
                <ColorRow colors={torsoColors} current={draft.torso?.color}
                  onPick={(c) => patch({ torso: { style: draft.torso?.style ?? "tshirt", color: c } })} />
              </Section>
            ) : null}

            {tab === "outer" ? (
              <Section title={g === "male" ? "겉옷 (상의 위에 덧입어요)" : "겉옷 (상의 위에 덧입어요 · 조끼·재킷은 남자 몸에만 있어요)"}>
                <StyleGrid draft={draft} focus="outer" none="없음" items={outerStyles} current={draft.outer?.style ?? null}
                  make={(s) => ({ outer: s ? partWith(outerStyles, s, draft.outer?.color) : null })}
                  onPick={(s) => patch({ outer: s ? partWith(outerStyles, s, draft.outer?.color) : null })} />
                {draft.outer ? (
                  <ColorRow colors={swatchesFor(OUTER_STYLES.find((s) => s.style === draft.outer?.style)?.colors ?? [])}
                    current={draft.outer.color} onPick={(c) => patch({ outer: { style: draft.outer!.style, color: c } })} />
                ) : null}
              </Section>
            ) : null}

            {tab === "legs" ? (
              <Section title="하의">
                <StyleGrid draft={draft} focus="legs" items={legsStyles} current={draft.legs?.style ?? null}
                  make={(s) => ({ legs: s ? { style: s, color: draft.legs?.color ?? "navy" } : null })}
                  onPick={(s) => s && patch({ legs: { style: s, color: draft.legs?.color ?? "navy" } })} />
                <ColorRow colors={LEGS_COLORS} current={draft.legs?.color}
                  onPick={(c) => patch({ legs: { style: draft.legs?.style ?? "pants", color: c } })} />
              </Section>
            ) : null}

            {tab === "feet" ? (
              <Section title="신발">
                <StyleGrid draft={draft} focus="feet" items={FEET_STYLES} current={draft.feet?.style ?? null}
                  make={(s) => ({ feet: s ? { style: s, color: draft.feet?.color ?? "black" } : null })}
                  onPick={(s) => s && patch({ feet: { style: s, color: draft.feet?.color ?? "black" } })} />
                <ColorRow colors={FEET_COLORS} current={draft.feet?.color}
                  onPick={(c) => patch({ feet: { style: draft.feet?.style ?? "shoes", color: c } })} />
              </Section>
            ) : null}

            {needsPassword ? (
              <label className="avatar-pw">
                비밀번호
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
              </label>
            ) : null}
            {error ? <p className="modal-error">{error}</p> : null}
            <button type="button" className="modal-submit" disabled={busy} onClick={submit}>
              {busy ? "저장 중..." : saved ? "✅ 저장했어요!" : "이 모습으로 저장"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="avatar-section">
      <p className="avatar-label">{title}</p>
      {children}
    </section>
  );
}

/** 한 캐릭터를 정면 1프레임으로 작게 그린 썸네일 — focus 부위를 확대해서 보여줍니다 */
export function Thumb({ config, focus }: { config: LpcConfig; focus: string }) {
  const f = FOCUS[focus];
  const style: CSSProperties = f
    ? { left: 29 - 32 * f.s, top: 23 - f.y * f.s, transform: `scale(${f.s})` }
    : { left: -3, top: -6, transform: "scale(1)" };
  return (
    <span className={f ? "avatar-thumb" : "avatar-thumb full"}>
      <span className="avatar-thumb-sprite" style={style}>
        {lpcLayerUrls(config).map((l) => (
          <span key={l.key} style={{ backgroundImage: `url(${l.url})` }} />
        ))}
      </span>
    </span>
  );
}

function StyleGrid({
  draft,
  focus,
  items,
  current,
  none,
  rough = [],
  make,
  onPick,
}: {
  draft: LpcConfig;
  focus: string;
  items: readonly { style: string; label: string }[];
  current: string | null;
  /** 있으면 맨 앞에 "없음/기본" 칸을 붙입니다 */
  none?: string;
  /** "센 느낌" 표시를 붙일 스타일 */
  rough?: string[];
  make: (style: string | null) => Partial<LpcConfig>;
  onPick: (style: string | null) => void;
}) {
  const cells: { style: string | null; label: string }[] = [...(none ? [{ style: null, label: none }] : []), ...items];
  return (
    <div className="avatar-style-grid">
      {cells.map((it) => (
        <button
          key={it.style ?? "none"}
          type="button"
          className={`avatar-style-btn${it.style === current ? " active" : ""}${it.style && rough.includes(it.style) ? " rough" : ""}`}
          onClick={() => onPick(it.style)}
          title={it.label}
        >
          <Thumb config={{ ...draft, ...make(it.style) }} focus={focus} />
          <small>{it.label}</small>
        </button>
      ))}
    </div>
  );
}

function ColorRow({
  colors,
  current,
  onPick,
}: {
  colors: LpcColorSwatch[];
  current: string | undefined;
  onPick: (color: string) => void;
}) {
  return (
    <div className="avatar-color-row">
      {colors.map((c) => (
        <button
          key={c.name}
          type="button"
          className={c.name === current ? "avatar-color-swatch active" : "avatar-color-swatch"}
          style={{ background: c.hex }}
          onClick={() => onPick(c.name)}
          aria-label={c.name}
          title={c.name}
        />
      ))}
    </div>
  );
}

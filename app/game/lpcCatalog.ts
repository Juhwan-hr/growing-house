/**
 * LPC 커스터마이징 화면(AvatarCustomizerModal)에서 고를 수 있는 스타일·색 목록.
 * public/lpc에 실제로 들어 있는 그림과 정확히 일치해야 합니다 — 여기 없는 조합은
 * 이미지가 없어서 깨집니다. 새 스타일/색을 추가하려면 그 그림 파일을 public/lpc에 먼저 넣으세요.
 */

import EXTRAS from "./lpcExtras.json";

export type LpcColorSwatch = { name: string; hex: string };

export const HAIR_STYLES = [
  { style: "afro", label: "아프로" },
  { style: "bob", label: "단발" },
  { style: "bob_side_part", label: "가르마 단발" },
  { style: "balding", label: "대머리" },
  { style: "buzzcut", label: "짧은 스포츠" },
  { style: "curly_short", label: "곱슬" },
  { style: "bangs_bun", label: "올림머리" },
  { style: "ponytail", label: "포니테일" },
] as const;

export const HAIR_COLORS: LpcColorSwatch[] = [
  { name: "black", hex: "#31313E" },
  { name: "dark_brown", hex: "#5F1F04" },
  { name: "chestnut", hex: "#B6550E" },
  { name: "blonde", hex: "#FCCF56" },
  { name: "red", hex: "#E21414" },
  { name: "gray", hex: "#AAAAAA" },
  { name: "platinum", hex: "#EDDF95" },
  { name: "navy", hex: "#3C49AD" },
];

export const TORSO_STYLES = [
  { style: "shortsleeve", label: "반팔" },
  { style: "tshirt", label: "티셔츠" },
  { style: "longsleeve", label: "긴팔" },
  { style: "longsleeve_polo", label: "폴로" },
  { style: "cardigan", label: "가디건" },
  { style: "sleeveless", label: "민소매" },
] as const;

export const LEGS_STYLES = [
  { style: "pants", label: "바지" },
  { style: "formal", label: "정장 바지" },
  { style: "shorts", label: "반바지" },
  { style: "skirt", label: "치마", femaleOnly: true },
] as const;

export const FEET_STYLES = [
  { style: "shoes", label: "신발" },
  { style: "boots", label: "부츠" },
  { style: "sandals", label: "샌들" },
] as const;

export const CLOTH_COLORS: LpcColorSwatch[] = [
  { name: "white", hex: "#E5E6C7" },
  { name: "sky", hex: "#C6EEFD" },
  { name: "navy", hex: "#3C49AD" },
  { name: "forest", hex: "#134507" },
  { name: "maroon", hex: "#832121" },
  { name: "charcoal", hex: "#4A5057" },
  { name: "gray", hex: "#797580" },
  { name: "yellow", hex: "#F3C03F" },
  { name: "teal", hex: "#0098B2" },
  { name: "pink", hex: "#C36072" },
];
/** 하의·신발은 이 서브셋만 재염색해뒀습니다(전신 코디에 자연스러운 무채색·중간톤 위주) */
export const LEGS_COLORS: LpcColorSwatch[] = [
  { name: "navy", hex: "#3C49AD" },
  { name: "charcoal", hex: "#4A5057" },
  { name: "gray", hex: "#797580" },
  { name: "brown", hex: "#744B30" },
  { name: "black", hex: "#2A3034" },
  { name: "tan", hex: "#B7996A" },
];
export const FEET_COLORS: LpcColorSwatch[] = [
  { name: "black", hex: "#2A3034" },
  { name: "brown", hex: "#744B30" },
  { name: "white", hex: "#E5E6C7" },
  { name: "gray", hex: "#797580" },
];

export const SKIN_TONES: LpcColorSwatch[] = [
  { name: "light", hex: "#E4A47C" },
  { name: "amber", hex: "#EA9F54" },
  { name: "olive", hex: "#AE6B3F" },
  { name: "taupe", hex: "#936849" },
  { name: "bronze", hex: "#7F4C31" },
  { name: "brown", hex: "#76513A" },
];

// ── 꾸미기 확장(2026-10-02): 얼굴·수염·안경·모자·겉옷·원피스 ──
// 목록 자체는 assets-raw/build-lpc-extras.mjs가 실제로 내보낸 파일 기준으로 만든
// lpcExtras.json을 그대로 씁니다(여기 손으로 적으면 이미지가 없는 조합이 생길 수 있어서).

export type LpcExtraStyle = { style: string; label: string; colors?: string[]; genders?: string[] };
export const FACE_STYLES: LpcExtraStyle[] = EXTRAS.face;
export const NOSE_STYLES: LpcExtraStyle[] = EXTRAS.nose;
export const EYEBROW_STYLES: LpcExtraStyle[] = EXTRAS.eyebrows;
export const BEARD_STYLES: LpcExtraStyle[] = EXTRAS.beard;
export const GLASSES_STYLES: LpcExtraStyle[] = EXTRAS.glasses;
export const HAT_STYLES: LpcExtraStyle[] = EXTRAS.hat;
export const OUTER_STYLES: LpcExtraStyle[] = EXTRAS.outer;
/** 여성 전용 상의(블라우스·원피스) — 색은 원본에 있던 색만 고를 수 있습니다 */
export const TORSO_EXTRA_STYLES: LpcExtraStyle[] = EXTRAS.torsoExtra;

/** 원본에 색별로 들어있던 옷·모자·안경 색 이름 → 색 원 표시용 hex */
export const WEAR_COLOR_HEX: Record<string, string> = {
  white: "#E5E6C7", black: "#2A3034", gray: "#797580", navy: "#3C49AD", sky: "#C6EEFD", teal: "#0098B2",
  forest: "#134507", yellow: "#F3C03F", pink: "#C36072", maroon: "#832121", brown: "#744B30", tan: "#B7996A",
  red: "#D33A2C", gold: "#E6B640", silver: "#C9CDD2", sunglasses: "#1B1F24", charcoal: "#4A5057",
};
export function swatchesFor(names: string[]): LpcColorSwatch[] {
  return names.map((name) => ({ name, hex: WEAR_COLOR_HEX[name] ?? "#999999" }));
}

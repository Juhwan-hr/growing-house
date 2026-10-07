export type LpcGender = "male" | "female";

type Part = { style: string; color: string };

export type LpcConfig = {
  gender: LpcGender;
  skin: string;
  hair: Part | null;
  torso: Part | null;
  legs: Part | null;
  feet: Part | null;
  // ── 꾸미기 확장(2026-10-02) — 전부 선택 항목이라 예전에 저장된 외형도 그대로 읽힙니다 ──
  /** 표정(웃음·볼 발그레 등) — 피부색을 따라갑니다. 없으면 기본 얼굴 */
  face?: string | null;
  /** 코 모양 — 피부색을 따라갑니다 */
  nose?: string | null;
  /** 눈썹 — 색은 머리색을 따라갑니다 */
  eyebrows?: string | null;
  /** 턱수염·콧수염 — 색은 머리색을 따라갑니다 */
  beard?: string | null;
  glasses?: Part | null;
  hat?: Part | null;
  /** 상의 위에 덧입는 겉옷(조끼·재킷·앞치마·멜빵 등) */
  outer?: Part | null;
};

function bodyUrl(gender: LpcGender, skin: string) {
  return `/lpc/body/${gender}/${skin}.png`;
}
function itemUrl(category: string, style: string, gender: LpcGender, color: string) {
  return `/lpc/${category}/${style}/${gender}/${color}.png`;
}

function headUrl(gender: LpcGender, skin: string) {
  return `/lpc/head/${gender}/${skin}.png`;
}

/**
 * 한 캐릭터를 이루는 레이어 이미지 주소들(아래 → 위 순서). LpcSprite와 꾸미기 화면의
 * 썸네일이 같이 씁니다. 순서는 LPC 원본 zPos 기준:
 * 몸 0 < 신발 15 < 하의 20 < 상의 30~35 < 겉옷 38~55 < 얼굴 100 < 표정 101 < 코 105
 * < 눈썹 106 < 수염 110 < 안경 115 < 머리 120 < 모자 130.
 * **`body`(몸통) 레이어에는 눈·코·입이 없습니다** — 얼굴은 `head`라는 별도 레이어에 있고,
 * 이걸 빼먹으면 캐릭터 얼굴이 빈 살구색 덩어리로 보입니다.
 */
export function lpcLayerUrls(config: LpcConfig): { key: string; url: string }[] {
  const g = config.gender;
  const hairColor = config.hair?.color ?? "black";
  const layers: { key: string; url: string }[] = [{ key: "body", url: bodyUrl(g, config.skin) }];
  if (config.feet) layers.push({ key: "feet", url: itemUrl("feet", config.feet.style, g, config.feet.color) });
  if (config.legs) layers.push({ key: "legs", url: itemUrl("legs", config.legs.style, g, config.legs.color) });
  if (config.torso) layers.push({ key: "torso", url: itemUrl("torso", config.torso.style, g, config.torso.color) });
  if (config.outer) layers.push({ key: "outer", url: itemUrl("outer", config.outer.style, g, config.outer.color) });
  layers.push({ key: "head", url: headUrl(g, config.skin) });
  if (config.face) layers.push({ key: "face", url: `/lpc/face/${config.face}/${g}/${config.skin}.png` });
  if (config.nose) layers.push({ key: "nose", url: `/lpc/nose/${config.nose}/${config.skin}.png` });
  if (config.eyebrows) layers.push({ key: "eyebrows", url: `/lpc/eyebrows/${config.eyebrows}/${hairColor}.png` });
  if (config.beard) layers.push({ key: "beard", url: `/lpc/beard/${config.beard}/${hairColor}.png` });
  if (config.glasses) layers.push({ key: "glasses", url: `/lpc/glasses/${config.glasses.style}/${config.glasses.color}.png` });
  if (config.hair) layers.push({ key: "hair", url: itemUrl("hair", config.hair.style, g, config.hair.color) });
  if (config.hat) layers.push({ key: "hat", url: `/lpc/hat/${config.hat.style}/${config.hat.color}.png` });
  return layers;
}

/**
 * Liberated Pixel Cup(LPC) 레이어 스프라이트 — 위 lpcLayerUrls() 순서대로 겹쳐 그립니다.
 * 각 레이어는 같은 576×256(9프레임×4방향) 걷기 시트를 쓰고, 방향은 조상 `.staff.f-*`
 * 클래스가(office.css) background-position-y로, 걷기 프레임은 `.staff.walking`일 때만
 * background-position-x가 애니메이션됩니다(정지 시 0번 프레임=서 있는 자세로 고정).
 */
export default function LpcSprite({ config }: { config: LpcConfig }) {
  return (
    <div className="st-sprite lpc-sprite">
      {lpcLayerUrls(config).map((l) => (
        <div key={l.key} className="lpc-layer" style={{ backgroundImage: `url(${l.url})` }} />
      ))}
    </div>
  );
}

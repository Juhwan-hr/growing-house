// 강아지·고양이 — 2026-09-29, OpenGameArt "[LPC] Cats and Dogs"(CC-BY/CC-BY-SA/GPL/OGA-BY
// 다중 라이선스, opengameart.org/content/lpc-cats-and-dogs로 링크만 걸면 됨) 픽셀 스프라이트로
// 교체했습니다. 사람 캐릭터가 이미 LPC 스타일이라(LpcSprite.tsx) 그림체가 자연스럽게
// 맞아떨어집니다. 예전엔 좌표 SVG(젤리 블롭)로 직접 그렸는데, 그 전엔 이모지였습니다.
// 사람 캐릭터와 달리 항상 옆모습(오른쪽 기준)만 쓰고, 왼쪽으로 갈 땐 CSS로 좌우 반전한
// 두 번째 엘리먼트를 미리 같이 그려둔 뒤 하나만 보여줍니다(PetLayer.tsx의 rAF 루프가 매
// 프레임 갱신하는 `.pet.f-left` 클래스에 얹혀갑니다 — 이 파일은 그 로직을 전혀 건드리지
// 않습니다). **반전은 `.pet-sprite`가 아니라 안쪽 `<img>`에 걸어야 합니다** — 걷기 bob
// 애니메이션(office.css의 petBob/petWalkBob)이 `.pet-sprite`의 transform을 keyframe에서
// 통째로 덮어써서, 같은 엘리먼트에 scaleX(-1)까지 얹으면 bob 애니메이션 도중 반전이
// 풀렸다 다시 걸리는 깜빡임이 생깁니다.
export type PetKind = "dog" | "cat";
export type PetColor = "brown" | "white" | "tan" | "black";

function petUrl(kind: PetKind, color: PetColor) {
  return `/kenney/pet-${kind}-${color}.png`;
}

export default function PetSprite({ kind, color }: { kind: PetKind; color: PetColor }) {
  const src = petUrl(kind, color);
  return (
    <>
      <div className="pet-sprite dir-right">
        <img src={src} alt="" />
      </div>
      <div className="pet-sprite dir-left">
        <img src={src} alt="" />
      </div>
    </>
  );
}

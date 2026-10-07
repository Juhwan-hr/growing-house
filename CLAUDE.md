# CLAUDE.md

이 저장소에서 작업하는 Claude Code(또는 다른 AI 코딩 도구)를 위한 안내서예요.
사람이 읽을 소개는 [README.md](README.md)에 있어요.

## 이 프로젝트가 뭔지

**자라는 집** — 사용자가 만든 프로그램(앱)들을 "식구(캐릭터)"로 표현해서, 옆에서 잘라 본 집 한 채에
방별로 살게 하는 개인용 가상 오피스예요. 처음엔 현관 하나와 예시 식구("첫 식구") 한 명뿐이고,
사용자와 함께 방과 식구를 하나씩 늘려 가는 게 이 저장소의 목적이에요.

## 사용자가 "식구를 추가해줘 / 방을 만들어줘"라고 하면

대부분의 작업은 **`company.config.ts` 한 파일**에서 끝나요.

1. **먼저 물어보세요** — 이름 / 맡은 일(이름표에 뜨는 말) / 살 방 / 연결할 앱 주소.
   사용자가 정하지 않은 이름·역할을 지어내지 마세요. 앱 주소도 추측하지 말고 사용자에게 받으세요.
2. **방이 필요하면 `ZONES`에 추가** — `{ id: "work", name: "업무방", icon: "💼" }`.
   `id`는 영문, 겹치지 않게. 방을 추가하면 집에 방이 저절로 붙어요(아래 "집이 자라는 규칙").
   한번 쓴 `id`는 바꾸지 마세요 — 사용자 브라우저에 저장된 방 자리 순서가 이 id를 기억해요.
3. **식구는 `STAFF_LIST`에 추가** — `zone`(방 id), `name`(겹치지 않게), `role`, `thoughts`(혼잣말 2~4개),
   `url`, `lpc`(모습). 없는 방 id를 적으면 현관에서 지내요.
4. **예시 식구("첫 식구")** 는 사용자가 첫 진짜 식구를 들이면 지울지 물어보세요. 지우면 안 되는 건 아니에요.
5. 끝나면 `npm run build`로 확인하세요.

### 식구 모습(`lpc`) 고르는 법

- 가장 쉬운 방법: 사용자에게 화면에서 식구를 누르고 **🎨 모습 바꾸기**로 고르라고 하세요. 고른 모습은 그
  브라우저에만 저장되니, 모두에게 같게 보이려면 고른 값을 `lpc`에 옮겨 적어요.
- 직접 적을 땐 `app/game/lpcCatalog.ts`(+ `lpcExtras.json`)에 **있는 스타일·색 이름만** 쓰세요.
  예: `hair.style` = bob · bob_side_part · curly_short · ponytail · bangs_bun …,
  `torso.style` = tshirt · shortsleeve · longsleeve · cardigan …, `legs.style` = pants · formal · shorts · skirt(여성만).
- 그림 파일은 `public/lpc/`에 있는 것뿐이에요. 새 LPC 파츠가 필요하면 원본 그림을 따로 받아 넣어야 하니
  사용자에게 먼저 말하세요(작가 표기도 `CREDITS.md`·`CREDITS-LPC.csv`에 추가해야 해요).

## 지켜야 할 것

- **출처 표기를 지우지 마세요** — 화면 맨 아래 `CREDIT`(company.config.ts), `LICENSE`, `CREDITS.md`,
  `CREDITS-LPC.csv`. 특히 LPC 그림은 CC-BY-SA/GPL이라 작가 표기가 의무예요.
- **비밀번호·API 키를 코드에 넣지 마세요.** 이 사이트는 공개 주소로 배포돼요. 서버 저장이 필요해지면
  쓰기에는 꼭 서버 쪽 비밀번호 검사를 두고, 키는 `.env.local`(커밋 안 됨)과 Vercel 환경변수에만 두세요.
- **가짜 숫자를 만들지 마세요** — 식구 위에 숫자·상태를 띄우는 기능을 만들 땐 실제 데이터로만.
- 집 안 그림(이름표·말풍선 등 배경이 고정된 곳)의 글자·테두리 색은 `--ink-fixed`, 패널·카드처럼 배경이
  화면 색을 따라가는 곳은 `--ink`를 써요.

## 기능을 더 붙이고 싶다고 하면

이 템플릿은 일부러 **가장 기본만** 남겨 뒀어요. 사용자가 원하면 하나씩 붙이면 돼요. 예:

- **입력창이 있는 식구**(할 일 목록, 메모 등): 모달 컴포넌트를 만들고 `StaffEntry`에 `action` 같은 필드를
  추가해서, 식구 카드(`app/components/HousePanel.tsx`)에서 그 입력창을 열게 해요.
- **여러 기기에서 같은 데이터**: 지금은 모습·방 자리만 브라우저(localStorage)에 저장해요
  (`useStaffAppearance.ts`, `page.tsx`의 `house_order`). 서버 저장으로 바꿀 땐 위 "비밀번호" 규칙을 지켜요.
- **식구별 일과**(특정 시간에 어느 방으로 가기 등): `app/game/HouseWorld.tsx`의 걷기 루프·`route()`를 보세요.

## 구조

```
company.config.ts       ← 집 이름·날씨 위치·출처 / ZONES(방) / STAFF_LIST(식구) — 보통 여기만 고침
app/
  page.tsx               ← 화면 전체: 위쪽 조작 칸(출근·근무·자유시간·퇴근·사진·속도), 집, 오른쪽 패널, 모습 바꾸기 창
  layout.tsx · globals.css · office.css
  game/
    house.ts             ← 방 목록과 집이 자라는 규칙(computeLayout), 식구 자리(STAFF_HOME)
    HouseWorld.tsx        ← 집 그리기 + 걷기 rAF 루프 + 카메라 + 방 자리 바꾸기 + 휴대폰 보기
    LpcSprite.tsx · lpcCatalog.ts · lpcExtras.json ← 식구 그림(LPC 레이어)과 고를 수 있는 목록
    PetSprite.tsx · OfficeWindow.tsx(창밖 날씨) · SeasonalTheme.tsx(12월 눈)
  components/
    HousePanel.tsx        ← 오른쪽 패널: 집 모양 / 식구 카드
    AvatarCustomizerModal.tsx · useStaffAppearance.ts ← 🎨 모습 바꾸기
    LiveClock.tsx · PwaRegister.tsx
```

### 집이 자라는 규칙 (`house.ts`)

- 방 = 현관 + `ZONES`마다 하나. 한 방에 식구가 4명을 넘으면 두 칸짜리 방.
- 새 방은 아래층부터·왼쪽부터 빈칸에 붙고, 층이 다 차면 위로 한 층, 층 수가 "가로 칸 수 - 1"이 되면
  옆으로 한 칸 넓힘(기본 가로 4칸). 방 자리 바꾸기(⇄)는 같은 크기 방끼리 맞바꿈.
- 걷기는 React state가 아니라 rAF 루프에서 DOM을 직접 움직여요(성능). 층이 다르면 왼쪽 계단실을 거쳐 가요.
  등장·퇴장 순간에만 React state(`present`)를 써요.

## 명령어

```bash
npm install
npm run dev       # http://localhost:3000 (Node 22+)
npm run build     # 배포 전 확인 (Vercel도 이 명령)
npx tsc --noEmit  # 타입 체크
```

배포는 GitHub에 push하면 연결된 Vercel이 알아서 해요. 빌드나 타입 에러가 있으면 고친 뒤 push하세요.

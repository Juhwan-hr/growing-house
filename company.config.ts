// ============================================================
//  자라는 집 설정 — 대부분은 이 파일 하나만 고치면 됩니다
// ============================================================
//  내 프로그램(앱)들을 "식구"로 만들어, 옆에서 잘라 본 집 한 채에 방별로 살게 합니다.
//  방(ZONES)을 하나 추가하면 집에 방이 저절로 하나 붙고, 식구(STAFF_LIST)를 추가하면
//  그 방에 들어와 삽니다.
//
//  ⚠️ 규칙 하나: 아래 예시 방의 id(bedroom·work·hobby·growth·studio)는 기본 배치에 쓰입니다.
//   이름(name)·아이콘(icon)은 마음대로 바꾸세요. 새 방은 새 id로 추가하면 됩니다.
// ============================================================

/** 집 기본 정보 */
export const COMPANY = {
  /** 왼쪽 위 이름표에 뜨는 이름 */
  name: "MY GROWING HOUSE",
  /** 이름표 배지·아이콘에 들어갈 글자 1개 (이모지도 됩니다) */
  logoLetter: "🏠",
  /** 브라우저 탭 제목 */
  pageTitle: "자라는 집 — 내 프로그램들이 사는 집",
  /** 검색·공유될 때 뜨는 설명 */
  description: "내 프로그램들이 식구가 되어 방마다 사는, 옆에서 잘라 본 작은 집",
  /** 집을 처음 연 날 (YYYY-MM-DD) — "함께한 지 N일째" 계산에 씁니다 */
  openedAt: "2026-10-07",
} as const;

/** 창밖 날씨를 가져올 위치(위도·경도). 기본값은 서울 시청 */
export const WEATHER = { latitude: 37.5665, longitude: 126.978 } as const;

/** 집 안 가구에 걸 링크 — 비워 두면 누를 수 없는 그냥 가구가 됩니다 */
export const HOUSE_LINKS = {
  /** 현관 게시판(쪽지가 붙는 곳)을 눌렀을 때 열 주소 */
  board: "",
  /** 안방 책장을 눌렀을 때 열 주소 */
  shelf: "",
  /** 책장 위 작은 이름표 */
  shelfLabel: "책장",
};

/** 화면 맨 아래 원작 표기 — 이 템플릿으로 만든 집이라면 남겨 주시면 고마워요 */
export const CREDIT = {
  text: "자라는 집 템플릿 · made by 좌니",
  url: "https://github.com/Juhwan-hr/growing-house",
};

export type ZoneEntry = {
  /** 고유 id(영문) */
  id: string;
  name: string;
  short: string;
  icon: string;
  desc: string;
};

export const ZONES: ZoneEntry[] = [
  { id: "bedroom", name: "안방", short: "my.room", icon: "🛋️", desc: "집주인과 단짝이 지내는 방" },
  { id: "studio", name: "작업실", short: "studio", icon: "🖌️", desc: "그림·글·영상 같은 창작 앱이 사는 방" },
  { id: "work", name: "업무방", short: "work.room", icon: "💼", desc: "일 관련 앱이 사는 방" },
  { id: "hobby", name: "취미방", short: "hobby.room", icon: "🎨", desc: "취미·생활 앱이 사는 방" },
  { id: "growth", name: "자기개발실", short: "growth.room", icon: "📚", desc: "운동·공부 앱이 사는 방" },
];

/** 식구 옆에 놓이는 "맡은 물건" 그림(public/house/item-*.png) */
export type HouseItem =
  | "monitor" | "mailbox" | "piggy" | "clock" | "notepad" | "fridge" | "calendar" | "suitcase" | "easel" | "paper" | "map";

/**
 * 식구 한 명.
 * - zone: 사는 방 id(위 ZONES, 또는 "secretary" = 비서실)
 * - name: 이름(내부 키 — 겹치면 안 돼요) / role: 맡은 일(있으면 이름표에 이걸 보여줘요)
 * - url: 식구를 눌렀을 때 열 내 앱 주소
 * - action: 주소 대신 집 안 입력창을 여는 식구 — "todo-work"·"todo-personal"(할 일), "reminder"(오늘 알림)
 * - item: 옆에 놓이는 물건(없으면 모니터) / thoughts: 가끔 하는 혼잣말
 * - lpc: 모습(화면의 🎨 모습 바꾸기로 고르는 게 더 쉬워요)
 * - alwaysPresent: 출근·퇴근과 상관없이 늘 집에 있음(집주인·단짝)
 */
export type StaffEntry = {
  zone: ZoneEntry["id"];
  name: string;
  item?: HouseItem;
  role?: string;
  thoughts: string[];
  gender?: "male" | "female";
  top?: "tee" | "hoodie" | "collar" | "vest";
  outfit?: "dress";
  hairpin?: boolean;
  halo?: boolean;
  url?: string;
  action?: "reminder" | "todo-work" | "todo-personal";
  alwaysPresent?: boolean;
  lpc?: import("./app/game/LpcSprite").LpcConfig;
};

// 아래는 예시 식구예요. 내 앱에 맞게 이름·맡은 일·방·주소(url)를 바꿔 쓰세요.
// "집주인"·"단짝"·"박일해"·"일감이"·"짬짬이"·"달리미"·"냠냠셰프"는 집 안 장면(나왔어·알림·할 일·
// 달리기·식사 시간)에 이름으로 쓰이니, 이름을 바꾸려면 app/game/HouseWorld.tsx의 WHO도 같이 바꿔 주세요.
export const STAFF_LIST: StaffEntry[] = [
  {
    zone: "bedroom",
    name: "집주인",
    thoughts: ["오늘 하루도 다들 고생 많았어요.", "가끔은 아무것도 안 하고 쉬는 것도 중요해요."],
    alwaysPresent: true,
    lpc: {
      gender: "male",
      skin: "light",
      hair: { style: "bob", color: "black" },
      torso: { style: "tshirt", color: "sky" },
      legs: { style: "pants", color: "navy" },
      feet: { style: "shoes", color: "white" },
    },
  },
  {
    zone: "bedroom",
    name: "단짝",
    gender: "female",
    thoughts: ["오늘은 여기서 좀 쉬어갈게요.", "다들 열심히 일하네요, 저도 응원할게요."],
    halo: true,
    alwaysPresent: true,
    lpc: {
      gender: "female",
      skin: "light",
      hair: { style: "ponytail", color: "dark_brown" },
      torso: { style: "cardigan", color: "pink" },
      legs: { style: "skirt", color: "tan" },
      feet: { style: "shoes", color: "white" },
    },
  },
  {
    zone: "secretary",
    name: "박일해",
    item: "clock",
    role: "할 일 알림이",
    thoughts: ["시각이랑 할 일을 적어두시면 시간 맞춰 알려드릴게요.", "오늘 그 시간에 할 일, 잊지 않으셨죠?"],
    action: "reminder",
    lpc: {
      gender: "male",
      skin: "light",
      hair: { style: "bob", color: "black" },
      torso: { style: "tshirt", color: "yellow" },
      legs: { style: "pants", color: "tan" },
      feet: { style: "shoes", color: "brown" },
    },
  },
  {
    zone: "secretary",
    name: "일감이",
    item: "notepad",
    role: "업무 할 일 관리자",
    thoughts: ["업무로 해야 할 일들을 적어두시면 하나씩 지워드릴게요.", "끝낸 업무는 체크! 남은 일이 한눈에 보여요."],
    action: "todo-work",
    lpc: {
      gender: "male",
      skin: "amber",
      hair: { style: "bob", color: "dark_brown" },
      torso: { style: "cardigan", color: "navy" },
      legs: { style: "pants", color: "navy" },
      feet: { style: "shoes", color: "black" },
    },
  },
  {
    zone: "secretary",
    name: "짬짬이",
    item: "notepad",
    role: "개인 할 일 관리자",
    gender: "female",
    thoughts: ["개인적으로 해야 할 일들을 적어두시면 하나씩 지워드릴게요.", "끝낸 일은 체크! 짬짬이 하나씩 해치워봐요."],
    action: "todo-personal",
    lpc: {
      gender: "female",
      skin: "light",
      hair: { style: "curly_short", color: "chestnut" },
      torso: { style: "cardigan", color: "pink" },
      legs: { style: "skirt", color: "navy" },
      feet: { style: "shoes", color: "white" },
    },
  },
  {
    zone: "growth",
    name: "달리미",
    item: "map",
    role: "러닝 코치",
    thoughts: ["이번 주 달린 거리부터 정리할게요.", "오늘도 가볍게 한 바퀴 어때요?"],
    lpc: {
      gender: "male",
      skin: "light",
      hair: { style: "curly_short", color: "black" },
      torso: { style: "tshirt", color: "white" },
      legs: { style: "shorts", color: "black" },
      feet: { style: "shoes", color: "white" },
    },
  },
  {
    zone: "growth",
    name: "책벌레",
    item: "paper",
    role: "독서 기록 도우미",
    gender: "female",
    thoughts: ["오늘 읽은 쪽수만 알려주세요.", "밑줄 그은 문장은 따로 모아둘게요."],
    lpc: {
      gender: "female",
      skin: "light",
      hair: { style: "bob", color: "black" },
      torso: { style: "longsleeve", color: "gray" },
      legs: { style: "pants", color: "navy" },
      feet: { style: "shoes", color: "black" },
    },
  },
  {
    zone: "hobby",
    name: "냠냠셰프",
    item: "fridge",
    role: "레시피 셰프",
    thoughts: ["오늘은 뭘 만들어 볼까 레시피부터 훑어볼게요.", "재료 손질부터 완성 사진까지 기록해둘게요."],
    lpc: {
      gender: "male",
      skin: "bronze",
      hair: { style: "curly_short", color: "dark_brown" },
      torso: { style: "tshirt", color: "white" },
      legs: { style: "pants", color: "tan" },
      feet: { style: "shoes", color: "white" },
    },
  },
  {
    zone: "hobby",
    name: "떠나요",
    item: "suitcase",
    role: "여행 플래너",
    thoughts: ["다음 여행 일정부터 순서대로 정리해볼게요.", "숙소랑 맛집도 빼먹지 않고 챙겨둘게요."],
    lpc: {
      gender: "male",
      skin: "taupe",
      hair: { style: "bob_side_part", color: "black" },
      torso: { style: "tshirt", color: "maroon" },
      legs: { style: "shorts", color: "black" },
      feet: { style: "shoes", color: "black" },
    },
  },
  {
    zone: "studio",
    name: "그림쟁이",
    item: "easel",
    role: "그림 작업 매니저",
    gender: "female",
    thoughts: ["오늘 스케치, 같이 봐줄게요.", "색은 마지막에 천천히 골라요."],
    lpc: {
      gender: "female",
      skin: "light",
      hair: { style: "bangs_bun", color: "platinum" },
      torso: { style: "cardigan", color: "sky" },
      legs: { style: "skirt", color: "tan" },
      feet: { style: "shoes", color: "white" },
    },
  },
  {
    zone: "work",
    name: "회의왕",
    role: "회의록 정리",
    thoughts: ["회의 끝나면 결정된 것만 세 줄로 정리할게요.", "다음 할 일은 담당자 이름이랑 같이 적어둬요."],
    lpc: {
      gender: "male",
      skin: "light",
      hair: { style: "bob_side_part", color: "dark_brown" },
      torso: { style: "longsleeve", color: "white" },
      legs: { style: "formal", color: "gray" },
      feet: { style: "shoes", color: "black" },
    },
  },
];

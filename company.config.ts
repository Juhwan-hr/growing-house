// ============================================================
//  자라는 집 설정 — 이 파일 하나만 고치면 됩니다
// ============================================================
//  처음엔 현관 하나뿐인 빈 집이에요. ZONES에 방을 하나 추가하면 집에 방이 저절로 붙고
//  (층이 차면 위로 한 층, 더 차면 옆으로 한 칸), STAFF_LIST에 식구를 추가하면 그 방에 들어와 살아요.
// ============================================================

/** 집 기본 정보 */
export const COMPANY = {
  /** 왼쪽 위 이름표에 뜨는 이름 */
  name: "MY GROWING HOUSE",
  /** 이름표 배지·아이콘에 들어갈 글자 1개 (이모지도 됩니다) */
  logoLetter: "🏠",
  /** 브라우저 탭 제목 */
  pageTitle: "자라는 집",
  /** 검색·공유될 때 뜨는 설명 */
  description: "내 프로그램들이 식구가 되어 방마다 사는, 옆에서 잘라 본 작은 집",
  /** 집을 처음 연 날 (YYYY-MM-DD) — "함께한 지 N일째" 계산에 씁니다 */
  openedAt: "2026-10-07",
} as const;

/** 집 하늘에 띄울 실제 날씨의 위치(위도·경도). 기본값은 서울 시청 */
export const WEATHER = { latitude: 37.5665, longitude: 126.978 } as const;

/** 화면 맨 아래 원작 표기 — 이 템플릿으로 만든 집이라면 남겨 주시면 고마워요 */
export const CREDIT = {
  text: "자라는 집 템플릿 · made by 좌니",
  url: "https://github.com/Juhwan-hr/growing-house",
};

/** 방 하나 */
export type ZoneEntry = {
  /** 고유 id(영문, 겹치면 안 돼요) */
  id: string;
  /** 방 이름 */
  name: string;
  /** 방 아이콘(이모지) */
  icon: string;
};

/**
 * 방 목록 — 현관은 항상 있고, 여기 적은 방이 순서대로 붙어요. 예:
 *   { id: "work", name: "업무방", icon: "💼" },
 *   { id: "hobby", name: "취미방", icon: "🎨" },
 */
export const ZONES: ZoneEntry[] = [];

/**
 * 식구 한 명.
 * - zone: 사는 방 id(위 ZONES). 없는 방을 적으면 현관에서 지내요
 * - name: 이름(겹치면 안 돼요) / role: 맡은 일(있으면 이름표에 이걸 보여줘요)
 * - url: 식구 카드의 "앱 열기"로 열 내 앱 주소
 * - thoughts: 가끔 하는 혼잣말
 * - lpc: 모습 — 화면에서 식구를 누르고 "🎨 모습 바꾸기"로 고른 뒤 저장하는 게 제일 쉬워요
 * - alwaysPresent: 출근·퇴근과 상관없이 늘 집에 있음
 * - halo: 뒤에 은은한 후광
 */
export type StaffEntry = {
  zone: string;
  name: string;
  role?: string;
  thoughts: string[];
  url?: string;
  alwaysPresent?: boolean;
  halo?: boolean;
  lpc?: import("./app/game/LpcSprite").LpcConfig;
};

/**
 * 식구 목록 — 출근을 누르면 들어오고, 퇴근을 누르면 나가요(alwaysPresent는 늘 있음).
 * 아래 "첫 식구"는 예시예요. 이름·맡은 일·혼잣말을 바꾸고 url에 내 앱 주소를 넣거나,
 * 이 항목을 복사해서 식구를 늘려 보세요. 방(ZONES)을 만들었다면 zone에 그 방 id를 적어요.
 */
export const STAFF_LIST: StaffEntry[] = [
  {
    zone: "entrance",
    name: "첫 식구",
    role: "연결할 앱을 추가해주세요",
    thoughts: [
      "안녕하세요! 이 집의 첫 식구예요. 연결할 앱을 추가해주세요.",
      "company.config.ts에서 제 이름이랑 앱 주소를 정해 주세요.",
      "방을 하나 만들어 주면 집이 한 칸 자라요.",
      "식구가 늘면 다 같이 출근하고 퇴근해요.",
    ],
    // url: "https://내-앱-주소",
    alwaysPresent: true,
    lpc: {
      gender: "female",
      skin: "light",
      hair: { style: "ponytail", color: "dark_brown" },
      torso: { style: "cardigan", color: "sky" },
      legs: { style: "pants", color: "navy" },
      feet: { style: "shoes", color: "white" },
    },
  },
];

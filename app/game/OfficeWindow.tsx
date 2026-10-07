"use client";

// 집 맨 위 창밖 풍경 — 실제 시각에 맞춰 하늘이 바뀌고(아침·낮엔 도시, 저녁·밤엔 정원),
// company.config.ts의 WEATHER 좌표로 실제 날씨(맑음·흐림·비·눈)를 보여줍니다.
import { useEffect, useState } from "react";
import { WEATHER } from "../../company.config";

type TimeOfDay = "morning" | "day" | "evening" | "night";
type Weather = "sunny" | "cloudy" | "rain" | "snow";

const SKY: Record<TimeOfDay, [string, string]> = {
  morning: ["#ffd9a8", "#ffb199"],
  day: ["#8fd3f4", "#c7ecfb"],
  evening: ["#ff9a76", "#5b3a6e"],
  night: ["#1c2340", "#0b0e1f"],
};

/** 시간대별 하늘 위에 얹는 밝기/채도 무드 — 타일 자체는 하나뿐이라 텍스처를
 *  새로 안 만들고 이 필터만으로 아침/저녁/밤 분위기를 냅니다. */
const SCENE_MOOD: Record<TimeOfDay, string> = {
  morning: "saturate(1.05)",
  day: "none",
  evening: "brightness(.82) saturate(1.15)",
  night: "brightness(.42) saturate(.75)",
};

/** 아침·낮엔 도시 스카이라인, 저녁·밤엔 차분한 정원(2026-09-30). */
function sceneFor(t: TimeOfDay): "skyline" | "garden" {
  return t === "morning" || t === "day" ? "skyline" : "garden";
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex([r, g, b]: number[]): string {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}
function mixHex(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex([r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t]);
}
/** 부드러운 2색 보간 대신 4단계 하드 스톱 밴드로 "도트 하늘"을 만듭니다 */
function bandedSky(from: string, to: string): string {
  const c0 = from;
  const c1 = mixHex(from, to, 0.33);
  const c2 = mixHex(from, to, 0.66);
  const c3 = to;
  return `linear-gradient(180deg, ${c0} 0%, ${c0} 25%, ${c1} 25%, ${c1} 50%, ${c2} 50%, ${c2} 75%, ${c3} 75%, ${c3} 100%)`;
}

type WallStyle = "a" | "b";
type RoofStyle = "red" | "orange";
const WALL_URL: Record<WallStyle, string> = {
  a: "/kenney/win-wall-a.png",
  b: "/kenney/win-wall-b.png",
};
const ROOF_URL: Record<RoofStyle, string> = {
  red: "/kenney/win-roof-red.png",
  orange: "/kenney/win-roof-orange.png",
};
const GARDEN_GRASS_URL = "/kenney/win-grass.png";
const GARDEN_TREE_URL = [
  "/kenney/win-tree-a.png",
  "/kenney/win-tree-b.png",
  "/kenney/win-tree-c.png",
  "/kenney/win-tree-d.png",
  "/kenney/win-tree-e.png",
];

const WEATHER_ICON: Record<Weather, string> = {
  sunny: "☀️",
  cloudy: "☁️",
  rain: "🌧️",
  snow: "❄️",
};

const TIME_LABEL: Record<TimeOfDay, string> = {
  morning: "아침",
  day: "낮",
  evening: "저녁",
  night: "밤",
};

function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 6 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "evening";
  return "night";
}

/** 사용자 기기 시간대와 무관하게 항상 한국 시간(KST) 기준 시각을 구합니다 */
function getKoreaHour(): number {
  const hourPart = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date()).find((p) => p.type === "hour");
  return hourPart ? Number(hourPart.value) % 24 : new Date().getHours();
}

const WEATHER_POOL: Weather[] = ["sunny", "sunny", "cloudy", "cloudy", "rain", "snow"];

/** company.config.ts의 WEATHER 좌표 기준 실제 날씨 — API 키가 필요 없는 Open-Meteo를 씁니다 */
const WEATHER_API_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${WEATHER.latitude}&longitude=${WEATHER.longitude}&current=weather_code&timezone=Asia%2FSeoul`;

/** WMO 날씨 코드(Open-Meteo)를 이 화면에서 쓰는 4종 날씨로 단순화합니다 */
function weatherFromCode(code: number): Weather {
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) return "rain";
  if (code === 0 || code === 1) return "sunny"; // 맑음·대체로 맑음
  return "cloudy"; // 구름 많음·흐림·안개 등
}

/** 건물 배열(아침·낮) — 매번 같은 실루엣이라 창밖 풍경이 안정적으로 보인다.
 *  x/w는 창문 배너 폭에 대한 %(합이 100이 되도록), h는 px. */
const SKYLINE: { x: number; w: number; h: number; wall: WallStyle; roof: RoofStyle }[] = [
  { x: 0, w: 14, h: 34, wall: "a", roof: "red" },
  { x: 15, w: 10, h: 52, wall: "b", roof: "orange" },
  { x: 26, w: 16, h: 40, wall: "a", roof: "orange" },
  { x: 43, w: 12, h: 64, wall: "b", roof: "red" },
  { x: 56, w: 14, h: 30, wall: "a", roof: "red" },
  { x: 71, w: 10, h: 48, wall: "b", roof: "orange" },
  { x: 82, w: 18, h: 38, wall: "a", roof: "orange" },
];

/** 정원(저녁·밤) — 나무 5그루를 폭에 고르게 흩뿌리되 크기를 살짝씩 다르게 */
const GARDEN_TREES: { left: string; tree: number; w: number; h: number }[] = [
  { left: "4%", tree: 0, w: 18, h: 24 },
  { left: "22%", tree: 4, w: 16, h: 22 },
  { left: "42%", tree: 2, w: 14, h: 18 },
  { left: "60%", tree: 3, w: 15, h: 22 },
  { left: "80%", tree: 1, w: 17, h: 20 },
];

/** 구름 배치 — 맑음/흐림일 때만 뜨고, 밤에는 어둡게 톤을 낮춥니다 */
const CLOUDS = [
  { left: "10%", top: 14 },
  { left: "48%", top: 8 },
  { left: "78%", top: 18 },
];

export default function OfficeWindow() {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("day");
  const [weather, setWeather] = useState<Weather>("sunny");

  useEffect(() => {
    const update = () => setTimeOfDay(getTimeOfDay(getKoreaHour()));
    update();
    // 5분마다 다시 확인해서 시간대가 바뀌면 풍경도 따라 바뀝니다
    const timer = window.setInterval(update, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let alive = true;
    const fetchWeather = () => {
      fetch(WEATHER_API_URL)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => {
          const code = data?.current?.weather_code;
          if (alive && typeof code === "number") setWeather(weatherFromCode(code));
        })
        .catch(() => {
          // 날씨 API를 못 가져오면 그냥 랜덤 날씨로 대체합니다
          if (alive) setWeather(WEATHER_POOL[Math.floor(Math.random() * WEATHER_POOL.length)]);
        });
    };
    fetchWeather();
    // 날씨는 시간대보다 천천히 바뀌니 20분마다만 다시 확인합니다
    const timer = window.setInterval(fetchWeather, 20 * 60 * 1000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  const [from, to] = SKY[timeOfDay];
  const isNight = timeOfDay === "night";
  const showClouds = weather === "sunny" || weather === "cloudy";
  const scene = sceneFor(timeOfDay);

  return (
    <div className="office-window" style={{ background: bandedSky(from, to) }}>
      <span className="ow-icon">{isNight ? "🌙" : WEATHER_ICON[weather]}</span>
      {showClouds
        ? CLOUDS.map((c, i) => (
            <span
              key={i}
              className={`ow-cloud${isNight ? " dim" : ""}`}
              style={{ left: c.left, top: c.top }}
            />
          ))
        : null}
      {weather === "rain" ? (
        <div className="ow-precip" aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => (
            <span
              key={i}
              className="ow-drop"
              style={{ left: `${(i * 29) % 100}%`, animationDuration: `${0.5 + (i % 4) * 0.15}s`, animationDelay: `${(i % 5) * -0.2}s` }}
            />
          ))}
        </div>
      ) : null}
      {weather === "snow" ? (
        <div className="ow-precip" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              className="ow-flake"
              style={{ left: `${(i * 37) % 100}%`, animationDuration: `${3 + (i % 3)}s`, animationDelay: `${(i % 5) * -0.6}s` }}
            >
              ❄
            </span>
          ))}
        </div>
      ) : null}
      {isNight ? (
        <>
          <span className="ow-star" style={{ left: "38%", top: 10 }} />
          <span className="ow-star" style={{ left: "52%", top: 20 }} />
          <span className="ow-star" style={{ left: "65%", top: 8 }} />
          <span className="ow-star" style={{ left: "22%", top: 24 }} />
        </>
      ) : null}

      {scene === "skyline" ? (
        <div className="ow-skyline" style={{ filter: SCENE_MOOD[timeOfDay] }}>
          {SKYLINE.map((b, i) => (
            <div
              key={i}
              className="ow-building"
              style={{
                left: `${b.x}%`,
                width: `${b.w}%`,
                height: b.h,
                backgroundImage: `url(${WALL_URL[b.wall]})`,
              }}
            >
              <div className="ow-roof" style={{ backgroundImage: `url(${ROOF_URL[b.roof]})` }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="ow-garden" style={{ filter: SCENE_MOOD[timeOfDay] }}>
          <div className="ow-garden-ground" style={{ backgroundImage: `url(${GARDEN_GRASS_URL})` }} />
          <div className="ow-garden-fence" />
          {GARDEN_TREES.map((t, i) => (
            <img
              key={i}
              className="ow-garden-tree"
              src={GARDEN_TREE_URL[t.tree]}
              alt=""
              style={{ left: t.left, width: t.w, height: t.h }}
            />
          ))}
        </div>
      )}

      <div className="ow-frame" />
      <span className="ow-label">{TIME_LABEL[timeOfDay]}</span>
    </div>
  );
}

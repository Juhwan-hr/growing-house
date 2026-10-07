"use client";

// 실제 날씨(맑음·흐림·비·눈) — company.config.ts의 WEATHER 위치 기준. 집 하늘에 구름·비·눈으로 그립니다.
// API 키가 필요 없는 Open-Meteo를 쓰고, 못 가져오면 그냥 맑음으로 둡니다(가짜 비·눈을 만들지 않게).
import { useEffect, useState } from "react";
import { WEATHER } from "../../company.config";

export type Weather = "sunny" | "cloudy" | "rain" | "snow";

const WEATHER_API_URL = `https://api.open-meteo.com/v1/forecast?latitude=${WEATHER.latitude}&longitude=${WEATHER.longitude}&current=weather_code&timezone=auto`;

/** WMO 날씨 코드(Open-Meteo)를 4종 날씨로 단순화 */
function weatherFromCode(code: number): Weather {
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) return "rain";
  if (code === 0 || code === 1) return "sunny";
  return "cloudy";
}

export function useWeather(): Weather {
  const [weather, setWeather] = useState<Weather>("sunny");
  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch(WEATHER_API_URL)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => {
          const code = data?.current?.weather_code;
          if (alive && typeof code === "number") setWeather(weatherFromCode(code));
        })
        .catch(() => {});
    };
    load();
    const timer = window.setInterval(load, 20 * 60 * 1000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);
  return weather;
}

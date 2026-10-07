// 집 상태 저장소 — 이 템플릿은 서버 없이 "이 브라우저(localStorage)"에 저장합니다.
// 알림·방 자리·오늘 있었던 일·들인 식구가 모두 여기로 갑니다. 다른 기기와 맞추고 싶으면
// 이 두 함수만 서버(예: Supabase) 호출로 바꾸면 됩니다 — 부르는 쪽은 그대로 둬도 됩니다.

const PREFIX = "house_state:";

export class SharedPasswordError extends Error {}

export async function fetchShared<T>(key: string): Promise<{ ok: boolean; value: T | null }> {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return { ok: true, value: raw ? (JSON.parse(raw) as T) : null };
  } catch {
    return { ok: false, value: null };
  }
}

/** 값 통째로 저장({ value }) 또는 목록 뒤에 하나 붙이기({ append }, 80개까지) */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function putShared(key: string, body: { value?: unknown; append?: unknown }, _password?: string): Promise<unknown> {
  let next = body.value;
  if (body.append !== undefined) {
    const prev = (await fetchShared<unknown[]>(key)).value;
    next = [...(Array.isArray(prev) ? prev : []), body.append].slice(-80);
  }
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(next));
  } catch {
    throw new Error("이 브라우저에 저장할 수 없어요(사생활 보호 모드인지 확인해 주세요).");
  }
  return next;
}

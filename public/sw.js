// 오프라인 캐싱은 하지 않지만, 브라우저가 "홈 화면에 추가"를 제안하려면
// fetch 핸들러가 있는 서비스워커가 등록돼 있어야 해서 최소한으로 둡니다.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});

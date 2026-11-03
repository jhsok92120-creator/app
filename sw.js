// 앱 파일을 캐시해 오프라인에서도 동작하게 합니다.
// 파일을 수정하면 CACHE 버전을 올려야 사용자에게 새 버전이 반영됩니다.
const CACHE = "iqeq-v3";
const FONT_CACHE = "ssuk-fonts-v1";
const ASSETS = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "questions.js",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  const keep = [CACHE, FONT_CACHE];
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  // 구글 폰트: 한 번 받은 글꼴은 저장해 두고 오프라인에서도 사용
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.open(FONT_CACHE).then((c) =>
        c.match(e.request).then(
          (hit) =>
            hit ||
            fetch(e.request).then((res) => {
              if (res.ok || res.type === "opaque") c.put(e.request, res.clone());
              return res;
            })
        )
      )
    );
    return;
  }

  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});

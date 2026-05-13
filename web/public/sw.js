/**
 * Service Worker — cache ảnh persistent trên disk
 *
 * Mục tiêu:
 *   - Browser memory cache mất khi đóng tab. Service Worker cache lưu disk → giữ lâu dài.
 *   - Tăng tốc lần 2+ load: ảnh đã cache không cần fetch network.
 *   - Hỗ trợ offline: ảnh cũ vẫn hiển thị khi mất mạng.
 *
 * Strategy:
 *   - Cache-first cho ảnh (TMDB poster, Unsplash banner, /assets/*)
 *   - Network-first cho HTML/JS/CSS (luôn lấy bản mới)
 *   - Tự động xoá cache cũ khi có version mới
 */

const CACHE_VERSION = 'v1';
const IMAGE_CACHE = `cinema-images-${CACHE_VERSION}`;
const MAX_AGE_DAYS = 7;
const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

// Domains cần cache ảnh
const IMAGE_HOSTS = [
  'image.tmdb.org',
  'images.unsplash.com',
  'cdn.galaxycine.vn',
  'm.media-amazon.com',
  'upload.wikimedia.org',
];

// Detect ảnh request
function isImageRequest(request) {
  const url = new URL(request.url);
  if (request.destination === 'image') return true;
  if (IMAGE_HOSTS.some(host => url.hostname === host || url.hostname.endsWith('.' + host))) {
    return true;
  }
  if (/\.(jpg|jpeg|png|webp|avif|gif|svg)(\?|$)/i.test(url.pathname)) return true;
  return false;
}

// Install: skip waiting để activate ngay
self.addEventListener('install', () => self.skipWaiting());

// Activate: xoá cache cũ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('cinema-images-') && k !== IMAGE_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch handler — cache-first cho ảnh
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (!isImageRequest(request)) return;

  event.respondWith(
    caches.open(IMAGE_CACHE).then(async cache => {
      const cached = await cache.match(request);
      if (cached) {
        // Verify chưa quá hạn
        const cachedDate = cached.headers.get('sw-cached-at');
        if (cachedDate && Date.now() - parseInt(cachedDate) < MAX_AGE_MS) {
          return cached;
        }
        // Hết hạn: refresh nhưng vẫn return cached trước
        fetchAndCache(request, cache);
        return cached;
      }
      // Chưa cache: fetch + cache
      return fetchAndCache(request, cache);
    })
  );
});

async function fetchAndCache(request, cache) {
  try {
    const response = await fetch(request);
    if (!response || response.status !== 200) return response;
    // Clone + thêm header timestamp
    const cloned = response.clone();
    const headers = new Headers(cloned.headers);
    headers.append('sw-cached-at', Date.now().toString());
    const wrapped = new Response(await cloned.blob(), {
      status: cloned.status,
      statusText: cloned.statusText,
      headers,
    });
    cache.put(request, wrapped.clone());
    return wrapped;
  } catch (err) {
    return new Response('', { status: 504 });
  }
}

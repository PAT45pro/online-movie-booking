import { useState, useEffect, useRef } from 'react';

/**
 * CachedImage cho web — wrapper quanh <img>
 *
 * Tính năng:
 *   1. Lazy loading native (loading="lazy")
 *   2. Tự động convert sang WebP qua Cloudinary fetch CDN (free tier)
 *      → giảm 30-50% kích thước file so với JPEG/PNG
 *   3. Resize on-the-fly theo width yêu cầu
 *   4. Browser tự cache theo HTTP Cache-Control của Cloudinary (1 năm)
 *   5. Fallback URL gốc nếu Cloudinary fail
 *   6. Skeleton/blur placeholder khi loading
 *
 * Cloudinary fetch URL pattern:
 *   https://res.cloudinary.com/<cloud>/image/fetch/<transformations>/<encoded_url>
 *
 * Free tier: 25 GB bandwidth/tháng — đủ cho đồ án sinh viên.
 *
 * Có thể tự host: nếu không muốn dùng Cloudinary, set VITE_USE_IMAGE_CDN=false
 * → ảnh load trực tiếp và browser vẫn cache theo header gốc.
 */

// Cloudinary demo cloud — TODO: thay bằng cloud của bạn (đăng ký free tại cloudinary.com)
const CLOUDINARY_CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD || 'demo';
const USE_CDN = import.meta.env.VITE_USE_IMAGE_CDN !== 'false';

/**
 * Build URL Cloudinary với:
 *   f_auto  → tự chọn format tốt nhất (WebP/AVIF) dựa vào browser
 *   q_auto  → tự chọn chất lượng nén tối ưu
 *   w_<n>   → resize theo width (giữ aspect ratio)
 */
function cdnUrl(originalUrl, width) {
  if (!USE_CDN || !originalUrl) return originalUrl;
  if (originalUrl.startsWith('data:') || originalUrl.startsWith('blob:')) return originalUrl;
  if (originalUrl.includes('res.cloudinary.com')) return originalUrl;

  const transforms = ['f_auto', 'q_auto'];
  if (width) transforms.push(`w_${width}`);
  const tStr = transforms.join(',');
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/fetch/${tStr}/${encodeURIComponent(originalUrl)}`;
}

/**
 * Props:
 *   src              - URL ảnh gốc
 *   alt              - text mô tả
 *   width            - resize width (auto chọn 300/500/800 cho TMDB)
 *   className, style - custom style
 *   priority         - 'high' để load eager (dùng cho banner trang chủ)
 *   placeholder      - URL ảnh nhỏ blur (optional)
 */
export default function CachedImage({
  src,
  alt = '',
  width,
  className = '',
  style = {},
  priority = 'normal',
  placeholder,
  onLoad,
  onError,
  ...rest
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
  }, [src]);

  if (!src) {
    return (
      <div
        className={className}
        style={{
          ...style,
          background: '#1A1F2E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#566573',
          fontSize: 12,
        }}
      >
        🎬
      </div>
    );
  }

  const finalSrc = errored ? src : cdnUrl(src, width);

  const handleLoad = (e) => {
    setLoaded(true);
    onLoad?.(e);
  };

  const handleError = (e) => {
    if (!errored) {
      setErrored(true);
    } else {
      onError?.(e);
    }
  };

  return (
    <img
      ref={imgRef}
      src={finalSrc}
      alt={alt}
      loading={priority === 'high' ? 'eager' : 'lazy'}
      decoding="async"
      fetchpriority={priority === 'high' ? 'high' : 'auto'}
      className={className}
      style={{
        background: placeholder ? `url(${placeholder}) center/cover` : '#1A1F2E',
        opacity: loaded ? 1 : 0.6,
        transition: 'opacity 0.3s ease',
        ...style,
      }}
      onLoad={handleLoad}
      onError={handleError}
      {...rest}
    />
  );
}

/**
 * Prefetch ảnh trước khi cần — dùng khi hover card phim, hover link...
 */
export function prefetchImage(url, width) {
  if (!url) return;
  const finalUrl = cdnUrl(url, width);
  const img = new Image();
  img.decoding = 'async';
  img.src = finalUrl;
}

export { cdnUrl };

/**
 * CachedImage - wrapper cho expo-image
 *
 * Lý do dùng thay vì React Native <Image>:
 *   - Cache disk + memory tự động (không tải lại ảnh đã có)
 *   - Hỗ trợ WebP native (file nhỏ hơn 30-50% so với JPEG)
 *   - Transition mượt khi chuyển ảnh (fade-in 200ms)
 *   - Placeholder + blurhash khi loading
 *   - Hỗ trợ priority (poster trang chủ ưu tiên cao)
 *
 * Usage:
 *   <CachedImage source={posterUrl} style={...} priority="high" />
 *   <CachedImage source={bannerUrl} placeholder={blurhash} />
 *
 * Backend nên serve ảnh ở format WebP nếu có (Cloudinary, ImageKit auto-convert).
 * Nếu URL ảnh là JPEG, expo-image vẫn cache, chỉ là không nén thêm được.
 */
import React from 'react';
import { Image as ExpoImage } from 'expo-image';
import { StyleSheet, View } from 'react-native';

// Placeholder nhẹ - ô màu xám với hiệu ứng shimmer (hoặc blurhash)
const DEFAULT_PLACEHOLDER = 'L184i9ofbHof00ayjsay~qj[ayj@';

/**
 * Props chính:
 *   - source: string URL hoặc { uri }
 *   - style: như Image của RN
 *   - priority: 'low' | 'normal' | 'high' - poster trang chủ nên 'high'
 *   - cachePolicy: 'memory' | 'disk' | 'memory-disk' (default) | 'none'
 *   - contentFit: 'cover' (default) | 'contain' | 'fill' | 'scale-down'
 *   - placeholder: blurhash string hoặc URL ảnh nhỏ
 *   - transition: ms - transition khi load xong (default 200)
 */
export default function CachedImage({
  source,
  style,
  priority = 'normal',
  cachePolicy = 'memory-disk',
  contentFit = 'cover',
  placeholder = DEFAULT_PLACEHOLDER,
  transition = 200,
  fallbackSource,
  ...rest
}) {
  // Convert string URL sang format { uri } cho expo-image
  const imageSource = typeof source === 'string' ? { uri: source } : source;

  return (
    <ExpoImage
      source={imageSource}
      style={[styles.image, style]}
      contentFit={contentFit}
      transition={transition}
      cachePolicy={cachePolicy}
      priority={priority}
      placeholder={placeholder}
      placeholderContentFit="cover"
      onError={fallbackSource ? () => {} : undefined}
      recyclingKey={typeof source === 'string' ? source : source?.uri}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: '#1A1F2E' },
});

/**
 * Helper: prefetch ảnh trước khi user vào trang
 * Vd: gọi khi user hover một phim để chuẩn bị ảnh detail
 */
export const prefetchImages = async (urls) => {
  if (!Array.isArray(urls)) urls = [urls];
  return Promise.all(
    urls.filter(Boolean).map(url => ExpoImage.prefetch(url))
  );
};

/**
 * Clear cache khi cần (vd: user logout)
 */
export const clearImageCache = async () => {
  await ExpoImage.clearMemoryCache();
  await ExpoImage.clearDiskCache();
};

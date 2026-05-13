import CachedImage from '../components/CachedImage';
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Loading from '../components/Loading';
import { contentApi } from '../api/client';

export default function PromotionDetailPage() {
  const { id } = useParams();
  const [promo, setPromo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contentApi.promotionDetail(id)
      .then(setPromo)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading />;
  if (!promo) return (
    <div className="container page">
      <div className="empty">
        <div className="empty-icon">😢</div>
        <div>Không tìm thấy ưu đãi</div>
        <Link to="/promotions" className="btn btn-primary mt-md">Xem các ưu đãi khác</Link>
      </div>
    </div>
  );

  const categoryLabel = {
    event: '🎉 Sự kiện',
    member: '⭐ Thành viên',
    combo: '🍿 Combo',
    payment: '💳 Thanh toán',
    movie: '🎬 Theo phim',
  }[promo.category] || promo.category;

  return (
    <div className="container page">
      <Link to="/promotions" className="btn btn-ghost btn-sm mb-md">← Quay lại</Link>

      <CachedImage src={promo.image_url} alt={promo.title} className="promo-detail-hero" priority="high" width={1200} />

      <div style={{ maxWidth: 900 }}>
        <div className="flex gap-sm mb-md">
          <span className="badge badge-primary">{categoryLabel}</span>
          {promo.coupon_code && (
            <span className="badge badge-accent">
              Mã: {promo.coupon_code}
            </span>
          )}
        </div>

        <h1 className="text-3xl font-bold mb-md">{promo.title}</h1>

        {(promo.valid_from || promo.valid_to) && (
          <div className="text-secondary mb-lg">
            ⏰ Hiệu lực:{' '}
            {promo.valid_from && new Date(promo.valid_from).toLocaleDateString('vi-VN')}
            {' — '}
            {promo.valid_to && new Date(promo.valid_to).toLocaleDateString('vi-VN')}
          </div>
        )}

        <div className="card">
          <p className="text-secondary" style={{ lineHeight: 1.8, whiteSpace: 'pre-line' }}>
            {promo.full_content || promo.short_desc}
          </p>

          {promo.coupon_code && (
            <div
              className="mt-lg"
              style={{
                padding: 20,
                background: 'var(--primary-light)',
                border: '1.5px dashed var(--primary)',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
              }}
            >
              <div className="text-secondary text-sm mb-sm">Mã khuyến mãi</div>
              <div
                className="text-3xl font-bold text-primary"
                style={{ letterSpacing: 3 }}
              >{promo.coupon_code}</div>
              <div className="text-muted text-sm mt-sm">
                Nhập mã này khi đặt vé để được áp dụng ưu đãi
              </div>
            </div>
          )}

          <div className="flex gap-sm mt-lg">
            <Link to="/movies" className="btn btn-primary btn-lg flex-1">
              🎟 Đặt vé ngay
            </Link>
            <Link to="/promotions" className="btn btn-outline btn-lg">
              Xem thêm ưu đãi
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

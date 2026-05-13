import { useEffect, useState } from 'react';
import PromotionCard from '../components/PromotionCard';
import Loading from '../components/Loading';
import { contentApi } from '../api/client';

const categories = [
  { key: '', label: 'Tất cả' },
  { key: 'event', label: '🎉 Sự kiện' },
  { key: 'member', label: '⭐ Thành viên' },
  { key: 'combo', label: '🍿 Combo' },
  { key: 'payment', label: '💳 Thanh toán' },
  { key: 'movie', label: '🎬 Theo phim' },
];

export default function PromotionsPage() {
  const [category, setCategory] = useState('');
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    contentApi.promotions(category ? { category } : {})
      .then(setPromotions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <div className="container page">
      <h1 className="section-title mb-lg">
        <span className="section-title-bar" />
        Ưu đãi & Khuyến mãi
      </h1>

      <div className="section-tabs mb-lg" style={{ flexWrap: 'wrap' }}>
        {categories.map(c => (
          <div
            key={c.key}
            className={'section-tab' + (category === c.key ? ' active' : '')}
            onClick={() => setCategory(c.key)}
          >{c.label}</div>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : promotions.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🎟</div>
          <div>Chưa có ưu đãi trong danh mục này</div>
        </div>
      ) : (
        <div className="promo-grid">
          {promotions.map(p => <PromotionCard key={p.promotion_id} promo={p} />)}
        </div>
      )}
    </div>
  );
}

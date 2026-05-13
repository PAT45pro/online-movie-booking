import { Link } from 'react-router-dom';
import CachedImage from './CachedImage';

export default function PromotionCard({ promo }) {
  return (
    <Link to={`/promotions/${promo.promotion_id}`} className="promo-card">
      <CachedImage
        src={promo.image_url}
        alt={promo.title}
        className="promo-img"
        style={{ width: '100%', height: 180 }}
      />
      <div className="promo-body">
        <div className="promo-title">{promo.title}</div>
        <div className="promo-desc">{promo.short_desc}</div>
      </div>
    </Link>
  );
}

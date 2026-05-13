import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Loading from '../components/Loading';
import CachedImage from '../components/CachedImage';
import { cinemaApi } from '../api/client';

export default function CinemasPage() {
  const [cinemas, setCinemas] = useState([]);
  const [cities, setCities] = useState([]);
  const [filterCity, setFilterCity] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      cinemaApi.list(filterCity ? { city: filterCity } : {}),
      cinemaApi.cities(),
    ])
      .then(([cs, cities]) => {
        setCinemas(cs);
        setCities(cities);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filterCity]);

  return (
    <div className="container page">
      <div className="section-header">
        <h1 className="section-title">
          <span className="section-title-bar" />
          Hệ thống rạp chiếu
        </h1>
        <select
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
          style={{ maxWidth: 240 }}
        >
          <option value="">-- Tất cả thành phố --</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <Loading />
      ) : cinemas.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🎬</div>
          <div>Không có rạp nào ở thành phố này</div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 20,
          }}
        >
          {cinemas.map(c => (
            <Link key={c.cinema_id} to={`/cinemas/${c.cinema_id}`} className="promo-card">
              <CachedImage
                src={c.image_url || 'https://via.placeholder.com/400x300?text=Cinema'}
                alt={c.name}
                className="promo-img"
                fallback="https://via.placeholder.com/400x300?text=Cinema"
                style={{ width: '100%', height: 200 }}
              />
              <div className="promo-body">
                <div className="promo-title">{c.name}</div>
                <div className="text-secondary text-sm mb-sm">📍 {c.address}</div>
                <div className="flex gap-md text-xs text-muted flex-wrap">
                  {c.phone && <span>📞 {c.phone}</span>}
                  {c.opening_time && c.closing_time && (
                    <span>🕐 {c.opening_time.slice(0,5)} - {c.closing_time.slice(0,5)}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { contentApi } from '../api/client';

export default function HeroBanner() {
  const [banners, setBanners] = useState([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    contentApi.banners().then(setBanners).catch(() => {});
  }, []);

  // Auto slide
  useEffect(() => {
    if (banners.length <= 1) return;
    const id = setInterval(() => {
      setCurrent(c => (c + 1) % banners.length);
    }, 5000);
    return () => clearInterval(id);
  }, [banners.length]);

  if (!banners.length) {
    return (
      <div className="hero-banner">
        <div
          className="hero-slide"
          style={{ background: 'linear-gradient(135deg, var(--surface), var(--surface-2))' }}
        >
          <div className="hero-content">
            <h1 className="hero-title">🎬 Chào mừng đến Cinema Booking</h1>
            <p className="hero-subtitle">Đặt vé xem phim dễ dàng, trải nghiệm đẳng cấp</p>
            <div className="hero-actions">
              <Link to="/movies" className="btn btn-primary btn-lg">Khám phá phim</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const b = banners[current];

  return (
    <div className="hero-banner">
      <div
        className="hero-slide"
        style={{ backgroundImage: `url(${b.image_url})` }}
      >
        <div className="hero-content">
          <h1 className="hero-title">{b.title}</h1>
          {b.subtitle && <p className="hero-subtitle">{b.subtitle}</p>}
          <div className="hero-actions">
            <Link to="/movies" className="btn btn-primary btn-lg">🎟 Đặt vé ngay</Link>
            <Link to="/promotions" className="btn btn-outline btn-lg">Ưu đãi</Link>
          </div>
        </div>
      </div>

      {banners.length > 1 && (
        <div className="hero-dots">
          {banners.map((_, i) => (
            <div
              key={i}
              className={'hero-dot' + (i === current ? ' active' : '')}
              onClick={() => setCurrent(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

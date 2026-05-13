import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import HeroBanner from '../components/HeroBanner';
import QuickBooking from '../components/QuickBooking';
import MovieCard from '../components/MovieCard';
import PromotionCard from '../components/PromotionCard';
import CachedImage from '../components/CachedImage';
import Loading from '../components/Loading';
import { movieApi, contentApi, cinemaApi } from '../api/client';

export default function HomePage() {
  const [tab, setTab] = useState('now_showing');
  const [movies, setMovies] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [memberPromos, setMemberPromos] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch phim theo tab
  useEffect(() => {
    setLoading(true);
    movieApi.list({ status: tab })
      .then(setMovies)
      .finally(() => setLoading(false));
  }, [tab]);

  // Fetch dữ liệu trang chủ
  useEffect(() => {
    contentApi.promotions({ category: 'event' }).then(setPromotions).catch(() => {});
    contentApi.promotions({ category: 'member' }).then(setMemberPromos).catch(() => {});
    cinemaApi.list().then(setCinemas).catch(() => {});
    contentApi.news({ limit: 4 }).then(setNews).catch(() => {});
  }, []);

  return (
    <>
      <HeroBanner />
      <QuickBooking />

      {/* === PHIM === */}
      <div className="container">
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">
              <span className="section-title-bar" />
              {tab === 'now_showing' ? 'Phim đang chiếu' : 'Phim sắp chiếu'}
            </h2>
            <div className="section-tabs">
              <div
                className={'section-tab' + (tab === 'now_showing' ? ' active' : '')}
                onClick={() => setTab('now_showing')}
              >Đang chiếu</div>
              <div
                className={'section-tab' + (tab === 'coming_soon' ? ' active' : '')}
                onClick={() => setTab('coming_soon')}
              >Sắp chiếu</div>
            </div>
          </div>

          {loading ? <Loading /> : (
            <div className="movie-grid-5">
              {movies.slice(0, 10).map(m => <MovieCard key={m.movie_id} movie={m} />)}
            </div>
          )}

          {movies.length > 10 && (
            <div className="text-center mt-lg">
              <Link to="/movies" className="btn btn-outline">Xem tất cả</Link>
            </div>
          )}
        </section>

        {/* === ƯU ĐÃI / SỰ KIỆN === */}
        {promotions.length > 0 && (
          <section className="section">
            <div className="section-header">
              <h2 className="section-title">
                <span className="section-title-bar" />
                Ưu đãi / Sự kiện
              </h2>
              <Link to="/promotions" className="btn btn-ghost btn-sm">Xem tất cả →</Link>
            </div>
            <div className="promo-grid">
              {promotions.slice(0, 3).map(p => <PromotionCard key={p.promotion_id} promo={p} />)}
            </div>
          </section>
        )}

        {/* === CÁC CỤM RẠP === */}
        {cinemas.length > 0 && (
          <section className="section">
            <div className="section-header">
              <h2 className="section-title">
                <span className="section-title-bar" />
                Các cụm rạp
              </h2>
              <Link to="/cinemas" className="btn btn-ghost btn-sm">Xem tất cả →</Link>
            </div>
            <div className="cinema-strip">
              {cinemas.slice(0, 5).map(c => (
                <Link
                  key={c.cinema_id}
                  to={`/cinemas/${c.cinema_id}`}
                  className="cinema-thumb"
                >
                  <CachedImage
                    src={c.image_url || 'https://via.placeholder.com/400x300?text=Cinema'}
                    alt={c.name}
                    style={{ width: '100%', height: '100%' }}
                  />
                  <div className="cinema-thumb-overlay">
                    <div className="cinema-thumb-name">{c.name}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* === ƯU ĐÃI THÀNH VIÊN === */}
        {memberPromos.length > 0 && (
          <section className="section">
            <div className="section-header">
              <h2 className="section-title">
                <span className="section-title-bar" />
                Ưu đãi thành viên
              </h2>
              <Link to="/register" className="btn btn-accent btn-sm">Đăng ký member</Link>
            </div>
            <div className="promo-grid">
              {memberPromos.slice(0, 3).map(p => <PromotionCard key={p.promotion_id} promo={p} />)}
            </div>
          </section>
        )}

        {/* === TIN TỨC === */}
        {news.length > 0 && (
          <section className="section">
            <div className="section-header">
              <h2 className="section-title">
                <span className="section-title-bar" />
                Tin tức / Giới thiệu
              </h2>
              <Link to="/news" className="btn btn-ghost btn-sm">Xem tất cả →</Link>
            </div>

            <div className="news-grid">
              <Link to={`/news/${news[0].news_id}`} className="news-featured">
                <CachedImage src={news[0].thumbnail} alt={news[0].title} priority="high" style={{ width: '100%', height: '100%' }} />
                <div className="news-featured-body">
                  <div className="text-muted text-xs mb-sm">
                    {new Date(news[0].published_at).toLocaleDateString('vi-VN')} • {news[0].author}
                  </div>
                  <div className="text-xl font-bold mb-sm">{news[0].title}</div>
                  <div className="text-secondary text-sm">{news[0].summary}</div>
                </div>
              </Link>

              <div className="news-list">
                {news.slice(1, 4).map(n => (
                  <Link key={n.news_id} to={`/news/${n.news_id}`} className="news-item">
                    <CachedImage src={n.thumbnail} alt={n.title} style={{ width: 100, height: 80 }} />
                    <div>
                      <div className="news-item-title">{n.title}</div>
                      <div className="text-muted text-xs">
                        {new Date(n.published_at).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}

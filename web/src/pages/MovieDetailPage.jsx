import CachedImage from '../components/CachedImage';
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { movieApi } from '../api/client';
import Loading from '../components/Loading';
import { formatDate, formatTime } from '../theme';

export default function MovieDetailPage() {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTrailer, setShowTrailer] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [m, s] = await Promise.all([movieApi.detail(id), movieApi.showtimes(id)]);
        setMovie(m); setShowtimes(s);
      } catch (e) { console.warn(e); }
      finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) return <Loading />;
  if (!movie) return <div className="container page"><p>Không tìm thấy phim</p></div>;

  // Group by date
  const byDate = {};
  showtimes.forEach(s => {
    const d = new Date(s.start_time).toISOString().slice(0, 10);
    (byDate[d] = byDate[d] || []).push(s);
  });
  const dates = Object.keys(byDate).sort();
  const activeDate = selectedDate || dates[0];

  return (
    <>
      {/* Hero */}
      <div className="detail-hero">
        <div
          className="detail-hero-bg"
          style={{ backgroundImage: `url(${movie.banner_url || movie.poster_url})` }}
        />
        <div className="detail-hero-content">
          <CachedImage src={movie.poster_url} alt={movie.title} className="detail-poster" priority="high" width={500} />
          <div>
            <h1 className="detail-title">{movie.title}</h1>
            {movie.original_title && (
              <div className="text-secondary mt-sm" style={{ fontStyle: 'italic' }}>
                {movie.original_title}
              </div>
            )}
            <div className="detail-meta">
              <span className="badge badge-primary">{movie.age_rating}</span>
              <span>⏱ {movie.duration_minutes} phút</span>
              <span>⭐ {Number(movie.rating_avg).toFixed(1)}/10 ({movie.rating_count} đánh giá)</span>
              <span>🌏 {movie.country}</span>
              <span>📅 Khởi chiếu: {movie.release_date}</span>
            </div>

            {movie.genres?.length > 0 && (
              <div className="flex gap-sm flex-wrap mt-md">
                {movie.genres.map(g => (
                  <span key={g.genre_id} className="badge badge-muted">{g.name}</span>
                ))}
              </div>
            )}

            <div className="flex gap-sm mt-md">
              {movie.trailer_url && (
                <button className="btn btn-outline btn-lg" onClick={() => setShowTrailer(true)}>
                  ▶ Xem Trailer
                </button>
              )}
              {dates.length > 0 && (
                <a href="#showtimes" className="btn btn-primary btn-lg">🎟 Đặt vé</a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Trailer Modal */}
        {showTrailer && movie.trailer_url && (
          <div
            onClick={() => setShowTrailer(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(0,0,0,0.9)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', padding: 20,
            }}
          >
            <div style={{ width: '100%', maxWidth: 960 }} onClick={(e) => e.stopPropagation()}>
              <div className="trailer-wrap">
                <iframe
                  src={movie.trailer_url + '?autoplay=1'}
                  title="Trailer"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              </div>
              <div className="text-center mt-md">
                <button className="btn btn-secondary" onClick={() => setShowTrailer(false)}>Đóng</button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 32 }}>
          <div>
            {/* Nội dung */}
            <section className="section">
              <h2 className="section-title mb-md">
                <span className="section-title-bar" />
                Nội dung phim
              </h2>
              <p className="text-secondary" style={{ lineHeight: 1.8 }}>
                {movie.description || 'Chưa có mô tả.'}
              </p>
            </section>

            {/* Trailer inline */}
            {movie.trailer_url && (
              <section className="section">
                <h2 className="section-title mb-md">
                  <span className="section-title-bar" />
                  Trailer
                </h2>
                <div className="trailer-wrap">
                  <iframe
                    src={movie.trailer_url}
                    title="Trailer"
                    allow="encrypted-media"
                    allowFullScreen
                  />
                </div>
              </section>
            )}

            {/* Showtimes */}
            <section className="section" id="showtimes">
              <h2 className="section-title mb-md">
                <span className="section-title-bar" />
                Lịch chiếu
              </h2>

              {dates.length === 0 ? (
                <p className="text-secondary">Chưa có suất chiếu nào</p>
              ) : (
                <>
                  {/* Date tabs */}
                  <div className="date-tabs">
                    {dates.map(d => {
                      const date = new Date(d);
                      return (
                        <div
                          key={d}
                          className={'date-tab' + (activeDate === d ? ' active' : '')}
                          onClick={() => setSelectedDate(d)}
                        >
                          <div className="date-tab-day">
                            {date.toLocaleDateString('vi-VN', { weekday: 'short' })}
                          </div>
                          <div className="date-tab-num">
                            {String(date.getDate()).padStart(2, '0')}/{String(date.getMonth() + 1).padStart(2, '0')}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Group by cinema */}
                  {Object.values(
                    (byDate[activeDate] || []).reduce((acc, s) => {
                      (acc[s.cinema_id] = acc[s.cinema_id] || { cinema: s, items: [] }).items.push(s);
                      return acc;
                    }, {})
                  ).map(g => (
                    <div key={g.cinema.cinema_id} className="cinema-group">
                      <div className="cinema-group-title">📍 {g.cinema.cinema_name}</div>
                      <div className="cinema-group-addr">{g.cinema.address}</div>
                      <div className="time-list">
                        {g.items.map(s => (
                          <Link key={s.showtime_id} to={`/showtime/${s.showtime_id}`} className="time-btn">
                            <div className="time-btn-time">{formatTime(s.start_time)}</div>
                            <div className="time-btn-type">{s.room_type_code}</div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div>
            <div className="card">
              <h3 className="text-lg font-bold mb-md">Thông tin</h3>
              <InfoItem label="Đạo diễn" value={movie.director} />
              <InfoItem label="Quốc gia" value={movie.country} />
              <InfoItem label="Ngôn ngữ" value={movie.language} />
              <InfoItem label="Phụ đề" value={movie.subtitle} />
              <InfoItem label="Khởi chiếu" value={movie.release_date} />
              <InfoItem label="Đánh giá" value={`${Number(movie.rating_avg).toFixed(1)}/10`} />
            </div>

            {movie.actors?.length > 0 && (
              <div className="card mt-md">
                <h3 className="text-lg font-bold mb-md">Diễn viên</h3>
                <div className="text-secondary text-sm" style={{ lineHeight: 1.6 }}>
                  {movie.actors.map(a => a.name).join(', ')}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function InfoItem({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex" style={{ padding: '8px 0', fontSize: 14, borderBottom: '1px solid var(--border)' }}>
      <span className="text-muted" style={{ width: 100 }}>{label}</span>
      <span className="flex-1">{value}</span>
    </div>
  );
}

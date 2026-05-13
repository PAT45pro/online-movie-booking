import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Loading from '../components/Loading';
import { cinemaApi, movieApi } from '../api/client';
import { formatTime, formatCurrency } from '../theme';

export default function CinemaDetailPage() {
  const { id } = useParams();
  const [cinema, setCinema] = useState(null);
  const [movies, setMovies] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const c = await cinemaApi.detail(id);
        setCinema(c);

        // Lấy phim đang chiếu + suất chiếu tại rạp này
        const nowShowing = await movieApi.list({ status: 'now_showing' });
        // Với mỗi phim, fetch showtimes và filter theo cinema
        const withShowtimes = await Promise.all(
          nowShowing.map(async (m) => {
            const st = await movieApi.showtimes(m.movie_id);
            return { ...m, showtimes: st.filter(s => s.cinema_id === parseInt(id)) };
          })
        );
        setMovies(withShowtimes.filter(m => m.showtimes.length > 0));
      } catch (e) { console.warn(e); }
      finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) return <Loading />;
  if (!cinema) return (
    <div className="container page">
      <div className="empty">
        <div className="empty-icon">🎬</div>
        <div>Không tìm thấy rạp</div>
        <Link to="/cinemas" className="btn btn-primary mt-md">Xem các rạp khác</Link>
      </div>
    </div>
  );

  // Nhóm phòng theo loại + lấy tổng ghế
  const roomsByType = {};
  (cinema.rooms || []).forEach(r => {
    (roomsByType[r.room_type_code] = roomsByType[r.room_type_code] || {
      name: r.room_type_name,
      code: r.room_type_code,
      rooms: [],
    }).rooms.push(r);
  });

  // Tất cả ngày có suất chiếu tại rạp này
  const allShowtimes = movies.flatMap(m => m.showtimes);
  const datesSet = new Set(allShowtimes.map(s => new Date(s.start_time).toISOString().slice(0, 10)));
  const dates = [...datesSet].sort();
  const activeDate = selectedDate || dates[0];

  return (
    <div className="container page">
      <Link to="/cinemas" className="btn btn-ghost btn-sm mb-md">← Quay lại danh sách rạp</Link>

      {/* HERO */}
      <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 24 }}>
        <img
          src={cinema.image_url || 'https://via.placeholder.com/1200x400?text=Cinema'}
          alt={cinema.name}
          style={{ width: '100%', aspectRatio: '3/1', objectFit: 'cover', minHeight: 200, maxHeight: 360 }}
        />
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(10,14,26,0.95), transparent 70%)',
            display: 'flex', alignItems: 'flex-end', padding: 32,
          }}
        >
          <div>
            <div className="badge badge-primary mb-sm">RẠP CHIẾU PHIM</div>
            <h1 className="text-3xl font-bold">{cinema.name}</h1>
            <div className="text-secondary mt-sm">📍 {cinema.address}, {cinema.city}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 32 }}>
        <div>
          {/* THÔNG TIN */}
          <section className="section">
            <h2 className="section-title mb-md">
              <span className="section-title-bar" />
              Thông tin liên hệ
            </h2>
            <div className="card">
              <InfoItem icon="📍" label="Địa chỉ" value={`${cinema.address}${cinema.district ? ', ' + cinema.district : ''}, ${cinema.city}`} />
              {cinema.phone && <InfoItem icon="📞" label="Hotline" value={cinema.phone} />}
              {cinema.email && <InfoItem icon="✉️" label="Email" value={cinema.email} />}
              {cinema.opening_time && cinema.closing_time && (
                <InfoItem
                  icon="🕐"
                  label="Giờ mở cửa"
                  value={`${cinema.opening_time.slice(0,5)} — ${cinema.closing_time.slice(0,5)}`}
                />
              )}
            </div>
          </section>

          {/* CÁC PHÒNG CHIẾU */}
          <section className="section">
            <h2 className="section-title mb-md">
              <span className="section-title-bar" />
              Các phòng chiếu
            </h2>
            {!cinema.rooms?.length ? (
              <p className="text-secondary">Chưa có thông tin phòng</p>
            ) : (
              <>
                {/* Tóm tắt theo loại */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                  {Object.values(roomsByType).map(rt => (
                    <div key={rt.code} className="card" style={{ textAlign: 'center', padding: 16 }}>
                      <div className="badge badge-primary" style={{ fontSize: 13, padding: '4px 10px' }}>{rt.code}</div>
                      <div className="font-bold mt-sm">{rt.name}</div>
                      <div className="text-muted text-xs mt-xs">
                        {rt.rooms.length} phòng
                      </div>
                    </div>
                  ))}
                </div>

                {/* Danh sách chi tiết từng phòng */}
                <div className="card">
                  <h4 className="font-bold mb-md">Chi tiết phòng</h4>
                  {cinema.rooms.map(r => (
                    <div
                      key={r.room_id}
                      className="flex items-center justify-between"
                      style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}
                    >
                      <div>
                        <div className="font-semibold">{r.room_name}</div>
                        <div className="text-muted text-xs">
                          Loại {r.room_type_code} • {r.total_seats} ghế
                        </div>
                      </div>
                      <span className="badge badge-muted">{r.room_type_code}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* LỊCH CHIẾU TẠI RẠP */}
          {movies.length > 0 && (
            <section className="section">
              <h2 className="section-title mb-md">
                <span className="section-title-bar" />
                Lịch chiếu tại rạp
              </h2>

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

              {/* Phim trong ngày được chọn */}
              {movies.map(movie => {
                const todayShowtimes = movie.showtimes.filter(s =>
                  new Date(s.start_time).toISOString().slice(0, 10) === activeDate
                );
                if (todayShowtimes.length === 0) return null;

                return (
                  <div key={movie.movie_id} className="cinema-group">
                    <div className="flex gap-md" style={{ alignItems: 'start', marginBottom: 12 }}>
                      <img
                        src={movie.poster_url}
                        alt={movie.title}
                        style={{ width: 60, height: 90, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div className="cinema-group-title">{movie.title}</div>
                        <div className="text-muted text-xs mb-sm">
                          <span className="badge badge-primary" style={{ marginRight: 6 }}>{movie.age_rating}</span>
                          {movie.duration_minutes}′ • {movie.language}
                        </div>
                        <div className="time-list">
                          {todayShowtimes.map(s => (
                            <Link key={s.showtime_id} to={`/showtime/${s.showtime_id}`} className="time-btn">
                              <div className="time-btn-time">{formatTime(s.start_time)}</div>
                              <div className="time-btn-type">{s.room_type_code}</div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          )}
        </div>

        {/* SIDEBAR */}
        <div>
          <div className="card" style={{ position: 'sticky', top: 88 }}>
            <h3 className="text-lg font-bold mb-md">🎟 Đặt vé</h3>
            <p className="text-secondary text-sm mb-md">
              Chọn phim và suất chiếu để đặt vé ngay tại {cinema.name}.
            </p>
            <Link to="/movies" className="btn btn-primary w-full">
              Xem phim đang chiếu
            </Link>

            <div className="divider" />

            <h4 className="font-bold mb-sm">Tiện ích tại rạp</h4>
            <ul style={{ listStyle: 'none', padding: 0, fontSize: 13, lineHeight: 2, color: 'var(--text-secondary)' }}>
              <li>🎞 Đầy đủ phòng 2D, 3D, IMAX</li>
              <li>🍿 Quầy bắp nước cao cấp</li>
              <li>🅿️ Bãi đỗ xe rộng rãi</li>
              <li>🎮 Khu vui chơi giải trí</li>
              <li>🛗 Thang máy / Lối đi người khuyết tật</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center gap-sm">
        <span style={{ fontSize: 20 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div className="text-muted text-xs">{label}</div>
          <div className="font-medium" style={{ marginTop: 2 }}>{value}</div>
        </div>
      </div>
    </div>
  );
}

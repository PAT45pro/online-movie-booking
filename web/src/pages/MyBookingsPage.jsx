import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingApi } from '../api/client';
import Loading from '../components/Loading';
import { formatCurrency, formatDate, formatTime } from '../theme';

const statusMap = {
  pending: { text: 'Chờ thanh toán', cls: 'badge-warning' },
  awaiting_payment: { text: 'Chờ thanh toán', cls: 'badge-warning' },
  paid: { text: 'Đã thanh toán', cls: 'badge-success' },
  used: { text: 'Đã sử dụng', cls: 'badge-muted' },
  expired: { text: 'Hết hạn', cls: 'badge-muted' },
  refunded_by_cinema: { text: 'Đã hoàn tiền (rạp hủy)', cls: 'badge-info' },
};

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setBookings(await bookingApi.mine());
      } catch (e) { console.warn(e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="container page">
      <h1 className="text-3xl font-bold mb-lg">🎫 Vé của tôi</h1>

      {bookings.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🎫</div>
          <div>Bạn chưa đặt vé nào</div>
          <Link to="/" className="btn btn-primary mt-md">Khám phá phim</Link>
        </div>
      ) : (
        bookings.map(b => {
          const st = statusMap[b.status] || { text: b.status, cls: 'badge-muted' };
          return (
            <Link
              key={b.booking_id}
              to={`/booking/${b.booking_id}`}
              className="booking-card"
              style={{ textDecoration: 'none' }}
            >
              <img
                src={b.poster_url || 'https://via.placeholder.com/100x150'}
                alt={b.movie_title}
                className="booking-poster"
              />
              <div className="booking-info">
                <div>
                  <div className="booking-title">{b.movie_title}</div>
                  <div className="booking-sub">📍 {b.cinema_name}</div>
                  <div className="booking-sub">
                    🕐 {formatDate(b.start_time)} {formatTime(b.start_time)} • {b.room_name}
                  </div>
                  <div className="booking-sub">Mã: <code>{b.booking_code}</code></div>
                </div>
                <div className="booking-footer">
                  <span className={`badge ${st.cls}`}>{st.text}</span>
                  <span className="text-primary font-bold">{formatCurrency(b.final_amount)}</span>
                </div>
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { bookingApi } from '../api/client';
import Loading from '../components/Loading';
import { formatCurrency, formatDate, formatTime } from '../theme';

export default function BookingConfirmPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setBooking(await bookingApi.detail(id));
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) return <Loading />;
  if (!booking) return <div className="container page"><p className="text-error">{error || 'Không tìm thấy vé'}</p></div>;

  const isPaid = booking.status === 'paid' || booking.status === 'used';

  return (
    <div className="container page">
      {isPaid && (
        <div
          className="text-center mb-lg"
          style={{
            padding: 32,
            background: 'var(--success-light)',
            borderRadius: 16,
          }}
        >
          <div
            style={{
              width: 80, height: 80, borderRadius: 40,
              background: 'var(--success)', color: 'white',
              fontSize: 48, lineHeight: '80px',
              margin: '0 auto',
            }}
          >✓</div>
          <h2 className="text-2xl font-bold mt-md">Đặt vé thành công!</h2>
          <p className="text-secondary mt-sm">Vé đã được gửi vào email của bạn</p>
        </div>
      )}

      <div className="ticket">
        <div className="ticket-header">
          <div className="text-xl font-bold">{booking.movie_title}</div>
          <div className="text-sm" style={{ opacity: 0.9, marginTop: 4 }}>{booking.room_type_name}</div>
        </div>

        <div className="ticket-qr">
          <div className="ticket-qr-placeholder">[QR CODE]</div>
          <div className="ticket-qr-code">{booking.qr_code || booking.booking_code}</div>
        </div>

        <div className="ticket-separator" />

        <div className="ticket-body">
          <TicketRow label="Mã đặt vé" value={booking.booking_code} />
          <TicketRow label="Rạp chiếu" value={booking.cinema_name} />
          <TicketRow label="Phòng" value={booking.room_name} />
          <TicketRow
            label="Ngày giờ"
            value={`${formatDate(booking.start_time)} ${formatTime(booking.start_time)}`}
          />
          <TicketRow
            label="Ghế"
            value={booking.seats?.map(s => s.seat_code).join(', ') || '—'}
          />
          <TicketRow label="Số lượng" value={`${booking.seats?.length || 0} vé`} />

          <div className="divider" />

          <TicketRow label="Tạm tính" value={formatCurrency(booking.subtotal)} />
          {booking.discount_amount > 0 && (
            <TicketRow
              label="Giảm giá"
              value={`-${formatCurrency(booking.discount_amount)}`}
              highlight="var(--success)"
            />
          )}
          <TicketRow
            label="Tổng tiền"
            value={formatCurrency(booking.final_amount)}
            highlight="var(--primary)"
            bold
          />

          {booking.points_earned > 0 && (
            <div className="text-center text-warning mt-md">
              🎁 Bạn được cộng {booking.points_earned} điểm tích lũy
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-md mt-lg" style={{ maxWidth: 500, margin: '24px auto 0' }}>
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/')}>
          Về trang chủ
        </button>
        <Link to="/my-bookings" className="btn btn-primary" style={{ flex: 1 }}>
          Xem vé của tôi
        </Link>
      </div>
    </div>
  );
}

function TicketRow({ label, value, highlight, bold }) {
  return (
    <div className="ticket-info-row" style={bold ? { paddingTop: 10 } : {}}>
      <span className="label">{label}</span>
      <span
        className="value"
        style={{
          color: highlight || undefined,
          fontSize: bold ? 18 : undefined,
          fontWeight: bold ? 700 : 600,
        }}
      >{value}</span>
    </div>
  );
}

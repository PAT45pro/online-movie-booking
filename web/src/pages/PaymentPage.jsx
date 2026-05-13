import CachedImage from '../components/CachedImage';
import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { paymentApi, couponApi, bookingApi, holdApi } from '../api/client';
import Loading from '../components/Loading';
import { formatCurrency, formatDate, formatTime } from '../theme';

/**
 * PaymentPage
 *
 * Flow mới:
 *   SeatSelectionPage → POST /holds (giữ ghế 8 phút) → navigate /payment với { sessionId, expiresAt, ... }
 *   Trên trang này:
 *     1. Hiển thị ghế đã giữ + countdown
 *     2. User nhập coupon (optional)
 *     3. User chọn phương thức thanh toán
 *     4. Click "Thanh toán" → POST /bookings/from-hold (convert hold → booking pending)
 *                            → POST /payments (gọi cổng thanh toán)
 *                            → navigate /booking-confirm với QR
 */
export default function PaymentPage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  // Bảo vệ
  if (!state?.sessionId) {
    return (
      <div className="container page">
        <div className="empty">
          <div className="empty-icon">⚠️</div>
          <div>Phiên giữ ghế không tồn tại. Vui lòng chọn ghế lại.</div>
          <button className="btn btn-primary mt-md" onClick={() => navigate('/')}>Về trang chủ</button>
        </div>
      </div>
    );
  }

  const { sessionId, expiresAt, show, seats, subtotal } = state;

  const [methods, setMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponInfo, setCouponInfo] = useState(null);   // { discount, code, message }
  const [couponError, setCouponError] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [error, setError] = useState('');

  // Countdown timer cho hold
  const [secondsLeft, setSecondsLeft] = useState(0);
  const tickRef = useRef(null);

  useEffect(() => {
    const expire = new Date(expiresAt).getTime();
    const update = () => {
      const left = Math.max(0, Math.floor((expire - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) {
        clearInterval(tickRef.current);
        setError('Phiên giữ ghế đã hết hạn. Vui lòng đặt lại.');
      }
    };
    update();
    tickRef.current = setInterval(update, 1000);
    return () => clearInterval(tickRef.current);
  }, [expiresAt]);

  // Load payment methods
  useEffect(() => {
    (async () => {
      try {
        const ms = await paymentApi.methods();
        setMethods(ms);
        if (ms.length > 0) setSelectedMethod(ms[0].method_id);
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  // Cleanup: nếu user rời trang mà chưa pay → release hold
  useEffect(() => {
    return () => {
      // Chỉ release nếu chưa thanh toán xong
      if (!paying && secondsLeft > 0) {
        holdApi.release(show.showtime_id, sessionId).catch(() => {});
      }
    };
    // eslint-disable-next-line
  }, []);

  const discount = couponInfo?.discount || 0;
  const finalAmount = Math.max(0, subtotal - discount);

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    setCouponError('');
    try {
      // Note: chưa có /coupons/validate-direct cho subtotal trước booking
      // Tạm: assume backend có endpoint validate dựa vào code + subtotal
      const result = await couponApi.validate({ code: couponCode, subtotal });
      setCouponInfo({
        discount: result.discount_amount,
        code: couponCode,
        message: result.message || 'Áp dụng coupon thành công',
      });
    } catch (e) {
      setCouponError(e.message);
      setCouponInfo(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setCouponInfo(null);
    setCouponCode('');
    setCouponError('');
  };

  const handlePay = async () => {
    if (!selectedMethod || secondsLeft <= 0) return;
    setPaying(true);
    setError('');
    try {
      // 1. Convert hold → booking pending
      const booking = await bookingApi.createFromHold({
        session_id: sessionId,
        coupon_code: couponInfo?.code || undefined,
      });

      // 2. Gọi cổng thanh toán
      const payment = await paymentApi.pay({
        booking_id: booking.booking_id,
        method_id: selectedMethod,
      });

      // 3. Navigate confirm với booking + QR
      navigate('/booking-confirm', {
        state: {
          bookingId: booking.booking_id,
          bookingCode: booking.booking_code,
          show, seats,
          finalAmount: booking.final_amount,
          method: methods.find(m => m.method_id === selectedMethod),
        },
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <Loading />;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const isExpired = secondsLeft <= 0;

  return (
    <div className="container page">
      <h1 className="text-2xl font-bold mb-md">Thanh toán</h1>

      {/* Countdown */}
      <div className="card mb-md" style={{
        background: isExpired ? 'var(--error)' : (secondsLeft < 60 ? 'var(--warning)' : 'var(--surface-2)'),
        textAlign: 'center', padding: 16,
      }}>
        <div className="text-sm">⏱ Giữ ghế còn lại</div>
        <div className="text-3xl font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </div>
      </div>

      {error && (
        <div className="mb-md" style={{ padding: 12, background: 'var(--error)', borderRadius: 8, color: 'white' }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 24 }}>
        {/* MAIN - chọn coupon + method */}
        <div>
          {/* Coupon */}
          <div className="card mb-md">
            <h3 className="text-lg font-bold mb-md">🎁 Mã giảm giá</h3>
            {couponInfo ? (
              <div className="flex justify-between items-center" style={{ padding: 12, background: 'var(--success)', color: 'white', borderRadius: 8 }}>
                <div>
                  <div className="font-bold">{couponInfo.code}</div>
                  <div className="text-sm">Giảm {formatCurrency(couponInfo.discount)}</div>
                </div>
                <button onClick={removeCoupon} className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                  Xóa
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-sm">
                  <input
                    type="text"
                    className="input"
                    placeholder="Nhập mã giảm giá"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    style={{ flex: 1 }}
                    disabled={validatingCoupon}
                  />
                  <button onClick={validateCoupon} className="btn btn-secondary"
                    disabled={!couponCode.trim() || validatingCoupon}>
                    {validatingCoupon ? '...' : 'Áp dụng'}
                  </button>
                </div>
                {couponError && (
                  <div className="text-sm mt-sm" style={{ color: 'var(--error)' }}>⚠ {couponError}</div>
                )}
              </>
            )}
          </div>

          {/* Payment methods */}
          <div className="card">
            <h3 className="text-lg font-bold mb-md">💳 Phương thức thanh toán</h3>
            <div className="payment-methods">
              {methods.map(m => (
                <label key={m.method_id} className={`payment-method ${selectedMethod === m.method_id ? 'selected' : ''}`}>
                  <input type="radio" name="method" value={m.method_id}
                    checked={selectedMethod === m.method_id}
                    onChange={() => setSelectedMethod(m.method_id)} />
                  <div className="flex items-center gap-sm" style={{ flex: 1 }}>
                    {m.logo_url && <CachedImage src={m.logo_url} alt={m.name} width={80} style={{ width: 40, height: 40, objectFit: "contain" }} />}
                    <div>
                      <div className="font-bold">{m.name}</div>
                      <div className="text-muted text-xs">{m.description}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* SUMMARY */}
        <div>
          <div className="card" style={{ position: 'sticky', top: 88 }}>
            <h3 className="text-lg font-bold mb-md">Đơn hàng</h3>
            <div className="text-sm mb-sm">
              <strong>{show.movie_title}</strong>
            </div>
            <div className="text-muted text-xs mb-md">
              {show.cinema_name} • {formatDate(show.start_time)} {formatTime(show.start_time)}
            </div>

            <div style={{ marginBottom: 12 }}>
              {seats.map(s => (
                <div key={s.seat_id} className="flex justify-between text-sm" style={{ padding: '4px 0' }}>
                  <span>{s.seat_code} ({s.seat_type_name})</span>
                  <span>{formatCurrency(s.price)}</span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Tạm tính</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm" style={{ color: 'var(--success)' }}>
                  <span>Giảm giá</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between mt-sm" style={{ fontSize: 18, fontWeight: 700 }}>
                <span>Tổng tiền</span>
                <span style={{ color: 'var(--primary)' }}>{formatCurrency(finalAmount)}</span>
              </div>
            </div>

            <button className="btn btn-primary btn-lg mt-md" style={{ width: '100%' }}
              onClick={handlePay} disabled={paying || isExpired || !selectedMethod}>
              {paying ? 'Đang xử lý...' : isExpired ? 'Hết hạn' : `Thanh toán ${formatCurrency(finalAmount)}`}
            </button>

            <div className="text-muted text-xs mt-sm" style={{ textAlign: 'center' }}>
              ⚠ Vé đã thanh toán KHÔNG THỂ hủy/hoàn
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import CachedImage from '../components/CachedImage';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { showtimeApi, holdApi } from '../api/client';
import Loading from '../components/Loading';
import Seat from '../components/Seat';
import { formatCurrency, formatDate, formatTime } from '../theme';

/**
 * SeatSelectionPage
 *
 * Đặc điểm:
 *   - Render từ JSON layout (layout.cells 2D array) thay vì group seats theo row
 *   - 4 trạng thái rõ ràng: AVAILABLE | SELECTED | HELD | BOOKED
 *   - Polling /seats mỗi 5s để cập nhật real-time (thay WebSocket)
 *   - Hold flow: click "Tiếp tục" → POST /holds → navigate /payment với session_id
 *   - Gap detection vẫn validate khi click
 */

const POLL_INTERVAL_MS = 5000;

export default function SeatSelectionPage() {
  const { showtimeId } = useParams();
  const navigate = useNavigate();
  const [show, setShow] = useState(null);
  const [layout, setLayout] = useState(null);          // { rows, cols, cells }
  const [seats, setSeats] = useState([]);              // flat array, có status + price
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  // ===== Fetch ban đầu =====
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [show, seatData] = await Promise.all([
          showtimeApi.detail(showtimeId),
          showtimeApi.seats(showtimeId),
        ]);
        if (cancelled) return;
        setShow(show);
        setLayout(seatData.layout);
        setSeats(seatData.seats);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [showtimeId]);

  // ===== Polling /seats mỗi 5s để biết ghế nào vừa bị HOLD/BOOKED =====
  useEffect(() => {
    if (!show) return;
    pollRef.current = setInterval(async () => {
      try {
        const data = await showtimeApi.seats(showtimeId);
        // Chỉ cập nhật seats array (status có thể đổi), giữ nguyên layout
        setSeats(prev => {
          // Nếu user đã chọn ghế nào → giữ trạng thái selected
          // Nhưng nếu ghế đó vừa bị book bởi người khác → bỏ chọn + báo
          const newSeats = data.seats;
          const conflictedSelected = [];
          selected.forEach(sid => {
            const newSeat = newSeats.find(s => s.seat_id === sid);
            if (newSeat && (newSeat.status === 'booked' || newSeat.status === 'held')) {
              conflictedSelected.push(newSeat.seat_code);
            }
          });
          if (conflictedSelected.length > 0) {
            const newSel = new Set(selected);
            conflictedSelected.forEach(code => {
              const seat = newSeats.find(s => s.seat_code === code);
              if (seat) newSel.delete(seat.seat_id);
            });
            setSelected(newSel);
            setError(`Ghế ${conflictedSelected.join(', ')} vừa được người khác đặt. Đã bỏ chọn tự động.`);
          }
          return newSeats;
        });
      } catch (e) {
        // ignore - giữ data hiện tại
      }
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [show, showtimeId, selected]);

  // ===== Build seats map theo (row, col) để render từ layout =====
  const seatsByPosition = useMemo(() => {
    const m = {};
    seats.forEach(s => {
      const key = `${s.row_label}_${s.column_number}`;
      m[key] = s;
    });
    return m;
  }, [seats]);

  // Tổng tiền + ghế đã chọn
  const selectedSeats = seats.filter(s => selected.has(s.seat_id));
  const subtotal = selectedSeats.reduce((a, s) => a + Number(s.price), 0);

  // ===== Gap detection =====
  const validateGap = (proposedSelected) => {
    const rowMap = {};
    seats.forEach(s => {
      (rowMap[s.row_label] = rowMap[s.row_label] || []).push(s);
    });
    Object.keys(rowMap).forEach(row =>
      rowMap[row].sort((a, b) => a.column_number - b.column_number));

    const gapCodes = [];
    for (const row of Object.keys(rowMap)) {
      const rowSeats = rowMap[row];
      for (let i = 0; i < rowSeats.length; i++) {
        const seat = rowSeats[i];
        if (proposedSelected.has(seat.seat_id)) continue;
        if (seat.status === 'booked' || seat.status === 'held') continue;
        const left = rowSeats[i - 1];
        const right = rowSeats[i + 1];
        if (!left || !right) continue;
        if (right.column_number - seat.column_number > 1) continue;
        if (seat.column_number - left.column_number > 1) continue;
        const leftBlocked = proposedSelected.has(left.seat_id)
          || left.status === 'booked' || left.status === 'held';
        const rightBlocked = proposedSelected.has(right.seat_id)
          || right.status === 'booked' || right.status === 'held';
        if (leftBlocked && rightBlocked) {
          gapCodes.push(seat.seat_code);
        }
      }
    }
    if (gapCodes.length > 0) {
      return { valid: false, message: `Không được để trống ghế giữa: ${gapCodes.join(', ')}` };
    }
    return { valid: true };
  };

  const toggleSeat = (seat) => {
    setError('');
    const s = new Set(selected);
    if (s.has(seat.seat_id)) {
      s.delete(seat.seat_id);
      const check = validateGap(s);
      if (!check.valid) {
        setError(`⚠ Không thể bỏ ${seat.seat_code}: ${check.message}`);
        return;
      }
    } else {
      if (s.size >= 8) { setError('Tối đa 8 ghế / đơn'); return; }
      s.add(seat.seat_id);
      const check = validateGap(s);
      if (!check.valid) { setError(`⚠ ${check.message}`); return; }
    }
    setSelected(s);
  };

  // ===== Click "Tiếp tục" → POST /holds → navigate /payment =====
  const handleContinue = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await holdApi.create(showtimeId, Array.from(selected));
      // Tạm dừng polling để không bị bouncing UI
      if (pollRef.current) clearInterval(pollRef.current);
      navigate('/payment', {
        state: {
          sessionId: result.session_id,
          expiresAt: result.expires_at,
          show,
          seats: selectedSeats,
          subtotal,
        },
      });
    } catch (e) {
      setError(e.message);
      // Refetch seats để cập nhật trạng thái mới
      try {
        const data = await showtimeApi.seats(showtimeId);
        setSeats(data.seats);
        setSelected(new Set());
      } catch {}
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading text="Đang tải sơ đồ ghế..." />;
  if (!show || !layout) return (
    <div className="container page">
      <div className="empty">
        <div className="empty-icon">⚠️</div>
        <div>{error || 'Không tìm thấy suất chiếu'}</div>
      </div>
    </div>
  );

  // ===== Render từ layout JSON =====
  // layout.cells là 2D array [row][col], mỗi cell có type
  const cells = layout.cells || [];
  const rowLabels = cells.map((_, idx) => String.fromCharCode(65 + idx));

  return (
    <div className="container page">
      {/* HEADER */}
      <div className="card mb-lg" style={{ background: 'linear-gradient(135deg, var(--surface), var(--surface-2))' }}>
        <div className="flex gap-md" style={{ flexWrap: 'wrap', alignItems: 'start' }}>
          <CachedImage src={show.poster_url} alt={show.movie_title} width={300}
            style={{ width: 100, height: 150, objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
          <div style={{ flex: 1, minWidth: 260 }}>
            <div className="flex gap-sm mb-sm flex-wrap items-center">
              <span className="badge badge-primary">{show.age_rating}</span>
              <span className="badge badge-accent">{show.room_type_code}</span>
            </div>
            <h1 className="text-2xl font-bold mb-sm">{show.movie_title}</h1>
            <div className="text-secondary text-sm">
              📍 <strong>{show.cinema_name}</strong> — {show.room_name}
            </div>
            <div className="text-secondary text-sm">
              🕐 <strong>{formatDate(show.start_time)} {formatTime(show.start_time)}</strong>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-md" style={{ padding: 12, background: 'var(--error)', borderRadius: 8, color: 'white' }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 24 }}>
        {/* SEAT MAP - render từ layout JSON */}
        <div className="card">
          <h3 className="text-lg font-bold mb-sm">Sơ đồ ghế ngồi</h3>
          <div className="text-muted text-sm mb-md">
            {layout.rows} hàng × {layout.cols} cột •
            Còn trống: <strong style={{ color: 'var(--success)' }}>{seats.filter(s => s.status === 'available').length}</strong> /
            Đang giữ: <strong style={{ color: '#888' }}>{seats.filter(s => s.status === 'held').length}</strong> /
            Đã đặt: <strong style={{ color: 'var(--error)' }}>{seats.filter(s => s.status === 'booked').length}</strong>
          </div>

          {/* Màn hình */}
          <div className="screen-bar">MÀN HÌNH</div>

          {/* Seat grid - render TỪ LAYOUT JSON */}
          <div className="seat-map">
            {cells.map((rowCells, r) => {
              const rowLabel = rowLabels[r];
              return (
                <div key={r} className="seat-row">
                  <span className="seat-row-label">{rowLabel}</span>
                  {rowCells.map((cell, c) => {
                    if (!cell || cell.type === 'EMPTY') {
                      return <div key={c} className="cell-empty" />;
                    }
                    if (cell.type === 'AISLE') {
                      return <div key={c} className="cell-aisle" />;
                    }
                    if (cell.type === 'COLUMN') {
                      return (
                        <div key={c} className="cell-column" title="Cột trụ phòng">
                          ▣
                        </div>
                      );
                    }
                    // SEAT - tìm seat data từ position
                    const seat = seatsByPosition[`${rowLabel}_${c + 1}`];
                    if (!seat) {
                      return <div key={c} className="cell-empty" />;
                    }
                    return (
                      <Seat
                        key={seat.seat_id}
                        seat={seat}
                        selected={selected.has(seat.seat_id)}
                        onClick={toggleSeat}
                      />
                    );
                  })}
                  <span className="seat-row-label">{rowLabel}</span>
                </div>
              );
            })}
          </div>

          {/* Legend - 4 states */}
          <div className="legend mt-md">
            <div className="legend-item">
              <div className="legend-dot" style={{ background: 'var(--seat-available, #5dade2)' }} />
              Trống
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: 'var(--seat-selected, #f1c40f)' }} />
              Đang chọn
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: '#888' }} />
              Đang giữ (5p)
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: '#5d6d7e' }} />
              Đã đặt
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: '#444', color: '#888', fontSize: 14 }}>▣</div>
              Cột phòng
            </div>
          </div>
        </div>

        {/* SUMMARY SIDEBAR */}
        <div>
          <div className="card" style={{ position: 'sticky', top: 88 }}>
            <h3 className="text-lg font-bold mb-md">
              🎟 Ghế đã chọn {selected.size > 0 && <span className="badge badge-primary">{selected.size}</span>}
            </h3>

            {selectedSeats.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 40, opacity: 0.3 }}>💺</div>
                <div className="text-muted text-sm mt-sm">Chưa chọn ghế nào</div>
              </div>
            ) : (
              <>
                <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 12 }}>
                  {selectedSeats.map(s => (
                    <div key={s.seat_id} className="flex items-center justify-between"
                      style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <div className="font-bold">{s.seat_code}</div>
                        <div className="text-muted text-xs">{s.seat_type_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(s.price)}</div>
                        <button onClick={() => toggleSeat(s)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: 12 }}>
                          Bỏ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, marginBottom: 12 }}>
                  <div className="flex justify-between" style={{ fontSize: 16 }}>
                    <span className="text-muted">Tạm tính</span>
                    <span className="font-bold" style={{ color: 'var(--primary)' }}>
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <div className="text-muted text-xs mt-xs">Áp coupon ở bước tiếp theo</div>
                </div>

                <button className="btn btn-primary btn-lg" style={{ width: '100%' }}
                  onClick={handleContinue} disabled={submitting}>
                  {submitting ? 'Đang giữ ghế...' : 'Tiếp tục → Thanh toán'}
                </button>
                <div className="text-muted text-xs mt-xs" style={{ textAlign: 'center' }}>
                  Ghế sẽ được giữ tạm 8 phút
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const typeClass = {
  STANDARD: '',
  VIP: 'vip',
  COUPLE: 'couple',
  SWEETBOX: 'sweetbox',
  DISABLED: 'disabled',
};

/**
 * Seat component với 4 trạng thái rõ ràng
 *   AVAILABLE   - xanh nhạt, click được (default)
 *   SELECTED    - vàng, đang được user hiện tại chọn
 *   HELD        - xám, user khác đang giữ tạm (8 phút)
 *   HELD_BY_ME  - xanh dương, user hiện tại đã giữ (sau khi POST /holds)
 *   BOOKED      - đỏ/đen, đã thanh toán xong (vĩnh viễn)
 */
export default function Seat({ seat, selected, onClick }) {
  const status = seat.status || 'available';
  const isBooked = status === 'booked';
  const isHeld = status === 'held';
  const isHeldByMe = status === 'held_by_me';
  const disabled = isBooked || isHeld;

  const classes = [
    'seat',
    typeClass[seat.seat_type_code] || '',
    isBooked && 'booked',
    isHeld && 'held',
    isHeldByMe && 'held-by-me',
    selected && 'selected',
  ].filter(Boolean).join(' ');

  const tooltip = isBooked
    ? `${seat.seat_code} • Đã đặt`
    : isHeld
    ? `${seat.seat_code} • Đang được giữ`
    : `${seat.seat_code} • ${seat.seat_type_name} • ${Number(seat.price).toLocaleString('vi-VN')}đ`;

  return (
    <button
      className={classes}
      disabled={disabled}
      onClick={() => !disabled && onClick(seat)}
      title={tooltip}
      aria-label={tooltip}
    >
      {seat.row_label}{seat.column_number}
    </button>
  );
}

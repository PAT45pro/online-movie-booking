import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Loading from '../components/Loading';
import Seat from '../components/Seat';
import { showtimeApi, bookingApi } from '../api/client';
import { colors, radius, fontSize, spacing, formatCurrency, formatDate, formatTime } from '../theme';

export default function SeatSelectionScreen({ route, navigation }) {
  const { showtimeId } = route.params;
  const [show, setShow] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [s, sh] = await Promise.all([
          showtimeApi.detail(showtimeId),
          showtimeApi.seats(showtimeId),
        ]);
        setShow(s); setSeats(sh);
      } catch (e) { Alert.alert('Lỗi', e.message); }
      finally { setLoading(false); }
    })();
  }, [showtimeId]);

  const toggleSeat = (seat) => {
    const s = new Set(selected);
    if (s.has(seat.seat_id)) s.delete(seat.seat_id);
    else {
      if (s.size >= 8) return Alert.alert('Giới hạn', 'Chỉ được chọn tối đa 8 ghế');
      s.add(seat.seat_id);
    }
    setSelected(s);
  };

  const selectedSeats = seats.filter(s => selected.has(s.seat_id));
  const subtotal = selectedSeats.reduce((a, s) => a + Number(s.price), 0);

  const handleContinue = async () => {
    if (selected.size === 0) return Alert.alert('Chưa chọn', 'Vui lòng chọn ít nhất 1 ghế');
    setSubmitting(true);
    try {
      const booking = await bookingApi.create({
        showtime_id: showtimeId,
        seat_ids: Array.from(selected),
      });
      navigation.navigate('Payment', {
        bookingId: booking.booking_id,
        bookingCode: booking.booking_code,
        finalAmount: booking.final_amount,
        subtotal: booking.subtotal,
        expiredAt: booking.expired_at,
        show, seats: selectedSeats,
      });
    } catch (e) {
      Alert.alert('Không thể đặt', e.message);
      // Reload sơ đồ ghế
      try {
        const sh = await showtimeApi.seats(showtimeId);
        setSeats(sh); setSelected(new Set());
      } catch (_) {}
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading text="Đang tải sơ đồ ghế..." />;

  // Nhóm ghế theo hàng
  const rows = {};
  seats.forEach(s => { (rows[s.row_label] = rows[s.row_label] || []).push(s); });
  const rowLabels = Object.keys(rows).sort();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ color: colors.text, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={styles.movieTitle} numberOfLines={1}>{show?.movie_title}</Text>
          <Text style={styles.showInfo}>
            {show?.cinema_name} • {show?.room_name} ({show?.room_type_code}) • {formatDate(show?.start_time)} {formatTime(show?.start_time)}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Screen */}
        <View style={styles.screenContainer}>
          <View style={styles.screen} />
          <Text style={styles.screenLabel}>MÀN HÌNH</Text>
        </View>

        {/* Seat grid */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ paddingHorizontal: spacing.md }}>
            {rowLabels.map(row => (
              <View key={row} style={styles.row}>
                <Text style={styles.rowLabel}>{row}</Text>
                {rows[row].map(s => (
                  <Seat
                    key={s.seat_id}
                    seat={s}
                    selected={selected.has(s.seat_id)}
                    onPress={toggleSeat}
                  />
                ))}
                <Text style={styles.rowLabel}>{row}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Legend */}
        <View style={styles.legend}>
          {[
            { color: colors.seatAvailable, label: 'Thường' },
            { color: colors.seatVIP, label: 'VIP' },
            { color: colors.seatCouple, label: 'Ghế đôi' },
            { color: colors.seatSweetbox, label: 'Sweetbox' },
            { color: colors.seatSelected, label: 'Đang chọn' },
            { color: colors.seatBooked, label: 'Đã đặt' },
          ].map(l => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: l.color }]} />
              <Text style={styles.legendText}>{l.label}</Text>
            </View>
          ))}
        </View>

        {/* Selected info */}
        {selectedSeats.length > 0 && (
          <View style={styles.selectedBox}>
            <Text style={styles.selectedTitle}>Ghế đã chọn ({selectedSeats.length})</Text>
            {selectedSeats.map(s => (
              <View key={s.seat_id} style={styles.selectedRow}>
                <Text style={styles.selectedSeat}>
                  {s.seat_code} • {s.seat_type_name}
                </Text>
                <Text style={styles.selectedPrice}>{formatCurrency(s.price)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.totalLabel}>Tổng cộng</Text>
          <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.continueBtn, (selected.size === 0 || submitting) && { opacity: 0.5 }]}
          onPress={handleContinue}
          disabled={selected.size === 0 || submitting}
        >
          <Text style={styles.continueText}>
            {submitting ? 'Đang xử lý...' : `Tiếp tục (${selected.size})`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  movieTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  showInfo: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  screenContainer: { alignItems: 'center', paddingVertical: spacing.lg },
  screen: {
    width: '70%', height: 6, backgroundColor: colors.primary,
    borderRadius: 3, shadowColor: colors.primary, shadowOpacity: 0.8,
    shadowRadius: 20, shadowOffset: { width: 0, height: 0 },
    transform: [{ perspective: 300 }, { rotateX: '-30deg' }],
  },
  screenLabel: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: spacing.sm, letterSpacing: 3 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  rowLabel: { color: colors.textMuted, width: 20, textAlign: 'center', fontSize: fontSize.xs, fontWeight: '600' },
  legend: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    padding: spacing.md, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.md,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.sm },
  legendDot: { width: 12, height: 12, borderRadius: 3, marginRight: 4 },
  legendText: { color: colors.textSecondary, fontSize: fontSize.xs },
  selectedBox: { margin: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md },
  selectedTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '600', marginBottom: spacing.sm },
  selectedRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  selectedSeat: { color: colors.textSecondary, fontSize: fontSize.sm },
  selectedPrice: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
  },
  totalLabel: { color: colors.textSecondary, fontSize: fontSize.xs },
  totalValue: { color: colors.primary, fontSize: fontSize.xl, fontWeight: 'bold' },
  continueBtn: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  continueText: { color: '#fff', fontWeight: '700', fontSize: fontSize.md },
});

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Loading from '../components/Loading';
import { bookingApi } from '../api/client';
import { colors, radius, fontSize, spacing, formatCurrency, formatDate, formatTime } from '../theme';

export default function BookingConfirmScreen({ route, navigation }) {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const b = await bookingApi.detail(bookingId);
        setBooking(b);
      } catch (e) {}
      finally { setLoading(false); }
    })();
  }, [bookingId]);

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}>
        {/* Success icon */}
        <View style={styles.successBox}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>Đặt vé thành công!</Text>
          <Text style={styles.successSub}>Vé đã được gửi vào email của bạn</Text>
        </View>

        {/* QR ticket */}
        <View style={styles.ticket}>
          <View style={styles.ticketHeader}>
            <Text style={styles.movieTitle}>{booking.movie_title}</Text>
            <Text style={styles.roomType}>{booking.room_type_name}</Text>
          </View>

          {/* QR placeholder (thay thật bằng thư viện react-native-qrcode-svg) */}
          <View style={styles.qrBox}>
            <Text style={styles.qrPlaceholder}>[QR CODE]</Text>
            <Text style={styles.qrCode}>{booking.qr_code || booking.booking_code}</Text>
          </View>

          <View style={styles.separator}>
            <View style={styles.circleLeft} />
            <View style={styles.dashLine} />
            <View style={styles.circleRight} />
          </View>

          <View style={styles.ticketBody}>
            <InfoItem label="Mã đặt vé" value={booking.booking_code} />
            <InfoItem label="Rạp chiếu" value={booking.cinema_name} />
            <InfoItem label="Phòng" value={booking.room_name} />
            <InfoItem
              label="Ngày giờ"
              value={`${formatDate(booking.start_time)} ${formatTime(booking.start_time)}`}
            />
            <InfoItem
              label="Ghế"
              value={booking.seats?.map(s => s.seat_code).join(', ') || '-'}
            />
            <InfoItem
              label="Số lượng"
              value={`${booking.seats?.length || 0} vé`}
            />
            <View style={styles.divider} />
            <InfoItem label="Tạm tính" value={formatCurrency(booking.subtotal)} />
            {booking.discount_amount > 0 && (
              <InfoItem
                label="Giảm giá"
                value={`-${formatCurrency(booking.discount_amount)}`}
                highlight={colors.success}
              />
            )}
            <InfoItem
              label="Tổng tiền"
              value={formatCurrency(booking.final_amount)}
              highlight={colors.primary}
              bold
            />
            {booking.points_earned > 0 && (
              <Text style={styles.points}>
                🎁 Bạn được cộng {booking.points_earned} điểm tích lũy
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.popToTop()}>
          <Text style={styles.secondaryText}>Về trang chủ</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.reset({ index: 1, routes: [{ name: 'Main' }, { name: 'MyBookings' }] })}
        >
          <Text style={styles.primaryText}>Vé của tôi</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function InfoItem({ label, value, highlight, bold }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[
        styles.infoValue,
        bold && { fontWeight: 'bold', fontSize: fontSize.lg },
        highlight && { color: highlight },
      ]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  successBox: {
    alignItems: 'center', padding: spacing.xl, backgroundColor: colors.success + '15',
    borderRadius: radius.xl, marginBottom: spacing.md,
  },
  successIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.success,
    color: '#fff', fontSize: 50, textAlign: 'center', lineHeight: 80, fontWeight: 'bold',
    overflow: 'hidden',
  },
  successTitle: { color: colors.text, fontSize: fontSize.xxl, fontWeight: 'bold', marginTop: spacing.md },
  successSub: { color: colors.textSecondary, marginTop: 4 },
  ticket: { backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden' },
  ticketHeader: { padding: spacing.md, backgroundColor: colors.primary },
  movieTitle: { color: '#fff', fontSize: fontSize.lg, fontWeight: '700' },
  roomType: { color: '#fff', fontSize: fontSize.sm, opacity: 0.9, marginTop: 4 },
  qrBox: { padding: spacing.xl, alignItems: 'center', backgroundColor: '#fff' },
  qrPlaceholder: {
    width: 160, height: 160, backgroundColor: '#000', color: '#fff',
    textAlign: 'center', lineHeight: 160, fontSize: 18, fontWeight: '700',
  },
  qrCode: { color: '#000', marginTop: spacing.sm, fontFamily: 'monospace', fontSize: fontSize.sm, fontWeight: '700' },
  separator: { flexDirection: 'row', alignItems: 'center' },
  circleLeft: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: colors.background,
    marginLeft: -12,
  },
  circleRight: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: colors.background,
    marginRight: -12,
  },
  dashLine: {
    flex: 1, height: 1, borderTopWidth: 2, borderStyle: 'dashed', borderColor: colors.border,
  },
  ticketBody: { padding: spacing.md },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  infoItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  infoLabel: { color: colors.textSecondary, fontSize: fontSize.sm },
  infoValue: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600', textAlign: 'right', maxWidth: '60%' },
  points: { color: colors.warning, textAlign: 'center', marginTop: spacing.md, fontSize: fontSize.sm },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row',
    padding: spacing.md, gap: spacing.sm, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
  },
  secondaryBtn: {
    flex: 1, backgroundColor: colors.surfaceLight, paddingVertical: spacing.md,
    borderRadius: radius.md, alignItems: 'center',
  },
  secondaryText: { color: colors.text, fontWeight: '600' },
  primaryBtn: {
    flex: 1, backgroundColor: colors.primary, paddingVertical: spacing.md,
    borderRadius: radius.md, alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
});

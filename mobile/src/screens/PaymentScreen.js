import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Loading from '../components/Loading';
import { paymentApi, couponApi, bookingApi } from '../api/client';
import { colors, radius, fontSize, spacing, formatCurrency, formatDate, formatTime } from '../theme';

export default function PaymentScreen({ route, navigation }) {
  const { bookingId, bookingCode, subtotal, finalAmount: initialFinal, expiredAt, show, seats } = route.params;
  const [methods, setMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [finalAmount, setFinalAmount] = useState(initialFinal);
  const [discount, setDiscount] = useState(0);
  const [remaining, setRemaining] = useState(0);

  // Đếm ngược
  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(expiredAt) - Date.now()) / 1000));
      setRemaining(diff);
      if (diff === 0) {
        Alert.alert('Hết hạn', 'Đơn đã hết hạn giữ chỗ. Vui lòng đặt lại.', [
          { text: 'OK', onPress: () => navigation.popToTop() },
        ]);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiredAt]);

  useEffect(() => {
    (async () => {
      try {
        const m = await paymentApi.methods();
        setMethods(m);
        setSelectedMethod(m[0]);
      } catch (e) { Alert.alert('Lỗi', e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const res = await couponApi.validate({
        code: couponCode.trim().toUpperCase(),
        subtotal,
        showtime_id: show.showtime_id,
      });
      if (!res.valid) throw new Error(res.message);
      setCoupon({ code: couponCode.trim().toUpperCase(), name: res.coupon_name });
      setDiscount(res.discount);
      setFinalAmount(res.final_amount);
      Alert.alert('Thành công', `Áp dụng ${res.coupon_name}\nGiảm ${formatCurrency(res.discount)}`);
    } catch (e) {
      Alert.alert('Không thể áp dụng', e.message);
    }
  };

  const removeCoupon = () => {
    setCoupon(null); setCouponCode(''); setDiscount(0); setFinalAmount(initialFinal);
  };

  const handlePay = async () => {
    if (!selectedMethod) return Alert.alert('Chọn phương thức', 'Vui lòng chọn phương thức thanh toán');
    setPaying(true);
    try {
      // Nếu có coupon, gọi lại create để tính toán lại. Đơn giản hoá ở đây — ta đã validate,
      // trong thực tế nên gọi endpoint "update booking" hoặc "apply coupon on booking"
      const res = await paymentApi.pay({
        booking_id: bookingId,
        method_code: selectedMethod.code,
      });
      navigation.replace('BookingConfirm', { bookingId });
    } catch (e) {
      Alert.alert('Thanh toán thất bại', e.message);
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <Loading />;

  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ color: colors.text, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thanh toán</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.timer}>
        <Text style={styles.timerText}>⏱ Giữ chỗ còn <Text style={{ fontWeight: '700' }}>{mm}:{ss}</Text></Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Thông tin đơn */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{show?.movie_title}</Text>
          <Text style={styles.cardSub}>
            {show?.cinema_name} • {show?.room_name} ({show?.room_type_code})
          </Text>
          <Text style={styles.cardSub}>
            {formatDate(show?.start_time)} {formatTime(show?.start_time)}
          </Text>
          <View style={styles.divider} />
          <Text style={styles.label}>Ghế: {seats?.map(s => s.seat_code).join(', ')}</Text>
          <Text style={styles.label}>Mã đơn: <Text style={{ color: colors.text, fontWeight: '600' }}>{bookingCode}</Text></Text>
        </View>

        {/* Coupon */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>🎟 Mã giảm giá</Text>
          {coupon ? (
            <View style={styles.couponApplied}>
              <View>
                <Text style={{ color: colors.success, fontWeight: '600' }}>✓ {coupon.name}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 }}>
                  Mã: {coupon.code}
                </Text>
              </View>
              <TouchableOpacity onPress={removeCoupon}>
                <Text style={{ color: colors.error }}>Xóa</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TextInput
                style={styles.couponInput}
                placeholder="Nhập mã: U22, HAPPYDAY, ..."
                placeholderTextColor={colors.textMuted}
                value={couponCode}
                onChangeText={setCouponCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={styles.applyBtn} onPress={applyCoupon}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>Áp dụng</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Payment methods */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>💳 Phương thức thanh toán</Text>
          {methods.map(m => (
            <TouchableOpacity
              key={m.method_id}
              style={[styles.method, selectedMethod?.method_id === m.method_id && styles.methodActive]}
              onPress={() => setSelectedMethod(m)}
            >
              <Text style={styles.methodText}>{m.name}</Text>
              {m.fee_percent > 0 && <Text style={styles.methodFee}>+{m.fee_percent}%</Text>}
              {selectedMethod?.method_id === m.method_id && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Tổng kết</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Tạm tính</Text>
            <Text style={styles.value}>{formatCurrency(subtotal)}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.label, { color: colors.success }]}>Giảm giá</Text>
              <Text style={[styles.value, { color: colors.success }]}>-{formatCurrency(discount)}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={[styles.label, { color: colors.text, fontWeight: '700' }]}>Tổng thanh toán</Text>
            <Text style={styles.total}>{formatCurrency(finalAmount)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.payBtn, paying && { opacity: 0.6 }]}
          onPress={handlePay}
          disabled={paying}
        >
          <Text style={styles.payText}>
            {paying ? 'Đang xử lý...' : `Thanh toán ${formatCurrency(finalAmount)}`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', color: colors.text, fontSize: fontSize.lg, fontWeight: '700' },
  timer: { backgroundColor: colors.warning + '20', padding: spacing.sm, alignItems: 'center' },
  timerText: { color: colors.warning, fontSize: fontSize.sm },
  card: { backgroundColor: colors.surface, margin: spacing.md, padding: spacing.md, borderRadius: radius.md },
  cardTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  cardSub: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '600', marginBottom: spacing.sm },
  label: { color: colors.textSecondary, fontSize: fontSize.sm, marginVertical: 2 },
  value: { color: colors.text, fontSize: fontSize.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  total: { color: colors.primary, fontSize: fontSize.xl, fontWeight: 'bold' },
  couponInput: {
    flex: 1, backgroundColor: colors.surfaceLight, color: colors.text,
    padding: spacing.md, borderRadius: radius.md, fontSize: fontSize.md,
  },
  applyBtn: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.md,
    borderRadius: radius.md, justifyContent: 'center',
  },
  couponApplied: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.success + '15', padding: spacing.md, borderRadius: radius.md,
  },
  method: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.md,
    backgroundColor: colors.surfaceLight, borderRadius: radius.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: 'transparent',
  },
  methodActive: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  methodText: { flex: 1, color: colors.text, fontSize: fontSize.md, fontWeight: '500' },
  methodFee: { color: colors.textMuted, fontSize: fontSize.xs, marginRight: spacing.sm },
  checkmark: { color: colors.primary, fontSize: fontSize.lg, fontWeight: 'bold' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
  },
  payBtn: {
    backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center',
  },
  payText: { color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
});

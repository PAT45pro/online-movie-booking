import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Loading from '../components/Loading';
import { bookingApi } from '../api/client';
import { colors, radius, fontSize, spacing, formatCurrency, formatDate, formatTime } from '../theme';

const statusLabel = {
  pending: { text: 'Chờ thanh toán', color: colors.warning },
  awaiting_payment: { text: 'Chờ thanh toán', color: colors.warning },
  paid: { text: 'Đã thanh toán', color: colors.success },
  used: { text: 'Đã sử dụng', color: colors.textMuted },
  expired: { text: 'Hết hạn', color: colors.textMuted },
  refunded_by_cinema: { text: 'Đã hoàn (rạp hủy)', color: colors.info || '#3498DB' },
};

export default function MyBookingsScreen({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const data = await bookingApi.mine();
      setBookings(data);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetch(); }, [fetch]));

  const onRefresh = () => { setRefreshing(true); fetch(); };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Vé của tôi</Text>
      </View>

      <FlatList
        data={bookings}
        keyExtractor={i => String(i.booking_id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
        ListEmptyComponent={
          <View style={{ padding: spacing.xl, alignItems: 'center' }}>
            <Text style={{ fontSize: 48 }}>🎫</Text>
            <Text style={{ color: colors.textSecondary, marginTop: spacing.md }}>Chưa có vé nào</Text>
          </View>
        }
        renderItem={({ item }) => {
          const st = statusLabel[item.status] || { text: item.status, color: colors.textMuted };
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                if (item.status === 'paid' || item.status === 'used') {
                  navigation.navigate('BookingConfirm', { bookingId: item.booking_id });
                }
              }}
            >
              <Image
                source={{ uri: item.poster_url || 'https://via.placeholder.com/100x150' }}
                style={styles.poster}
              />
              <View style={styles.info}>
                <Text style={styles.movieTitle} numberOfLines={2}>{item.movie_title}</Text>
                <Text style={styles.sub}>{item.cinema_name}</Text>
                <Text style={styles.sub}>
                  {formatDate(item.start_time)} {formatTime(item.start_time)} • {item.room_name}
                </Text>
                <View style={styles.bottomRow}>
                  <View style={[styles.statusBadge, { backgroundColor: st.color + '20' }]}>
                    <Text style={[styles.statusText, { color: st.color }]}>{st.text}</Text>
                  </View>
                  <Text style={styles.price}>{formatCurrency(item.final_amount)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.md },
  title: { color: colors.text, fontSize: fontSize.xxl, fontWeight: 'bold' },
  card: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: radius.md, marginBottom: spacing.md, overflow: 'hidden',
  },
  poster: { width: 90, height: 135, backgroundColor: colors.surfaceLight },
  info: { flex: 1, padding: spacing.md, justifyContent: 'space-between' },
  movieTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  sub: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 4 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  statusText: { fontSize: fontSize.xs, fontWeight: '600' },
  price: { color: colors.primary, fontWeight: '700', fontSize: fontSize.md },
});

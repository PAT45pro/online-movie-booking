import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, SectionList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Loading from '../components/Loading';
import { movieApi } from '../api/client';
import { colors, radius, fontSize, spacing, formatDate, formatTime, formatCurrency } from '../theme';

export default function MovieDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [movie, setMovie] = useState(null);
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [m, s] = await Promise.all([movieApi.detail(id), movieApi.showtimes(id)]);
        setMovie(m); setShowtimes(s);
      } catch (e) { console.warn(e.message); }
      finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) return <Loading />;
  if (!movie) return <View style={styles.container}><Text style={{ color: colors.text }}>Không tìm thấy phim</Text></View>;

  // Nhóm suất chiếu theo ngày
  const byDate = {};
  showtimes.forEach(s => {
    const d = new Date(s.start_time).toISOString().slice(0, 10);
    (byDate[d] = byDate[d] || []).push(s);
  });
  const dates = Object.keys(byDate).sort();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView>
        <View style={styles.hero}>
          <Image source={{ uri: movie.poster_url }} style={styles.heroBg} blurRadius={20} />
          <View style={styles.heroOverlay}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={{ color: '#fff', fontSize: 18 }}>←</Text>
            </TouchableOpacity>
            <View style={styles.heroContent}>
              <Image source={{ uri: movie.poster_url }} style={styles.poster} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.title}>{movie.title}</Text>
                {movie.original_title ? <Text style={styles.original}>{movie.original_title}</Text> : null}
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.badgeText}>{movie.age_rating}</Text>
                  </View>
                  <Text style={styles.metaText}>⏱ {movie.duration_minutes}′</Text>
                  <Text style={styles.metaText}>⭐ {Number(movie.rating_avg).toFixed(1)}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nội dung</Text>
          <Text style={styles.description}>{movie.description || 'Chưa có mô tả.'}</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Đạo diễn</Text>
            <Text style={styles.infoValue}>{movie.director || '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Quốc gia</Text>
            <Text style={styles.infoValue}>{movie.country || '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ngôn ngữ</Text>
            <Text style={styles.infoValue}>{movie.language || '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Khởi chiếu</Text>
            <Text style={styles.infoValue}>{movie.release_date}</Text>
          </View>
          {movie.genres?.length ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Thể loại</Text>
              <Text style={styles.infoValue}>{movie.genres.map(g => g.name).join(', ')}</Text>
            </View>
          ) : null}
        </View>

        {/* Showtimes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lịch chiếu</Text>
          {dates.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>Chưa có suất chiếu</Text>
          ) : (
            dates.map(date => (
              <View key={date} style={{ marginBottom: spacing.md }}>
                <Text style={styles.dateHeader}>{formatDate(date)} ({date})</Text>
                {/* Nhóm theo rạp */}
                {Object.values(byDate[date].reduce((acc, s) => {
                  (acc[s.cinema_id] = acc[s.cinema_id] || { cinema: s, items: [] }).items.push(s);
                  return acc;
                }, {})).map(group => (
                  <View key={group.cinema.cinema_id} style={styles.cinemaGroup}>
                    <Text style={styles.cinemaName}>{group.cinema.cinema_name}</Text>
                    <Text style={styles.cinemaAddr} numberOfLines={1}>{group.cinema.address}</Text>
                    <View style={styles.timeList}>
                      {group.items.map(s => (
                        <TouchableOpacity
                          key={s.showtime_id}
                          style={styles.timeBtn}
                          onPress={() => navigation.navigate('SeatSelection', { showtimeId: s.showtime_id })}
                        >
                          <Text style={styles.timeText}>{formatTime(s.start_time)}</Text>
                          <Text style={styles.roomType}>{s.room_type_code}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: { height: 280, position: 'relative' },
  heroBg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.4 },
  heroOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.7)', padding: spacing.md },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  heroContent: { flexDirection: 'row', marginTop: spacing.lg, alignItems: 'flex-end', flex: 1 },
  poster: { width: 100, height: 150, borderRadius: radius.md, backgroundColor: colors.surface },
  title: { color: colors.text, fontSize: fontSize.xxl, fontWeight: 'bold' },
  original: { color: colors.textSecondary, fontSize: fontSize.sm, fontStyle: 'italic', marginTop: 4 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.sm },
  badgeText: { color: '#fff', fontSize: fontSize.xs, fontWeight: '700' },
  metaText: { color: colors.textSecondary, fontSize: fontSize.sm },
  section: { padding: spacing.md },
  sectionTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing.sm },
  description: { color: colors.textSecondary, lineHeight: 22, fontSize: fontSize.sm, marginBottom: spacing.md },
  infoRow: { flexDirection: 'row', paddingVertical: 6 },
  infoLabel: { color: colors.textMuted, width: 100, fontSize: fontSize.sm },
  infoValue: { color: colors.text, flex: 1, fontSize: fontSize.sm },
  dateHeader: { color: colors.text, fontSize: fontSize.md, fontWeight: '700', marginVertical: spacing.sm },
  cinemaGroup: {
    backgroundColor: colors.surface, padding: spacing.md,
    borderRadius: radius.md, marginBottom: spacing.sm,
  },
  cinemaName: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  cinemaAddr: { color: colors.textMuted, fontSize: fontSize.xs, marginBottom: spacing.sm },
  timeList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  timeBtn: {
    backgroundColor: colors.surfaceLight, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.md, alignItems: 'center', minWidth: 70,
  },
  timeText: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  roomType: { color: colors.primary, fontSize: fontSize.xs, marginTop: 2, fontWeight: '600' },
});

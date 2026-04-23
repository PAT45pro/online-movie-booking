import React from 'react';
import { TouchableOpacity, View, Text, Image, StyleSheet } from 'react-native';
import { colors, radius, fontSize, spacing } from '../theme';

export default function MovieCard({ movie, onPress, horizontal }) {
  const W = horizontal ? 140 : '100%';
  const H = horizontal ? 210 : 240;
  return (
    <TouchableOpacity style={[styles.card, { width: W }]} onPress={onPress} activeOpacity={0.8}>
      <Image
        source={{ uri: movie.poster_url || 'https://via.placeholder.com/300x450?text=Movie' }}
        style={[styles.poster, { height: H }]}
        resizeMode="cover"
      />
      <View style={styles.ageBadge}>
        <Text style={styles.ageText}>{movie.age_rating || 'P'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{movie.title}</Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>⭐ {Number(movie.rating_avg || 0).toFixed(1)}</Text>
          <Text style={styles.metaText}>{movie.duration_minutes}′</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  poster: { width: '100%', backgroundColor: colors.surfaceLight },
  ageBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: radius.sm,
  },
  ageText: { color: colors.text, fontSize: fontSize.xs, fontWeight: '700' },
  info: { padding: spacing.sm },
  title: { color: colors.text, fontSize: fontSize.md, fontWeight: '600', marginBottom: 4 },
  meta: { flexDirection: 'row', gap: 10 },
  metaText: { color: colors.textSecondary, fontSize: fontSize.sm },
});

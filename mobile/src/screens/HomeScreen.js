import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, TextInput, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MovieCard from '../components/MovieCard';
import Loading from '../components/Loading';
import { movieApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors, radius, fontSize, spacing } from '../theme';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [tab, setTab] = useState('now_showing');
  const [movies, setMovies] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMovies = useCallback(async () => {
    try {
      const data = await movieApi.list({
        status: tab,
        search: search || undefined,
      });
      setMovies(data);
    } catch (e) {
      console.warn(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, search]);

  useEffect(() => { fetchMovies(); }, [fetchMovies]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMovies();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Xin chào 👋</Text>
          <Text style={styles.username}>{user?.full_name || 'Khách'}</Text>
        </View>
        <TouchableOpacity
          style={styles.avatarBtn}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={{ fontSize: 20 }}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Text style={{ fontSize: 18, marginRight: 8 }}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm phim..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={fetchMovies}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {[
          { key: 'now_showing', label: 'Đang chiếu' },
          { key: 'coming_soon', label: 'Sắp chiếu' },
        ].map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={movies}
          keyExtractor={i => String(i.movie_id)}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: spacing.md }}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 40 }}>
              Không có phim nào
            </Text>
          }
          renderItem={({ item }) => (
            <View style={{ width: '48%' }}>
              <MovieCard
                movie={item}
                onPress={() => navigation.navigate('MovieDetail', { id: item.movie_id, title: item.title })}
              />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md,
  },
  hello: { color: colors.textSecondary, fontSize: fontSize.sm },
  username: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700' },
  avatarBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.md, paddingHorizontal: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg, height: 44,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: fontSize.md },
  tabs: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm },
  tab: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.xxl, backgroundColor: colors.surface,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
});

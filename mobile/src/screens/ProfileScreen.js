import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors, radius, fontSize, spacing } from '../theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const confirmLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.full_name?.charAt(0)?.toUpperCase() || '👤'}
            </Text>
          </View>
          <Text style={styles.name}>{user?.full_name}</Text>
          <Text style={styles.email}>{user?.email}</Text>

          {user?.tier_name && (
            <View style={styles.tierBadge}>
              <Text style={styles.tierText}>⭐ Thành viên {user.tier_name}</Text>
            </View>
          )}
        </View>

        <View style={styles.pointsCard}>
          <Text style={styles.pointsLabel}>Điểm tích lũy</Text>
          <Text style={styles.pointsValue}>{user?.loyalty_points || 0}</Text>
        </View>

        <View style={styles.section}>
          <InfoRow label="📧 Email" value={user?.email} />
          <InfoRow label="📱 SĐT" value={user?.phone || 'Chưa cập nhật'} />
          <InfoRow label="🎂 Ngày sinh" value={user?.date_of_birth || 'Chưa cập nhật'} />
          <InfoRow label="👤 Vai trò" value={user?.role_name || 'customer'} />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { alignItems: 'center', padding: spacing.xl },
  avatar: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 48, fontWeight: 'bold' },
  name: { color: colors.text, fontSize: fontSize.xl, fontWeight: 'bold', marginTop: spacing.md },
  email: { color: colors.textSecondary, marginTop: 4 },
  tierBadge: {
    backgroundColor: colors.warning + '20', paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.xxl, marginTop: spacing.md,
  },
  tierText: { color: colors.warning, fontWeight: '600' },
  pointsCard: {
    backgroundColor: colors.primary, margin: spacing.md, padding: spacing.lg,
    borderRadius: radius.lg, alignItems: 'center',
  },
  pointsLabel: { color: '#fff', fontSize: fontSize.sm, opacity: 0.9 },
  pointsValue: { color: '#fff', fontSize: 40, fontWeight: 'bold', marginTop: 4 },
  section: {
    backgroundColor: colors.surface, margin: spacing.md,
    borderRadius: radius.md, paddingHorizontal: spacing.md,
  },
  row: { flexDirection: 'row', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { color: colors.textSecondary, width: 120 },
  rowValue: { color: colors.text, flex: 1 },
  logoutBtn: {
    backgroundColor: colors.error, margin: spacing.md, padding: spacing.md,
    borderRadius: radius.md, alignItems: 'center',
  },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: fontSize.md },
});

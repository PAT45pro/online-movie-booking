import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, radius, fontSize, spacing } from '../theme';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('demo@cinema.vn');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Lỗi', 'Nhập đầy đủ email & mật khẩu');
    setLoading(true);
    try {
      await login(email, password);
    } catch (e) {
      Alert.alert('Đăng nhập thất bại', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>🎬</Text>
        <Text style={styles.title}>Cinema Booking</Text>
        <Text style={styles.subtitle}>Đặt vé xem phim dễ dàng</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="example@email.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Mật khẩu</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
          />

          <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
            <Text style={styles.btnText}>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={{ marginTop: spacing.md }}>
            <Text style={styles.linkText}>
              Chưa có tài khoản? <Text style={{ color: colors.primary }}>Đăng ký ngay</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.demoHint}>
          <Text style={styles.demoTitle}>💡 Tài khoản demo</Text>
          <Text style={styles.demoText}>demo@cinema.vn / 123456</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center' },
  logo: { fontSize: 64, textAlign: 'center', marginBottom: spacing.md },
  title: { color: colors.text, fontSize: fontSize.xxxl, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl, marginTop: 4 },
  form: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.xl },
  label: { color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: 6, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.surfaceLight,
    color: colors.text,
    padding: spacing.md,
    borderRadius: radius.md,
    fontSize: fontSize.md,
  },
  btn: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  btnText: { color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
  linkText: { color: colors.textSecondary, textAlign: 'center' },
  demoHint: {
    marginTop: spacing.xl, padding: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderLeftWidth: 3, borderLeftColor: colors.warning,
  },
  demoTitle: { color: colors.warning, fontWeight: '600', fontSize: fontSize.sm },
  demoText: { color: colors.textSecondary, marginTop: 4, fontSize: fontSize.sm },
});

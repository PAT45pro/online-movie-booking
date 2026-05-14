import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, radius, fontSize, spacing } from '../theme';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', password: '', date_of_birth: '',
  });
  const [loading, setLoading] = useState(false);

  const setField = (k) => (v) => setForm(s => ({ ...s, [k]: v }));

  const submit = async () => {
    if (!form.email || !form.password || !form.full_name) {
      return Alert.alert('Lỗi', 'Nhập đầy đủ họ tên, email và mật khẩu');
    }
    if (form.password.length < 6) return Alert.alert('Lỗi', 'Mật khẩu tối thiểu 6 ký tự');

    setLoading(true);
    try {
      await register(form);
    } catch (e) {
      Alert.alert('Đăng ký thất bại', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Tạo tài khoản</Text>
        <Text style={styles.subtitle}>Bắt đầu trải nghiệm đặt vé</Text>

        <View style={styles.form}>
          {[
            ['Họ và tên *', 'full_name', 'Nguyễn Văn A', 'default'],
            ['Email *', 'email', 'example@email.com', 'email-address'],
            ['Số điện thoại', 'phone', '0901234567', 'phone-pad'],
            ['Ngày sinh (YYYY-MM-DD)', 'date_of_birth', '2005-01-15', 'default'],
            ['Mật khẩu *', 'password', '', 'default'],
          ].map(([label, key, placeholder, kb]) => (
            <View key={key}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                style={styles.input}
                value={form[key]}
                onChangeText={setField(key)}
                placeholder={placeholder}
                placeholderTextColor={colors.textMuted}
                keyboardType={kb}
                autoCapitalize={key === 'email' ? 'none' : 'sentences'}
                secureTextEntry={key === 'password'}
              />
            </View>
          ))}

          <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
            <Text style={styles.btnText}>{loading ? 'Đang tạo...' : 'Đăng ký'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: spacing.md }}>
            <Text style={styles.linkText}>
              Đã có tài khoản? <Text style={{ color: colors.primary }}>Đăng nhập</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg },
  title: { color: colors.text, fontSize: fontSize.xxl, fontWeight: 'bold', marginTop: spacing.lg },
  subtitle: { color: colors.textSecondary, marginBottom: spacing.lg, marginTop: 4 },
  form: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.xl },
  label: { color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: 6, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.surfaceLight, color: colors.text,
    padding: spacing.md, borderRadius: radius.md, fontSize: fontSize.md,
  },
  btn: {
    backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.md,
    alignItems: 'center', marginTop: spacing.lg,
  },
  btnText: { color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
  linkText: { color: colors.textSecondary, textAlign: 'center' },
});

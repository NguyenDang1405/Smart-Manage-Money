import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { useAuth } from '@clerk/clerk-expo';

/**
 * OAuth Callback Page
 *
 * Clerk tự động xử lý token từ URL sau khi Google OAuth redirect về đây.
 * Chúng ta chỉ cần chờ Clerk hoàn tất rồi điều hướng về trang chính.
 *
 * Lưu ý: Đây là trang dùng cho cả web lẫn native redirect.
 */
export default function OAuthCallbackPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    // Khi Clerk đã load xong, kiểm tra trạng thái đăng nhập
    if (isSignedIn) {
      // Đăng nhập thành công → về trang chính
      router.replace('/');
    } else {
      // Nếu vẫn chưa đăng nhập sau 3 giây, quay về màn hình auth
      const timer = setTimeout(() => {
        router.replace('/auth');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, isSignedIn, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0D9488" />
      <Text style={styles.text}>Đang xác thực tài khoản...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    gap: 16,
  },
  text: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
  },
});

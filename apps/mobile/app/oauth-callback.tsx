import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';

export default function OAuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Clerk's ClerkProvider wraps the app, so it will automatically process the OAuth token in the URL.
    // We redirect to the home page after a brief delay.
    const timer = setTimeout(() => {
      router.replace('/');
    }, 1500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#0d9488" />
      <Text className="mt-4 text-muted-foreground text-sm">Đang xác thực tài khoản...</Text>
    </View>
  );
}

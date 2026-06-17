import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Home, Wallet, Bot, TrendingUp, User, Plus } from 'lucide-react-native';
  
interface AppBottomTabProps {
  activeTab: 'home' | 'transactions' | 'ai-chat' | 'insights' | 'profile';
}

function TabItem({
  tab,
  isActive,
  onPress,
}: {
  tab: { key: string; label: string; icon: any; route: string };
  isActive: boolean;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const Icon = tab.icon;

  useEffect(() => {
    if (isActive) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.15, duration: 120, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
    }
  }, [isActive]);

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
        {isActive ? (
          <View
            style={{
              backgroundColor: '#0D9488',
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 7,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              shadowColor: '#0D9488',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            <Icon size={16} color="white" strokeWidth={2.5} />
            <Text style={{ color: 'white', fontSize: 11, fontWeight: '700', fontFamily: 'Manrope-Bold' }}>
              {tab.label}
            </Text>
          </View>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Icon size={22} color="#94A3B8" strokeWidth={1.8} />
            <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '500', marginTop: 3, fontFamily: 'Manrope-Medium' }}>
              {tab.label}
            </Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function AppBottomTab({ activeTab }: AppBottomTabProps) {
  const router = useRouter();

  const tabs = [
    { key: 'home', label: 'Trang chủ', icon: Home, route: '/' },
    { key: 'transactions', label: 'Giao dịch', icon: Wallet, route: '/transactions' },
    { key: 'ai-chat', label: 'AI Chat', icon: Bot, route: '/chat' },
    { key: 'insights', label: 'Insights', icon: TrendingUp, route: '/insights' },
    { key: 'profile', label: 'Cá nhân', icon: User, route: '/profile' },
  ];

  return (
    <View style={{ position: 'relative', width: '100%' }}>
      {/* FAB */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push('/add-transaction')}
        style={{
          position: 'absolute',
          top: -76,
          right: 20,
          width: 56,
          height: 56,
          backgroundColor: '#0D9488',
          borderRadius: 28,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          shadowColor: '#0D9488',
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.4,
          shadowRadius: 10,
          elevation: 8,
          borderWidth: 3,
          borderColor: 'rgba(255,255,255,0.8)',
        }}
      >
        <Plus size={28} color="white" strokeWidth={2.5} />
      </TouchableOpacity>

      {/* Bar */}
      <View
        style={{
          backgroundColor: 'rgba(255,255,255,0.97)',
          borderTopWidth: 1,
          borderTopColor: 'rgba(226,232,240,0.8)',
          paddingHorizontal: 4,
          paddingBottom: Platform.OS === 'ios' ? 12 : 4,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 12,
        }}
      >
        {tabs.map((tab) => (
          <TabItem
            key={tab.key}
            tab={tab}
            isActive={activeTab === tab.key}
            onPress={() => router.push(tab.route as any)}
          />
        ))}
      </View>
    </View>
  );
}

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Home, Wallet, Bot, TrendingUp, User, Plus } from 'lucide-react-native';

interface AppBottomTabProps {
  activeTab: 'home' | 'transactions' | 'ai-chat' | 'insights' | 'profile';
}

export default function AppBottomTab({ activeTab }: AppBottomTabProps) {
  const router = useRouter();

  const handleTabPress = (tab: string, route: string) => {
    router.push(route as any);
  };

  const tabs = [
    { key: 'home', label: 'Trang chủ', icon: Home, route: '/' },
    { key: 'transactions', label: 'Giao dịch', icon: Wallet, route: '/transactions' },
    { key: 'ai-chat', label: 'AI Chat', icon: Bot, route: '/chat' },
    { key: 'insights', label: 'Insights', icon: TrendingUp, route: '/insights' },
    { key: 'profile', label: 'Cá nhân', icon: User, route: '/profile' }
  ];

  return (
    <View className="relative w-full">
      {/* Green "+" Floating Action Button (FAB) */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push('/add-transaction')}
        className="absolute -top-20 right-6 w-14 h-14 bg-[#0D9488] rounded-full items-center justify-center shadow-lg shadow-teal-900/40 z-50"
        style={{ 
          elevation: 6,
          shadowColor: '#0D9488',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8
        }}
      >
        <Plus size={28} color="white" />
      </TouchableOpacity>

      {/* Footer Navigation Bar */}
      <View className="bg-white border-t border-slate-100 py-3 px-2 flex-row justify-between items-center shadow-xl">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;

          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.8}
              onPress={() => handleTabPress(tab.key, tab.route)}
              className="flex-1 items-center justify-center py-1"
            >
              {isActive ? (
                <View className="bg-teal-50 px-4 py-2 rounded-2xl items-center justify-center flex-row gap-1.5 min-w-[95px]">
                  <Icon size={18} color="#0D9488" strokeWidth={2.5} />
                  <Text 
                    className="text-xs text-[#0D9488] font-bold"
                    style={{ fontFamily: 'Manrope-Bold' }}
                  >
                    {tab.label}
                  </Text>
                </View>
              ) : (
                <View className="items-center justify-center py-1">
                  <Icon size={22} color="#94A3B8" strokeWidth={2} />
                  <Text 
                    className="text-[10px] text-slate-400 font-medium mt-1"
                    style={{ fontFamily: 'Manrope-Medium' }}
                  >
                    {tab.label}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

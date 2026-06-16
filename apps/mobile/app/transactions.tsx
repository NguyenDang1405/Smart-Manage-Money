import React, { useState, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
  PanResponder,
  Platform,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Keyboard,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiClient, getAuthToken } from '../lib/http';
import { useRouter } from 'expo-router';
import {
  Search,
  SlidersHorizontal,
  Wallet,
  Utensils,
  ShoppingCart,
  Car,
  DollarSign,
  Trash2,
  Sparkles,
  ArrowRight,
  Plus,
  Home,
  PiggyBank,
  User,
  FileUp,
  X,
  Calendar as CalendarIcon,
} from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useTransactions, type Transaction } from '../context/TransactionsContext';
import AppBottomTab from '../components/AppBottomTab';

const TABS = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Thu nhập', value: 'income' },
  { label: 'Chi tiêu', value: 'expense' },
  { label: 'Tiết kiệm', value: 'savings' },
];

const TYPE_COLORS: Record<string, string> = {
  expense: '#ef4444',
  income: '#0d9488',
  savings: '#2563eb',
};

const getCategoryIcon = (category: string, type: string) => {
  const color = TYPE_COLORS[type] || '#64748b';
  const bg =
    type === 'expense'
      ? 'bg-red-50'
      : type === 'income'
      ? 'bg-teal-50'
      : 'bg-blue-50';
  let IconComponent = Utensils;
  if (category?.toLowerCase().includes('di chuy')) IconComponent = Car;
  else if (category?.toLowerCase().includes('mua')) IconComponent = ShoppingCart;
  else if (
    category?.toLowerCase().includes('lương') ||
    category?.toLowerCase().includes('thu')
  )
    IconComponent = DollarSign;
  else if (
    category?.toLowerCase().includes('ví') ||
    category?.toLowerCase().includes('tài khoản')
  )
    IconComponent = Wallet;
  return { IconComponent, color, bg };
};

// Swipeable Transaction Row
function SwipeableTransactionItem({
  tx,
  onPress,
  onDelete,
}: {
  tx: Transaction;
  onPress: () => void;
  onDelete: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const DELETE_THRESHOLD = -70;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 8 && Math.abs(gs.dy) < 20,
      onPanResponderMove: (_, gs) => {
        if (gs.dx < 0)
          translateX.setValue(Math.max(gs.dx, -90));
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < DELETE_THRESHOLD) {
          Animated.spring(translateX, {
            toValue: -80,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const sign = tx.type === 'expense' ? '-' : '+';
  const amountColor =
    tx.type === 'expense'
      ? 'text-red-500'
      : tx.type === 'income'
      ? 'text-teal-600'
      : 'text-blue-600';
  const { IconComponent, color, bg } = getCategoryIcon(tx.category, tx.type);

  return (
    <View className="relative overflow-hidden">
      {/* Red Delete Background */}
      <View className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 items-center justify-center rounded-r-xl">
        <TouchableOpacity onPress={onDelete} className="items-center justify-center w-full h-full">
          <Trash2 size={22} color="white" />
        </TouchableOpacity>
      </View>

      {/* Swipeable Row */}
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.85}
          className="flex-row items-center px-4 py-3 bg-white"
        >
          <View className={`w-10 h-10 rounded-full ${bg} items-center justify-center mr-3`}>
            <IconComponent size={20} color={color} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-slate-800">{tx.category}</Text>
            <Text className="text-xs text-slate-400 mt-0.5">
              {tx.note || tx.category} • {tx.time || ''}
            </Text>
          </View>
          <Text className={`text-sm font-bold ${amountColor}`}>
            {sign}
            {tx.amount.toLocaleString('vi-VN')}đ
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function FilterBottomSheet({
  visible,
  onClose,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  activeTab,
  setActiveTab,
  selectedCategories,
  setSelectedCategories
}: {
  visible: boolean;
  onClose: () => void;
  startDate: string | null;
  setStartDate: (v: string | null) => void;
  endDate: string | null;
  setEndDate: (v: string | null) => void;
  activeTab: any;
  setActiveTab: (v: any) => void;
  selectedCategories: string[];
  setSelectedCategories: (v: string[]) => void;
}) {
  const CATEGORIES = ['Ăn uống', 'Mua sắm', 'Di chuyển', 'Giải trí', 'Hóa đơn', 'Lương', 'Sức khỏe', 'Khác'];
  const [tempStart, setTempStart] = useState(startDate || '');
  const [tempEnd, setTempEnd] = useState(endDate || '');
  const [tempTab, setTempTab] = useState(activeTab);
  const [tempCats, setTempCats] = useState<string[]>(selectedCategories || []);

  React.useEffect(() => {
    if (visible) {
      setTempStart(startDate || '');
      setTempEnd(endDate || '');
      setTempTab(activeTab);
      setTempCats(selectedCategories || []);
    }
  }, [visible, startDate, endDate, activeTab, selectedCategories]);

  const toggleCategory = (cat: string) => {
    setTempCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const setQuickRange = (range: 'thisMonth' | 'lastMonth' | 'thisYear') => {
    const now = new Date();
    if (range === 'thisMonth') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setTempStart(start.toISOString().split('T')[0]);
      setTempEnd(end.toISOString().split('T')[0]);
    } else if (range === 'lastMonth') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      setTempStart(start.toISOString().split('T')[0]);
      setTempEnd(end.toISOString().split('T')[0]);
    } else if (range === 'thisYear') {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      setTempStart(start.toISOString().split('T')[0]);
      setTempEnd(end.toISOString().split('T')[0]);
    }
  };

  const handleApply = () => {
    Keyboard.dismiss();
    setStartDate(tempStart || null);
    setEndDate(tempEnd || null);
    setActiveTab(tempTab);
    setSelectedCategories(tempCats);
    onClose();
  };

  const handleReset = () => {
    setTempStart('');
    setTempEnd('');
    setTempTab('all');
    setTempCats([]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-1 justify-end bg-black/40">
          <Pressable className="absolute inset-0" onPress={onClose} />
          
          <View className="bg-white rounded-t-3xl p-6 w-full shadow-2xl">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-slate-800">Bộ lọc</Text>
              <TouchableOpacity onPress={onClose} className="bg-slate-100 p-2 rounded-full">
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Type */}
            <Text className="text-sm font-semibold text-slate-700 mb-3">Loại giao dịch</Text>
            <View className="flex-row flex-wrap gap-2 mb-5">
              {TABS.map(tab => (
                <TouchableOpacity
                  key={tab.value}
                  onPress={() => setTempTab(tab.value)}
                  className={`px-4 py-2 rounded-xl border ${tempTab === tab.value ? 'bg-teal-50 border-[#1A6B5A]' : 'bg-white border-slate-200'}`}
                >
                  <Text className={`font-medium ${tempTab === tab.value ? 'text-[#1A6B5A]' : 'text-slate-600'}`}>{tab.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Categories (Multi-select) */}
            <Text className="text-sm font-semibold text-slate-700 mb-3">Danh mục</Text>
            <View className="flex-row flex-wrap gap-2 mb-5">
              {CATEGORIES.map(cat => {
                const isSelected = tempCats.includes(cat);
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => toggleCategory(cat)}
                    className={`px-3 py-1.5 rounded-full border ${isSelected ? 'bg-teal-50 border-[#1A6B5A]' : 'bg-white border-slate-200'}`}
                  >
                    <Text className={`text-sm font-medium ${isSelected ? 'text-[#1A6B5A]' : 'text-slate-600'}`}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Date Range */}
            <Text className="text-sm font-semibold text-slate-700 mb-3">Khoảng thời gian (YYYY-MM-DD)</Text>
            <View className="flex-row gap-3 mb-3">
              <View className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 flex-row items-center">
                <CalendarIcon size={18} color="#94a3b8" />
                <Input
                  value={tempStart}
                  onChangeText={setTempStart}
                  placeholder="Từ ngày..."
                  className="flex-1 ml-2 border-0 bg-transparent p-0 text-sm text-slate-700 h-8"
                />
              </View>
              <View className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 flex-row items-center">
                <CalendarIcon size={18} color="#94a3b8" />
                <Input
                  value={tempEnd}
                  onChangeText={setTempEnd}
                  placeholder="Đến ngày..."
                  className="flex-1 ml-2 border-0 bg-transparent p-0 text-sm text-slate-700 h-8"
                />
              </View>
            </View>

            {/* Quick Date Range */}
            <View className="flex-row gap-2 mb-8">
              <TouchableOpacity onPress={() => setQuickRange('thisMonth')} className="px-3 py-1.5 rounded-full bg-slate-100">
                <Text className="text-xs font-medium text-slate-600">Tháng này</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setQuickRange('lastMonth')} className="px-3 py-1.5 rounded-full bg-slate-100">
                <Text className="text-xs font-medium text-slate-600">Tháng trước</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setQuickRange('thisYear')} className="px-3 py-1.5 rounded-full bg-slate-100">
                <Text className="text-xs font-medium text-slate-600">Năm nay</Text>
              </TouchableOpacity>
            </View>

            {/* Actions */}
            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity onPress={handleReset} className="flex-1 py-4 bg-slate-100 rounded-2xl items-center">
                <Text className="font-bold text-slate-600">Thiết lập lại</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleApply} className="flex-1 py-4 bg-[#1A6B5A] rounded-2xl items-center shadow-lg shadow-teal-900/20">
                <Text className="font-bold text-white">Áp dụng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AIQuickInputModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;

    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await apiClient.post('/ai/quick-input', { text }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = response.data?.data || response.data;
      if (data && data.transactions) {
        setText('');
        onClose();
        // Navigate to preview screen and pass the parsed transactions
        router.push({
          pathname: '/transaction/ai-preview' as any,
          params: { transactions: JSON.stringify(data.transactions) }
        });
      }
    } catch (error: any) {
      console.error('Lỗi khi phân tích AI Quick Input:', error);
      if (Platform.OS === 'web') {
        window.alert(error?.message || 'Không thể phân tích yêu cầu. Vui lòng thử lại sau.');
      } else {
        const { Alert } = require('react-native');
        Alert.alert('Lỗi phân tích', error?.message || 'Không thể phân tích yêu cầu. Vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "40k ăn sáng phở bò",
    "Nhận lương tháng này 15tr",
    "500k đổ xăng và mua đồ ăn",
    "200k đi cà phê với bạn bè"
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-1 justify-end bg-black/60">
          <Pressable className="absolute inset-0" onPress={onClose} />
          
          <View className="bg-white rounded-t-3xl p-6 w-full shadow-2xl">
            {/* Grabber Indicator */}
            <View className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-5" />

            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-xl bg-teal-50 justify-center items-center">
                  <Sparkles size={18} color="#1A6B5A" />
                </View>
                <View>
                  <Text className="text-lg font-bold text-slate-800">Nhập liệu nhanh bằng AI</Text>
                  <Text className="text-xs text-slate-400">Trợ lý SMM tự động bóc tách giao dịch</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} className="bg-slate-100 p-2 rounded-full">
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Input card with fancy styling */}
            <View className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-4">
              <TextInput
                multiline
                numberOfLines={3}
                placeholder="Ví dụ: Ăn phở bò 45k, đổ xăng 50k ngày hôm qua..."
                placeholderTextColor="#94a3b8"
                value={text}
                onChangeText={setText}
                editable={!loading}
                className="text-slate-700 text-[15px] leading-6 min-h-[80px] text-left"
                style={{ textAlignVertical: 'top' }}
              />
            </View>

            {/* Suggested prompts / Examples */}
            <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">💡 Ví dụ gợi ý</Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              {suggestions.map((suggestion, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setText(suggestion)}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 active:bg-slate-100"
                >
                  <Text className="text-slate-600 text-xs font-medium">{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Submit / Action buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={onClose}
                disabled={loading}
                className="flex-1 py-4 bg-slate-100 rounded-2xl items-center"
              >
                <Text className="font-bold text-slate-600">Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading || !text.trim()}
                className={`flex-1 py-4 rounded-2xl items-center flex-row justify-center gap-2 ${loading || !text.trim() ? 'bg-slate-200' : 'bg-[#1A6B5A] shadow-lg shadow-teal-900/20'}`}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Sparkles size={16} color="white" />
                    <Text className="font-bold text-white">Gửi phân tích</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function TransactionsScreen() {
  const router = useRouter();
  const {
    transactions,
    deleteTransaction,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedCategories,
    setSelectedCategories,
    fetchMoreTransactions,
    isLoadingMore,
    hasMore,
  } = useTransactions();

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isAIInputOpen, setIsAIInputOpen] = useState(false);

  // Group by date
  const grouped = transactions.reduce(
    (acc, tx) => {
      const key = tx.date || 'Hôm nay';
      if (!acc[key]) acc[key] = [];
      acc[key].push(tx);
      return acc;
    },
    {} as Record<string, Transaction[]>
  );

  const dates = Object.keys(grouped);

  const handleDelete = async (id: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Xóa giao dịch này?')) {
        try {
          await deleteTransaction(id);
        } catch {}
      }
    } else {
      const { Alert } = require('react-native');
      Alert.alert('Xóa giao dịch', 'Bạn có chắc chắn?', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            await deleteTransaction(id);
          } catch {}
        }},
      ]);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F4F7F6]" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
        <View className="flex-row items-center gap-2">
          <Wallet size={22} color="#1A6B5A" />
          <Text className="text-xl font-bold text-slate-800">Giao dịch</Text>
        </View>
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.push('/import-data')}>
            <FileUp size={21} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsFilterOpen(true)}>
            <SlidersHorizontal size={21} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Search size={21} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View className="px-5 mb-3">
        <View className="flex-row items-center bg-white rounded-xl px-3 border border-slate-200 h-11">
          <Search size={16} color="#94a3b8" />
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Tìm kiếm giao dịch..."
            placeholderTextColor="#94a3b8"
            className="flex-1 ml-2 border-0 bg-transparent h-full text-sm text-slate-700"
          />
        </View>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-5 mb-3 flex-none"
        contentContainerStyle={{ gap: 8, alignItems: 'center' }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <TouchableOpacity
              key={tab.value}
              onPress={() => setActiveTab(tab.value as typeof activeTab)}
              className={`px-4 py-1.5 rounded-full border ${
                isActive
                  ? 'bg-[#1A6B5A] border-[#1A6B5A]'
                  : 'bg-white border-slate-200'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  isActive ? 'text-white' : 'text-slate-600'
                }`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Transaction Groups */}
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        onScroll={(e) => {
          const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
          const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
          if (isCloseToBottom) {
            fetchMoreTransactions();
          }
        }}
        scrollEventThrottle={400}
      >
        {dates.map((date) => (
          <View key={date} className="mb-4">
            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {date}
            </Text>
            <Card className="py-0 overflow-hidden gap-0">
              {grouped[date].map((tx, idx) => (
                <View key={tx.id}>
                  <SwipeableTransactionItem
                    tx={tx}
                    onPress={() => router.push(`/transaction/${tx.id}`)}
                    onDelete={() => handleDelete(tx.id)}
                  />
                  {idx < grouped[date].length - 1 && (
                    <View className="ml-16">
                      <Separator />
                    </View>
                  )}
                </View>
              ))}
            </Card>
          </View>
        ))}

        {/* AI Quick Input Banner */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setIsAIInputOpen(true)}
          className="bg-[#1A6B5A] rounded-2xl px-5 py-4 flex-row items-center justify-between mb-4"
        >
          <View className="flex-row items-center gap-3">
            <View className="w-9 h-9 bg-white/20 rounded-xl items-center justify-center">
              <Sparkles size={18} color="white" />
            </View>
            <View>
              <Text className="text-white font-bold text-sm">AI Quick Input</Text>
              <Text className="text-white/70 text-xs mt-0.5">
                Nhập nhanh bằng ngôn ngữ tự nhiên
              </Text>
            </View>
          </View>
          <View className="w-8 h-8 bg-white/20 rounded-full items-center justify-center">
            <ArrowRight size={16} color="white" />
          </View>
        </TouchableOpacity>

        {hasMore && !isLoadingMore && (
          <TouchableOpacity
            onPress={fetchMoreTransactions}
            className="py-4 px-4 bg-teal-50/80 border border-teal-100 rounded-2xl items-center mb-4"
          >
            <Text className="text-teal-700 font-bold text-sm">Tải thêm giao dịch</Text>
          </TouchableOpacity>
        )}

        {isLoadingMore && (
          <View className="py-4 mb-4 items-center">
            <ActivityIndicator size="small" color="#1A6B5A" />
          </View>
        )}
      </ScrollView>

      {/* Reusable Bottom Navigation Tab */}
      <AppBottomTab activeTab="transactions" />

      <FilterBottomSheet
        visible={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedCategories={selectedCategories}
        setSelectedCategories={setSelectedCategories}
      />

      <AIQuickInputModal
        visible={isAIInputOpen}
        onClose={() => setIsAIInputOpen(false)}
      />
    </SafeAreaView>
  );
}

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  ChevronDown,
  CalendarDays,
  AlignLeft,
  Camera,
  Sparkles,
  Check,
  Utensils,
  Car,
  ShoppingCart,
  DollarSign,
  Wallet,
} from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTransactions } from '../context/TransactionsContext';
import { apiClient } from '../lib/http';

const CATEGORIES = [
  { name: 'Thực phẩm & Ăn uống', Icon: Utensils, color: '#0d9488', bg: 'bg-teal-100' },
  { name: 'Di chuyển & Xe cộ', Icon: Car, color: '#0284c7', bg: 'bg-blue-100' },
  { name: 'Nhà cửa & Hóa đơn', Icon: Wallet, color: '#7c3aed', bg: 'bg-purple-100' },
  { name: 'Giải trí & Mua sắm', Icon: ShoppingCart, color: '#db2777', bg: 'bg-pink-100' },
  { name: 'Lương & Thưởng', Icon: DollarSign, color: '#16a34a', bg: 'bg-green-100' },
];

const parseViAmount = (raw: string): number => {
  const s = raw.trim().toLowerCase().replace(/\./g, '').replace(/,/g, '');
  if (s.endsWith('k')) return parseFloat(s) * 1_000;
  if (s.endsWith('tr')) return parseFloat(s) * 1_000_000;
  if (s.endsWith('m')) return parseFloat(s) * 1_000_000;
  return parseFloat(s) || 0;
};

export default function AddTransactionScreen() {
  const router = useRouter();
  const { addTransaction, refreshTransactions } = useTransactions();

  const [transactionType, setTransactionType] = useState<'expense' | 'income' | 'savings'>('expense');
  const [rawAmount, setRawAmount] = useState('150000');
  const [parsedAmount, setParsedAmount] = useState(150000);
  const [category, setCategory] = useState('Thực phẩm & Ăn uống');
  const [date, setDate] = useState('Hôm nay, 24 Tháng 05, 2024');
  const [note, setNote] = useState('');
  const [hasReceipt, setHasReceipt] = useState(false);
  const [receiptFile, setReceiptFile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const pickReceiptImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setReceiptFile(result.assets[0]);
      setHasReceipt(true);
    }
  };

  useEffect(() => {
    setParsedAmount(parseViAmount(rawAmount));
  }, [rawAmount]);

  useEffect(() => {
    if (!note || note.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSuggesting(true);
        const res = await apiClient.post('/ai/suggest-category', { description: note });
        if (res.data?.data && Array.isArray(res.data.data)) {
          const fetchedSuggestions = res.data.data;
          setSuggestions(fetchedSuggestions);
          // Pre-select if highest confidence > 50%
          if (fetchedSuggestions.length > 0 && fetchedSuggestions[0].confidence > 50) {
            setCategory(fetchedSuggestions[0].categoryName);
            // Also adjust type if possible based on some rules or let user manually change type
          }
        }
      } catch (e) {
        console.error('Suggest error', e);
      } finally {
        setIsSuggesting(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [note]);

  const catObj = CATEGORIES.find((c) => c.name === category) || CATEGORIES[0];

  const handleSave = async () => {
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ.');
      return;
    }
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('amount', parsedAmount.toString());
      formData.append('category', category);
      formData.append('note', note);
      formData.append('type', transactionType);
      formData.append('date', new Date().toISOString().split('T')[0]);

      if (receiptFile) {
        if (Platform.OS === 'web' && receiptFile.file) {
          formData.append('receipt', receiptFile.file);
        } else {
          formData.append('receipt', {
            uri: receiptFile.uri,
            name: receiptFile.fileName || 'receipt.jpg',
            type: receiptFile.mimeType || 'image/jpeg',
          } as any);
        }
      }

      if (suggestions.length > 0 && suggestions[0].categoryId) {
        formData.append('aiSuggestedCategoryId', suggestions[0].categoryId.toString());
        formData.append('aiConfidence', suggestions[0].confidence.toString());
      }

      const res = await apiClient.post('/transactions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.data) {
        const tx = res.data.data;
        addTransaction({
          type: transactionType,
          amount: parsedAmount,
          category,
          note,
          date: tx.transactionDate
            ? new Date(tx.transactionDate).toLocaleDateString('vi-VN')
            : 'Hôm nay',
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        });
      }
      await refreshTransactions();
      router.back();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể lưu giao dịch.');
    } finally {
      setIsLoading(false);
    }
  };

  const formattedDisplay = parsedAmount > 0
    ? parsedAmount.toLocaleString('vi-VN')
    : '0';

  const TAB_ACTIVE_COLOR: Record<string, string> = {
    expense: 'bg-red-500',
    income: 'bg-teal-600',
    savings: 'bg-blue-600',
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F4F7F6]" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 gap-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1.5">
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text className="text-base font-bold text-slate-800">Thêm giao dịch</Text>
      </View>

      {/* Transaction Type Tabs (custom pill style matching mockup) */}
      <View className="px-4 mb-4">
        <View className="flex-row bg-white rounded-xl p-1 border border-slate-200">
          {(['expense', 'income', 'savings'] as const).map((t) => {
            const isActive = transactionType === t;
            const label = t === 'expense' ? 'Chi tiêu' : t === 'income' ? 'Thu nhập' : 'Tiết kiệm';
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setTransactionType(t)}
                className={`flex-1 py-2 rounded-lg items-center ${isActive ? TAB_ACTIVE_COLOR[t] : ''}`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    isActive ? 'text-white' : 'text-slate-500'
                  }`}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 16, gap: 12 }}
      >
        {/* Amount Input */}
        <View className="items-center py-4">
          <Text className="text-slate-500 text-xs font-medium mb-2">Số tiền giao dịch</Text>
          <View className="flex-row items-baseline">
            <Input
              value={rawAmount}
              onChangeText={setRawAmount}
              keyboardType="numeric"
              className={`text-4xl font-black p-0 border-0 bg-transparent text-center min-w-[120px] ${
                transactionType === 'expense'
                  ? 'text-red-500'
                  : transactionType === 'income'
                  ? 'text-teal-600'
                  : 'text-blue-600'
              }`}
            />
            <Text
              className={`text-2xl font-black ml-1 ${
                transactionType === 'expense'
                  ? 'text-red-500'
                  : transactionType === 'income'
                  ? 'text-teal-600'
                  : 'text-blue-600'
              }`}
            >
              đ
            </Text>
          </View>
        </View>

        {/* Hạng mục */}
        <Card className="py-0 gap-0">
          <CardContent className="px-4 py-3.5">
            <TouchableOpacity 
              onPress={() => setShowCategoryModal(true)}
              className="flex-row items-center gap-3"
            >
              <View className={`w-9 h-9 rounded-full ${catObj.bg} items-center justify-center`}>
                <catObj.Icon size={18} color={catObj.color} />
              </View>
              <View className="flex-1">
                <Text className="text-[11px] text-slate-400 font-medium mb-0.5">Hạng mục</Text>
                <Text className="text-sm font-semibold text-slate-800">{category}</Text>
              </View>
              <ChevronDown size={16} color="#94a3b8" />
            </TouchableOpacity>
          </CardContent>
        </Card>

        {/* Ngày giao dịch */}
        <Card className="py-0 gap-0">
          <CardContent className="px-4 py-3.5">
            <TouchableOpacity className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-full bg-blue-50 items-center justify-center">
                <CalendarDays size={18} color="#2563eb" />
              </View>
              <View className="flex-1">
                <Text className="text-[11px] text-slate-400 font-medium mb-0.5">Ngày giao dịch</Text>
                <Text className="text-sm font-semibold text-slate-800">{date}</Text>
              </View>
            </TouchableOpacity>
          </CardContent>
        </Card>

        {/* Ghi chú */}
        <Card className="py-0 gap-0">
          <CardContent className="px-4 py-3.5">
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
                <AlignLeft size={18} color="#64748b" />
              </View>
              <View className="flex-1">
                <Text className="text-[11px] text-slate-400 font-medium mb-0.5">Ghi chú (Tự động gợi ý hạng mục)</Text>
                <Input
                  value={note}
                  onChangeText={setNote}
                  placeholder="Ví dụ: Ăn phở 40k..."
                  placeholderTextColor="#94a3b8"
                  className="text-sm font-semibold text-slate-800 p-0 border-0 bg-transparent h-5"
                />
              </View>
            </View>
          </CardContent>
        </Card>

        {/* AI Suggestions (Only show when there is text) */}
        {note.trim().length >= 2 && (
          <View className="mt-1">
            <View className="flex-row items-center gap-1 mb-2 px-1">
              <Sparkles size={14} color="#8b5cf6" />
              <Text className="text-xs font-semibold text-slate-500">AI Gợi ý danh mục</Text>
              {isSuggesting && <ActivityIndicator size="small" color="#8b5cf6" className="ml-2" />}
            </View>
            
            {!isSuggesting && suggestions.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                {suggestions.map((sug, idx) => {
                  const isSelected = category === sug.categoryName;
                  const isHighConf = sug.confidence > 80;
                  const isMediumConf = sug.confidence > 50 && sug.confidence <= 80;
                  
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setCategory(sug.categoryName)}
                      className={`flex-row items-center px-3 py-1.5 rounded-full border ${isSelected ? 'bg-violet-50 border-violet-200' : 'bg-white border-slate-200'}`}
                      style={{ marginRight: 8 }}
                    >
                      <Text className={`text-sm font-medium mr-1.5 ${isSelected ? 'text-violet-700' : 'text-slate-600'}`}>
                        {sug.categoryName}
                      </Text>
                      <View className={`px-1.5 py-0.5 rounded-full ${isHighConf ? 'bg-green-100' : isMediumConf ? 'bg-yellow-100' : 'bg-slate-100'}`}>
                        <Text className={`text-[10px] font-bold ${isHighConf ? 'text-green-700' : isMediumConf ? 'text-yellow-700' : 'text-slate-500'}`}>
                          {sug.confidence}%
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {!isSuggesting && suggestions.length > 0 && suggestions[0].confidence < 50 && (
              <Text className="text-xs text-orange-500 mt-2 italic px-1">
                Không chắc chắn – vui lòng chọn thủ công.
              </Text>
            )}
          </View>
        )}

        {/* Ảnh hoá đơn */}
        <Card className="py-0 gap-0">
          <CardContent className="px-4 py-3.5">
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                className="flex-row items-center gap-3 flex-1"
                onPress={pickReceiptImage}
              >
                <View className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
                  <Camera size={18} color="#64748b" />
                </View>
                <View className="flex-1">
                  <Text className="text-[11px] text-slate-400 font-medium mb-0.5">Ảnh hoá đơn</Text>
                  <Text className="text-sm font-semibold text-slate-700">
                    {receiptFile ? 'Đã chọn 1 ảnh hóa đơn' : 'Thêm ảnh hoá đơn'}
                  </Text>
                </View>
              </TouchableOpacity>
              
              {receiptFile && (
                <TouchableOpacity 
                  onPress={() => {
                    setReceiptFile(null);
                    setHasReceipt(false);
                  }}
                  className="bg-red-50 px-2 py-1 rounded border border-red-100"
                >
                  <Text className="text-[10px] text-red-600 font-bold">Xóa</Text>
                </TouchableOpacity>
              )}
            </View>
          </CardContent>
        </Card>


      </ScrollView>

      {/* Save Button */}
      <View className="px-4 pb-6 pt-3 bg-[#F4F7F6]">
        <Button
          onPress={handleSave}
          disabled={isLoading}
          className="w-full h-13 bg-[#1A6B5A] active:bg-[#135244] rounded-xl"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white font-bold text-base">Lưu giao dịch</Text>
          )}
        </Button>
      </View>

      {/* Category Selection Bottom Sheet Modal */}
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <TouchableOpacity 
          className="flex-1 bg-black/40 justify-end"
          activeOpacity={1}
          onPress={() => setShowCategoryModal(false)}
        >
          <View className="bg-white rounded-t-3xl p-5 pb-8 max-h-[80%] shadow-xl">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <Text className="text-base font-bold text-slate-800">
                Chọn hạng mục
              </Text>
              <TouchableOpacity 
                onPress={() => setShowCategoryModal(false)} 
                className="w-7 h-7 rounded-full bg-slate-100 items-center justify-center"
              >
                <Text className="text-slate-500 font-bold text-xs">✕</Text>
              </TouchableOpacity>
            </View>

            {/* List */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.name;
                return (
                  <TouchableOpacity
                    key={cat.name}
                    onPress={() => {
                      setCategory(cat.name);
                      setShowCategoryModal(false);
                    }}
                    className={`flex-row items-center p-3 rounded-xl border ${
                      isSelected 
                        ? 'bg-teal-50 border-teal-200' 
                        : 'bg-slate-50 border-slate-100 active:bg-slate-100'
                    }`}
                  >
                    <View className={`w-9 h-9 rounded-full ${cat.bg} items-center justify-center mr-3`}>
                      <cat.Icon size={18} color={cat.color} />
                    </View>
                    <Text className={`flex-1 text-sm font-semibold ${isSelected ? 'text-teal-700' : 'text-slate-700'}`}>
                      {cat.name}
                    </Text>
                    {isSelected && (
                      <View className="bg-teal-600 w-5 h-5 rounded-full items-center justify-center">
                        <Check size={12} color="white" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

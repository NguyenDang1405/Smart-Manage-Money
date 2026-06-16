import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { apiClient, getAuthToken } from '../../lib/http';
import { useTransactions } from '../../context/TransactionsContext';

export default function AiPreviewScreen() {
  const router = useRouter();
  const { transactions: transactionsParam } = useLocalSearchParams();
  const { refreshTransactions } = useTransactions();

  const initialTransactions = typeof transactionsParam === 'string' 
    ? JSON.parse(transactionsParam) 
    : [];

  const [transactions, setTransactions] = useState<any[]>(initialTransactions.map((t: any, i: number) => ({ ...t, id: i.toString() })));
  const [loading, setLoading] = useState(false);

  const removeTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const updateTransaction = (id: string, field: string, value: any) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, [field]: value };
      }
      return t;
    }));
  };

  const handleSaveAll = async () => {
    if (transactions.length === 0) {
      router.back();
      return;
    }

    setLoading(true);
    try {
      const token = await getAuthToken();

      const response = await apiClient.post('/transactions/bulk', { transactions }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data?.success) {
        Alert.alert('Thành công', `Đã lưu ${transactions.length} giao dịch!`);
        await refreshTransactions();
        router.push('/');
      }
    } catch (error: any) {
      console.error('Lỗi khi lưu hàng loạt:', error);
      Alert.alert('Lỗi', 'Không thể lưu các giao dịch. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between bg-white border-b border-slate-100 shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <Feather name="arrow-left" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-800">Xác nhận giao dịch ({transactions.length})</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {transactions.length === 0 ? (
          <View className="items-center justify-center mt-20">
            <Feather name="inbox" size={48} color="#cbd5e1" />
            <Text className="text-slate-500 mt-4 font-medium">Không có giao dịch nào.</Text>
          </View>
        ) : (
          transactions.map((tx) => (
            <View key={tx.id} className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-slate-200">
              <View className="flex-row justify-between mb-4 items-center">
                <Text className={`font-bold uppercase text-xs tracking-wider px-2.5 py-1 rounded-md ${tx.type === 'income' ? 'bg-teal-50 text-teal-700' : 'bg-rose-50 text-rose-700'}`}>
                  {tx.type === 'income' ? 'Thu nhập' : 'Chi tiêu'}
                </Text>
                <TouchableOpacity onPress={() => removeTransaction(tx.id)} className="p-1">
                  <Feather name="trash-2" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>

              <View className="space-y-4">
                <View>
                  <Text className="text-xs text-slate-500 font-semibold mb-1.5 ml-1">Mô tả</Text>
                  <TextInput 
                    className="border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 bg-slate-50 font-medium"
                    value={tx.description}
                    onChangeText={(val) => updateTransaction(tx.id, 'description', val)}
                  />
                </View>

                <View className="flex-row gap-4">
                  <View className="flex-1">
                    <Text className="text-xs text-slate-500 font-semibold mb-1.5 ml-1">Số tiền (đ)</Text>
                    <TextInput 
                      className="border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-bold bg-slate-50"
                      value={tx.amount.toString()}
                      keyboardType="numeric"
                      onChangeText={(val) => updateTransaction(tx.id, 'amount', parseInt(val) || 0)}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-slate-500 font-semibold mb-1.5 ml-1">Ngày (YYYY-MM-DD)</Text>
                    <TextInput 
                      className="border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 bg-slate-50 font-medium"
                      value={tx.date}
                      onChangeText={(val) => updateTransaction(tx.id, 'date', val)}
                    />
                  </View>
                </View>
              </View>
            </View>
          ))
        )}
        <View className="h-20" />
      </ScrollView>

      {/* Footer Actions */}
      <View className="p-4 bg-white border-t border-slate-100 flex-row gap-3 shadow-lg">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="flex-1 py-3.5 rounded-xl items-center border border-slate-200 bg-white"
        >
          <Text className="text-slate-600 font-bold">Hủy bỏ</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={handleSaveAll}
          disabled={loading || transactions.length === 0}
          className={`flex-1 py-3.5 rounded-xl items-center flex-row justify-center shadow-sm ${loading || transactions.length === 0 ? 'bg-indigo-300' : 'bg-indigo-600'}`}
        >
          {loading ? (
            <Text className="text-white font-bold ml-2">Đang lưu...</Text>
          ) : (
            <>
              <Feather name="check" size={18} color="white" />
              <Text className="text-white font-bold ml-2 text-base">Lưu tất cả</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

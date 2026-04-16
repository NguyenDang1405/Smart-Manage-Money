import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiClient, getAuthToken } from '../lib/http';

export default function QuickInputBar() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
        // Navigate to preview screen and pass the parsed transactions
        router.push({
          pathname: '/transaction/ai-preview' as any,
          params: { transactions: JSON.stringify(data.transactions) }
        });
      }
    } catch (error: any) {
      console.error('Lỗi khi phân tích AI Quick Input:', error);
      alert(error?.message || 'Không thể phân tích yêu cầu. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 mb-6 flex-row items-center">
      <View className="bg-indigo-50 w-10 h-10 rounded-xl items-center justify-center mr-3">
        <MaterialCommunityIcons name="auto-fix" size={20} color="#4f46e5" />
      </View>
      <TextInput
        className="flex-1 text-slate-800 text-sm font-medium"
        placeholder="Ghi chép AI (VD: 40k phở, 2 củ xăng...)"
        placeholderTextColor="#94a3b8"
        value={text}
        onChangeText={setText}
        onSubmitEditing={handleSubmit}
        returnKeyType="send"
        editable={!loading}
      />
      {loading ? (
        <View className="w-10 h-10 items-center justify-center">
          <ActivityIndicator color="#4f46e5" size="small" />
        </View>
      ) : (
        <TouchableOpacity 
          onPress={handleSubmit}
          disabled={!text.trim()}
          className={`w-10 h-10 rounded-xl items-center justify-center ${text.trim() ? 'bg-indigo-600' : 'bg-slate-100'}`}
        >
          <Feather name="arrow-up" size={20} color={text.trim() ? "white" : "#94a3b8"} />
        </TouchableOpacity>
      )}
    </View>
  );
}

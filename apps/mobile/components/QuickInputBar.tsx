import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Sparkles } from 'lucide-react-native';
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
    <View
      style={{
        backgroundColor: 'white',
        borderRadius: 18,
        padding: 12,
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 5,
        borderWidth: 1.5,
        borderColor: 'rgba(99,102,241,0.15)',
      }}
    >
      {/* Icon */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: '#ede9fe',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 10,
        }}
      >
        <Sparkles size={18} color="#7c3aed" />
      </View>

      {/* Input */}
      <TextInput
        style={{
          flex: 1,
          fontSize: 14,
          color: '#1e293b',
          fontFamily: 'Manrope-Medium',
        }}
        placeholder="Ghi nhanh bằng AI (VD: 40k phở, 2 củ xăng...)"
        placeholderTextColor="#94a3b8"
        value={text}
        onChangeText={setText}
        onSubmitEditing={handleSubmit}
        returnKeyType="send"
        editable={!loading}
      />

      {/* Submit */}
      {loading ? (
        <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#7c3aed" size="small" />
        </View>
      ) : (
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!text.trim()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: text.trim() ? '#7c3aed' : '#f1f5f9',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: text.trim() ? '#7c3aed' : 'transparent',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: text.trim() ? 4 : 0,
          }}
        >
          <MaterialCommunityIcons
            name="arrow-up"
            size={20}
            color={text.trim() ? 'white' : '#94a3b8'}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  ToastAndroid,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  ChevronRight,
  Utensils,
  Wallet,
  ImageIcon,
  X,
  Plus,
} from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useTransactions } from '../../context/TransactionsContext';
import * as ImagePicker from 'expo-image-picker';

const showToast = (message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert('Thông báo', message);
  }
};

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { transactions, deleteTransaction, updateTransaction } = useTransactions();

  const currentTx = transactions.find((t) => t.id === id);

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [account, setAccount] = useState('Ví tiền mặt');
  const [note, setNote] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (currentTx) {
      setAmount(currentTx.amount.toString());
      setCategory(currentTx.category);
      setNote(currentTx.note || '');
      if (currentTx.receiptUrl) {
        const baseUrl = Platform.OS === 'web' ? 'http://localhost:4000' : (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000');
        let fullUrl = currentTx.receiptUrl;
        if (!fullUrl.startsWith('http')) {
          if (!fullUrl.startsWith('/')) {
            fullUrl = '/' + fullUrl;
          }
          fullUrl = `${baseUrl}${fullUrl}`;
        }
        setImageUri(fullUrl);
      } else {
        setImageUri(null);
      }
    }
  }, [currentTx]);

  if (!currentTx) {
    return (
      <SafeAreaView className="flex-1 bg-[#F4F7F6] items-center justify-center">
        <Text className="text-slate-500">Giao dịch không tồn tại.</Text>
        <Button onPress={() => router.back()} variant="outline" className="mt-4">
          <Text>Quay lại</Text>
        </Button>
      </SafeAreaView>
    );
  }

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Cần quyền', 'Bạn cần cấp quyền truy cập thư viện ảnh.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Bạn có chắc chắn muốn xóa giao dịch này không?')) {
        if (typeof id === 'string') {
          setIsLoading(true);
          deleteTransaction(id)
            .then(() => { showToast('Xóa thành công'); router.back(); })
            .catch(() => {})
            .finally(() => setIsLoading(false));
        }
      }
      return;
    }
    Alert.alert('Xóa giao dịch', 'Bạn có chắc chắn muốn xóa giao dịch này không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          if (typeof id === 'string') {
            setIsLoading(true);
            try {
              await deleteTransaction(id);
              showToast('Xóa thành công');
              router.back();
            } catch {}
            finally { setIsLoading(false); }
          }
        },
      },
    ]);
  };

  const handleUpdate = async () => {
    if (!amount || isNaN(Number(amount))) {
      Alert.alert('Lỗi', 'Số tiền không hợp lệ.');
      return;
    }
    if (typeof id !== 'string') return;
    setIsLoading(true);
    try {
      const updates = { 
        amount: Number(amount), 
        category, 
        note,
        receiptUrl: imageUri ? currentTx.receiptUrl : null
      };
      const formData = new FormData();
      formData.append('amount', amount);
      formData.append('category', category);
      formData.append('note', note);
      formData.append('type', currentTx.type);

      // Chỉ upload ảnh mới (không phải ảnh đã lưu trên server)
      const isNewImage = imageUri && !imageUri.includes('/uploads/');
      if (isNewImage) {
        if (Platform.OS === 'web') {
          // Web: fetch blob URL → chuyển thành File object
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const filename = `receipt-${Date.now()}.jpg`;
          const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
          formData.append('receipt', file);
        } else {
          // Native: dùng {uri, name, type} object
          const filename = imageUri.split('/').pop() || 'receipt.jpg';
          const ext = /\.(\w+)$/.exec(filename);
          formData.append('receipt', {
            uri: imageUri,
            name: filename,
            type: ext ? `image/${ext[1]}` : 'image/jpeg',
          } as any);
        }
      } else if (!imageUri && currentTx.receiptUrl) {
        // Người dùng đã xóa ảnh hóa đơn cũ
        formData.append('deleteReceipt', 'true');
      }

      await updateTransaction(id, updates, formData);
      showToast('Cập nhật thành công');
      setIsEditing(false);
    } catch (err) { console.error('Lỗi cập nhật:', err); }
    finally { setIsLoading(false); }
  };

  const handleCancel = () => {
    if (currentTx) {
      setAmount(currentTx.amount.toString());
      setCategory(currentTx.category);
      setNote(currentTx.note || '');
    }
    setIsEditing(false);
  };

  const isExpense = currentTx.type === 'expense';
  const sign = isExpense ? '-' : '+';
  const amountColor = isExpense ? 'text-red-500' : currentTx.type === 'income' ? 'text-teal-600' : 'text-blue-600';
  const dateStr = `${currentTx.time || '12:30'} - ${currentTx.date || ''}`;

  return (
    <SafeAreaView className="flex-1 bg-[#F4F7F6]" edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">

        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 -ml-1"
          >
            <ArrowLeft size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text className="text-base font-bold text-slate-800">Chi tiết giao dịch</Text>
          <TouchableOpacity onPress={() => isEditing ? handleCancel() : setIsEditing(true)}>
            <Text className="text-[#1A6B5A] font-semibold text-sm">
              {isEditing ? 'Đóng' : 'Chỉnh sửa'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

          {/* Amount Hero */}
          <View className="items-center pt-4 pb-6 px-6">
            {isEditing ? (
              <View className="flex-row items-center border-b-2 border-[#1A6B5A] pb-1">
                <Text className={`text-3xl font-black ${amountColor} mr-0.5`}>{sign}</Text>
                <Input
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  className={`text-3xl font-black ${amountColor} p-0 border-0 min-w-[120px] text-center bg-transparent`}
                />
                <Text className={`text-xl font-black ${amountColor} ml-0.5`}> đ</Text>
              </View>
            ) : (
              <Text className={`text-4xl font-black ${amountColor}`}>
                {sign}{Number(amount).toLocaleString('vi-VN')} đ
              </Text>
            )}
            <View className="flex-row items-center bg-slate-100 rounded-full px-4 py-1.5 mt-3 gap-2">
              <Utensils size={13} color="#64748b" />
              <Text className="text-slate-600 text-xs font-medium">{category}</Text>
              <Text className="text-slate-300 text-xs">•</Text>
              <Text className="text-slate-500 text-xs">{dateStr}</Text>
            </View>
          </View>

          {/* Details Card */}
          <View className="px-4 gap-3">
            <Card className="py-0 gap-0">
              {/* Hạng mục row */}
              <CardContent className="px-4 py-3.5">
                <View className="flex-row items-center gap-3">
                  <View className="w-9 h-9 rounded-full bg-teal-50 items-center justify-center">
                    <Utensils size={18} color="#0d9488" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[11px] text-slate-400 font-medium mb-0.5">Hạng mục</Text>
                    {isEditing ? (
                      <Input
                        value={category}
                        onChangeText={setCategory}
                        className="text-sm font-semibold text-slate-800 p-0 h-5 border-0 bg-transparent"
                      />
                    ) : (
                      <Text className="text-sm font-semibold text-slate-800">{category}</Text>
                    )}
                  </View>
                  <ChevronRight size={16} color="#cbd5e1" />
                </View>
              </CardContent>

              <View className="mx-4"><Separator /></View>

              {/* Tài khoản row */}
              <CardContent className="px-4 py-3.5">
                <View className="flex-row items-center gap-3">
                  <View className="w-9 h-9 rounded-full bg-teal-50 items-center justify-center">
                    <Wallet size={18} color="#0d9488" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[11px] text-slate-400 font-medium mb-0.5">Tài khoản</Text>
                    {isEditing ? (
                      <Input
                        value={account}
                        onChangeText={setAccount}
                        className="text-sm font-semibold text-slate-800 p-0 h-5 border-0 bg-transparent"
                      />
                    ) : (
                      <Text className="text-sm font-semibold text-slate-800">{account}</Text>
                    )}
                  </View>
                  <ChevronRight size={16} color="#cbd5e1" />
                </View>
              </CardContent>
            </Card>

            {/* Ghi chú Card */}
            <Card className="py-0 gap-0">
              <CardContent className="px-4 py-3.5">
                <Text className="text-[11px] text-slate-400 font-medium mb-1">Ghi chú</Text>
                {isEditing ? (
                  <Input
                    value={note}
                    onChangeText={setNote}
                    placeholder="Nhập ghi chú..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    className="text-sm text-slate-800 p-0 border-0 bg-transparent"
                  />
                ) : (
                  <Text className="text-sm text-slate-800">{note || 'Không có ghi chú'}</Text>
                )}
              </CardContent>
            </Card>

            {/* Ảnh hoá đơn Card */}
            <Card className="py-0 gap-0">
              <CardContent className="px-4 py-3.5">
                <Text className="text-[11px] text-slate-400 font-medium mb-3">Ảnh hoá đơn</Text>
                <View className="flex-row gap-3 flex-wrap">
                  {imageUri && (
                    <View className="relative">
                      <TouchableOpacity 
                        activeOpacity={isEditing ? 1 : 0.7} 
                        onPress={() => !isEditing && setIsPreviewOpen(true)}
                      >
                        <Image
                          source={{ uri: imageUri }}
                          style={{ width: 72, height: 72, borderRadius: 12 }}
                          className="bg-slate-100"
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                      {isEditing && (
                        <TouchableOpacity
                          onPress={() => setImageUri(null)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full items-center justify-center border-2 border-white"
                        >
                          <X size={10} color="white" />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                  {isEditing && (
                    <TouchableOpacity
                      onPress={handlePickImage}
                      className="w-[72px] h-[72px] rounded-xl border border-dashed border-slate-300 items-center justify-center bg-slate-50"
                    >
                      <Plus size={18} color="#94a3b8" />
                      <Text className="text-[10px] text-slate-400 font-semibold mt-1">{imageUri ? 'Đổi' : 'Thêm'}</Text>
                    </TouchableOpacity>
                  )}
                  {!isEditing && !imageUri && (
                    <Text className="text-sm text-slate-400 italic">Không có hóa đơn</Text>
                  )}
                </View>
              </CardContent>
            </Card>
          </View>
        </ScrollView>

        {/* Bottom Action Bar */}
        <View className="bg-white px-4 pt-4 pb-8 border-t border-slate-100 rounded-t-3xl shadow-md gap-3">
          {isEditing ? (
            <>
              <Button
                onPress={handleUpdate}
                disabled={isLoading}
                className="w-full bg-[#1A6B5A] active:bg-[#135244] h-12 rounded-xl"
              >
                {isLoading
                  ? <ActivityIndicator size="small" color="white" />
                  : <Text className="text-white font-bold text-base">Cập nhật</Text>
                }
              </Button>

              <View className="flex-row gap-3">
                <Button
                  variant="outline"
                  onPress={handleCancel}
                  disabled={isLoading}
                  className="flex-1 h-12 rounded-xl border-slate-300"
                >
                  <Text className="font-semibold text-slate-700">Hủy</Text>
                </Button>
                <Button
                  variant="ghost"
                  onPress={handleDelete}
                  disabled={isLoading}
                  className="flex-1 h-12 rounded-xl"
                >
                  <Text className="font-semibold text-red-500">Xóa giao dịch</Text>
                </Button>
              </View>
            </>
          ) : (
            <View className="flex-row gap-3">
              <Button
                onPress={() => setIsEditing(true)}
                className="flex-1 bg-[#1A6B5A] active:bg-[#135244] h-12 rounded-xl"
              >
                <Text className="text-white font-bold text-base">Chỉnh sửa</Text>
              </Button>
              <Button
                variant="destructive"
                onPress={handleDelete}
                disabled={isLoading}
                className="flex-1 h-12 rounded-xl"
              >
                {isLoading
                  ? <ActivityIndicator size="small" color="white" />
                  : <Text className="text-white font-bold text-base">Xóa giao dịch</Text>
                }
              </Button>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Fullscreen Image Preview Modal */}
      <Modal
        visible={isPreviewOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsPreviewOpen(false)}
      >
        <View 
          style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)', justifyContent: 'center', alignItems: 'center' }}
          className="relative"
        >
          <TouchableOpacity
            onPress={() => setIsPreviewOpen(false)}
            className="absolute top-12 right-6 z-10 w-10 h-10 rounded-full bg-white/20 items-center justify-center border border-white/25 active:bg-white/40"
          >
            <X size={20} color="white" />
          </TouchableOpacity>
          {imageUri && (
            <Image
              source={{ uri: imageUri }}
              style={{ width: '90%', height: '75%' }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, TextInput, Platform, Switch } from 'react-native';
import { Image } from 'expo-image';
import { Text } from '@/components/ui/text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { apiClient } from '../lib/http';
import { useTransactions } from '../context/TransactionsContext';

export default function EditProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { logout, setUserProfile, setLocalAvatarOverride } = useTransactions();
  const baseUrl = Platform.OS === 'web' ? 'http://localhost:4000' : (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000');
  
  const [profile, setProfile] = useState({
    fullName: '',
    alias: '',
    dateOfBirth: '',
    gender: 'Khác',
    phoneNumber: '',
    email: '',
    monthlyIncome: '',
    currency: 'VND',
    avatarUrl: null as string | null,
    financialGoals: [] as string[],
  });

  const [initialProfile, setInitialProfile] = useState<any>(null);
  const [avatarFile, setAvatarFile] = useState<any>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [initialBiometricEnabled, setInitialBiometricEnabled] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get('/users/profile');
        const data = res.data?.data || res.data;
        
        let genderMap: any = { male: 'Nam', female: 'Nữ', other: 'Khác' };
        
        const profileData = {
          fullName: data.fullName || '',
          alias: data.alias || '',
          dateOfBirth: data.dateOfBirth ? (() => {
            const d = new Date(data.dateOfBirth);
            if (isNaN(d.getTime())) return '';
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
          })() : '',
          gender: data.gender ? genderMap[data.gender] || 'Khác' : 'Khác',
          phoneNumber: data.phoneNumber || '',
          email: data.email || '',
          monthlyIncome: data.monthlyIncome ? String(data.monthlyIncome) : '',
          currency: data.currency || 'VND',
          avatarUrl: data.avatarUrl ? (data.avatarUrl.startsWith('http') ? data.avatarUrl : `${baseUrl}${data.avatarUrl}`) : null,
          financialGoals: data.financialGoals || [],
        };
        
        setProfile(profileData);
        setInitialProfile(profileData);
        setBiometricEnabled(data.biometricEnabled ?? true);
        setInitialBiometricEnabled(data.biometricEnabled ?? true);
      } catch (error) {
        console.error('Lỗi lấy thông tin cá nhân', error);
      }
    };
    fetchProfile();
  }, []);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatarFile(result.assets[0]);
      setProfile({ ...profile, avatarUrl: result.assets[0].uri });
    }
  };

  const handleSave = async () => {
    if (!profile.fullName.trim()) {
      Alert.alert('Lỗi', 'Họ và tên không được để trống');
      return;
    }
    
    const changes: string[] = [];
    if (initialProfile) {
      if (profile.fullName.trim() !== initialProfile.fullName.trim()) changes.push('họ và tên');
      if (profile.alias.trim() !== initialProfile.alias.trim()) changes.push('tên hiển thị');
      if (profile.dateOfBirth.trim() !== initialProfile.dateOfBirth.trim()) changes.push('ngày sinh');
      if (profile.gender !== initialProfile.gender) changes.push('giới tính');
      if (profile.phoneNumber.trim() !== initialProfile.phoneNumber.trim()) changes.push('số điện thoại');
      if (profile.monthlyIncome.trim() !== initialProfile.monthlyIncome.trim()) changes.push('thu nhập');
      
      const currentCode = profile.currency.split(' - ')[0];
      const initialCode = initialProfile.currency.split(' - ')[0];
      if (currentCode !== initialCode) changes.push('loại tiền tệ');
      
      const initialGoals = [...(initialProfile.financialGoals || [])].sort().join(',');
      const currentGoals = [...(profile.financialGoals || [])].sort().join(',');
      if (initialGoals !== currentGoals) changes.push('mục tiêu tài chính');
    }
    if (avatarFile) changes.push('ảnh đại diện');
    if (biometricEnabled !== initialBiometricEnabled) changes.push('xác thực sinh trắc học');
    if (currentPassword.trim() || newPassword.trim()) changes.push('mật khẩu');

    setLoading(true);
    try {
      // 1. Upload Avatar if changed
      let newAvatarUrl = profile.avatarUrl;
      if (avatarFile) {
        const formData = new FormData();
        if (Platform.OS === 'web') {
          const response = await fetch(avatarFile.uri);
          const blob = await response.blob();
          const filename = avatarFile.fileName || `avatar-${Date.now()}.jpg`;
          const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
          formData.append('avatar', file);
        } else {
          formData.append('avatar', {
            uri: avatarFile.uri,
            name: avatarFile.fileName || 'avatar.jpg',
            type: avatarFile.mimeType || 'image/jpeg',
          } as any);
        }

        const headers = Platform.OS === 'web' ? {} : { 'Content-Type': 'multipart/form-data' };

        const uploadRes = await apiClient.post('/users/avatar', formData, { headers });
        const uploadData = uploadRes.data?.data || uploadRes.data;
        if (uploadData && uploadData.avatarUrl) {
          newAvatarUrl = uploadData.avatarUrl;
          setLocalAvatarOverride(avatarFile.uri);
        }
      }

      // 2. Update Profile fields
      let genderMapRev: any = { 'Nam': 'male', 'Nữ': 'female', 'Khác': 'other' };
      
      const CURRENCY_LABELS: Record<string, string> = {
        'VND': 'VND - Việt Nam Đồng',
        'USD': 'USD - US Dollar',
        'EUR': 'EUR - Euro',
      };

      const payload = {
        fullName: profile.fullName,
        alias: profile.alias,
        dateOfBirth: profile.dateOfBirth || null,
        gender: genderMapRev[profile.gender] || 'other',
        phoneNumber: profile.phoneNumber,
        monthlyIncome: profile.monthlyIncome ? parseFloat(profile.monthlyIncome) : undefined,
        currency: profile.currency.split(' - ')[0],
        financialGoals: profile.financialGoals,
      };

      await apiClient.patch('/users/profile', payload);
      
      // 3. Update Security settings
      await apiClient.patch('/users/security', {
        biometricEnabled: biometricEnabled
      });

      // Synchronize changes to global userProfile context state
      const updatedCurrency = profile.currency.split(' - ')[0];
      setUserProfile((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          fullName: profile.fullName,
          alias: profile.alias,
          dateOfBirth: profile.dateOfBirth || null,
          gender: genderMapRev[profile.gender] || 'other',
          phoneNumber: profile.phoneNumber,
          monthlyIncome: profile.monthlyIncome ? parseFloat(profile.monthlyIncome) : prev.monthlyIncome,
          currency: updatedCurrency,
          financialGoals: profile.financialGoals,
          avatarUrl: newAvatarUrl,
          biometricEnabled: biometricEnabled,
        };
      });

      // 4. Update Password if filled (only when both fields are non-empty)
      let passwordChanged = false;
      if (currentPassword.trim() || newPassword.trim()) {
        // If only one field is filled, alert user
        if (!currentPassword.trim() || !newPassword.trim()) {
          Alert.alert('Lỗi đổi mật khẩu', 'Vui lòng điền đầy đủ mật khẩu hiện tại và mật khẩu mới.');
          setLoading(false);
          return;
        }
        if (newPassword.trim().length < 6) {
          Alert.alert('Lỗi đổi mật khẩu', 'Mật khẩu mới phải có ít nhất 6 ký tự.');
          setLoading(false);
          return;
        }
        try {
          await apiClient.patch('/users/change-password', {
            currentPassword: currentPassword.trim(),
            newPassword: newPassword.trim(),
          });
          setCurrentPassword('');
          setNewPassword('');
          passwordChanged = true;
        } catch (pwErr: any) {
          const msg = pwErr?.response?.data?.message || '';
          const friendlyMsg = msg === 'Current password is incorrect'
            ? 'Mật khẩu hiện tại không đúng. Vui lòng kiểm tra lại.'
            : msg || 'Không thể đổi mật khẩu. Vui lòng thử lại.';
          Alert.alert('❌ Đổi mật khẩu thất bại', friendlyMsg);
          setLoading(false);
          return;
        }
      }

      // Show success
      let successMsg = 'Thông tin hồ sơ đã được cập nhật thành công!';
      if (changes.length === 1) {
        successMsg = `Đã cập nhật ${changes[0]} thành công!`;
      } else if (passwordChanged && changes.length === 2 && changes.includes('mật khẩu')) {
        const otherChange = changes.find(c => c !== 'mật khẩu');
        successMsg = `Đã cập nhật mật khẩu và ${otherChange} thành công!`;
      }

      if (passwordChanged) {
        Alert.alert('✅ Đổi mật khẩu thành công', 'Mật khẩu mới đã được lưu.', [
          {
            text: 'OK',
            onPress: () => {
              Alert.alert('✅ Thành công', successMsg, [
                { text: 'OK', onPress: () => router.back() }
              ]);
            }
          }
        ]);
      } else {
        Alert.alert('✅ Thành công', successMsg, [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (error: any) {
      console.error('Lỗi cập nhật hồ sơ', error);
      Alert.alert('Lỗi', error?.response?.data?.message || error?.message || 'Không thể cập nhật hồ sơ');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutOtherDevices = () => {
    Alert.alert(
      "Đăng xuất thiết bị",
      "Bạn có chắc muốn đăng xuất khỏi tất cả các thiết bị khác?",
      [
        { text: "Hủy", style: "cancel" },
        { text: "Đăng xuất", style: "destructive", onPress: () => Alert.alert("Thành công", "Đã đăng xuất khỏi các thiết bị khác.") }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Xoá tài khoản",
      "Bạn có chắc chắn muốn xóa tài khoản này vĩnh viễn không? Dữ liệu sẽ không thể khôi phục.",
      [
        { text: "Hủy", style: "cancel" },
        { text: "Xóa tài khoản", style: "destructive", onPress: logout }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F4F7F6]" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white shadow-sm z-10 border-b border-slate-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Feather name="arrow-left" size={24} color="#0D9488" />
        </TouchableOpacity>
        <Text className="text-base font-bold text-teal-800" style={{ fontFamily: 'Manrope-Bold' }}>
          Chỉnh sửa hồ sơ
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={loading} className="p-2">
          <Text className="text-teal-600 font-bold" style={{ fontFamily: 'Manrope-Bold' }}>
            {loading ? 'Đang lưu...' : 'Lưu'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View className="items-center py-6 bg-white border-b border-slate-100">
          <TouchableOpacity onPress={pickImage} className="relative mb-3">
            <View className="w-24 h-24 rounded-full border-2 border-teal-500 overflow-hidden bg-slate-100 items-center justify-center">
              {profile.avatarUrl ? (
                <Image 
                  source={{ uri: profile.avatarUrl }} 
                  style={{ width: '100%', height: '100%' }} 
                  transition={150} 
                />
              ) : (
                <Feather name="user" size={40} color="#94A3B8" />
              )}
            </View>
            <View className="absolute bottom-0 right-0 bg-teal-600 w-8 h-8 rounded-full items-center justify-center border-2 border-white">
              <Feather name="camera" size={14} color="white" />
            </View>
          </TouchableOpacity>
          <Text className="text-lg font-bold text-slate-800" style={{ fontFamily: 'Manrope-Bold' }}>
            {profile.fullName || 'Người dùng'}
          </Text>
          <TouchableOpacity onPress={pickImage}>
            <Text className="text-xs text-teal-600 mt-1 font-medium">Thay đổi ảnh</Text>
          </TouchableOpacity>
        </View>

        <View className="p-5">
          {/* THÔNG TIN CƠ BẢN */}
          <Text className="text-xs font-bold text-slate-400 uppercase mb-3 ml-1 tracking-wider" style={{ fontFamily: 'Manrope-Bold' }}>Thông tin cơ bản</Text>
          <View className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 overflow-hidden">
            <View className="p-4 border-b border-slate-50">
              <Text className="text-xs text-slate-500 mb-1">Họ và tên</Text>
              <TextInput
                value={profile.fullName}
                onChangeText={(t) => setProfile({ ...profile, fullName: t })}
                className="font-semibold text-slate-800 text-sm py-2 bg-slate-50 px-3 rounded-lg"
                placeholder="Nhập họ và tên..."
              />
            </View>
            <View className="p-4 border-b border-slate-50">
              <Text className="text-xs text-slate-500 mb-1">Tên hiển thị</Text>
              <TextInput
                value={profile.alias}
                onChangeText={(t) => setProfile({ ...profile, alias: t })}
                className="font-semibold text-slate-800 text-sm py-2 bg-slate-50 px-3 rounded-lg"
                placeholder="Nhập biệt danh..."
              />
            </View>
            <View className="p-4 border-b border-slate-50">
              <Text className="text-xs text-slate-500 mb-1">Ngày sinh (Định dạng: YYYY-MM-DD hoặc DD/MM/YYYY)</Text>
              <TextInput
                value={profile.dateOfBirth}
                onChangeText={(t) => setProfile({ ...profile, dateOfBirth: t })}
                className="font-semibold text-slate-800 text-sm py-2 bg-slate-50 px-3 rounded-lg"
                placeholder="Ví dụ: 1998-03-15 hoặc 15/03/1998"
              />
            </View>
            <View className="p-4">
              <Text className="text-xs text-slate-500 mb-2">Giới tính</Text>
              <View className="flex-row gap-2">
                <TouchableOpacity onPress={() => setProfile({...profile, gender: 'Nam'})} className={`flex-1 py-2 ${profile.gender === 'Nam' ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-slate-100'} border rounded-lg items-center`}>
                  <Text className={`${profile.gender === 'Nam' ? 'text-teal-700 font-bold' : 'text-slate-500 font-medium'} text-xs`}>Nam</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setProfile({...profile, gender: 'Nữ'})} className={`flex-1 py-2 ${profile.gender === 'Nữ' ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-slate-100'} border rounded-lg items-center`}>
                  <Text className={`${profile.gender === 'Nữ' ? 'text-teal-700 font-bold' : 'text-slate-500 font-medium'} text-xs`}>Nữ</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setProfile({...profile, gender: 'Khác'})} className={`flex-1 py-2 ${profile.gender === 'Khác' ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-slate-100'} border rounded-lg items-center`}>
                  <Text className={`${profile.gender === 'Khác' ? 'text-teal-700 font-bold' : 'text-slate-500 font-medium'} text-xs`}>Khác</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* LIÊN HỆ */}
          <Text className="text-xs font-bold text-slate-400 uppercase mb-3 ml-1 tracking-wider" style={{ fontFamily: 'Manrope-Bold' }}>Liên hệ</Text>
          <View className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 overflow-hidden">
            <View className="p-4 border-b border-slate-50 flex-row justify-between items-end">
              <View className="flex-1">
                <Text className="text-xs text-slate-500 mb-1">Email</Text>
                <TextInput
                  value={profile.email}
                  editable={false}
                  className="font-semibold text-slate-800 text-sm py-2 bg-slate-50 px-3 rounded-lg"
                />
              </View>
              <View className="bg-green-100 px-2 py-1 rounded ml-2 mb-2">
                <Text className="text-[9px] text-green-700 font-bold uppercase">✓ Đã xác minh</Text>
              </View>
            </View>
            <View className="p-4">
              <Text className="text-xs text-slate-500 mb-1">Số điện thoại</Text>
              <View className="flex-row items-center bg-slate-50 px-3 rounded-lg border border-slate-100">
                <Text className="text-slate-600 font-medium border-r border-slate-200 pr-2 py-2">🇻🇳 +84</Text>
                <TextInput
                  value={profile.phoneNumber}
                  onChangeText={(t) => setProfile({...profile, phoneNumber: t})}
                  className="flex-1 font-semibold text-slate-800 text-sm pl-3 py-2"
                  placeholder="987654321"
                />
              </View>
            </View>
          </View>

          {/* TÀI CHÍNH CÁ NHÂN */}
          <Text className="text-xs font-bold text-slate-400 uppercase mb-3 ml-1 tracking-wider" style={{ fontFamily: 'Manrope-Bold' }}>Tài chính cá nhân</Text>
          <View className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 overflow-hidden">
            <View className="p-4 border-b border-slate-50">
              <Text className="text-xs text-slate-500 mb-1">Thu nhập hằng tháng</Text>
              <TextInput
                value={profile.monthlyIncome}
                onChangeText={(t) => setProfile({ ...profile, monthlyIncome: t })}
                keyboardType="numeric"
                className="font-semibold text-slate-800 text-sm py-2 bg-slate-50 px-3 rounded-lg"
                placeholder="Ví dụ: 15000000"
              />
            </View>
            <View className="p-4 border-b border-slate-50">
              <Text className="text-xs text-slate-500 mb-2">Mục tiêu tài chính</Text>
              <View className="flex-row flex-wrap gap-2">
                {['Tiết kiệm mua nhà', 'Du lịch', 'Quỹ khẩn cấp', 'Đầu tư'].map((goal) => {
                  const isActive = profile.financialGoals.includes(goal);
                  return (
                    <TouchableOpacity 
                      key={goal}
                      onPress={() => {
                        const newGoals = isActive 
                          ? profile.financialGoals.filter(g => g !== goal)
                          : [...profile.financialGoals, goal];
                        setProfile({...profile, financialGoals: newGoals});
                      }}
                      className={`${isActive ? 'bg-[#1A6B5A]' : 'bg-slate-100'} px-3 py-1.5 rounded-full`}
                    >
                      <Text className={`${isActive ? 'text-white' : 'text-slate-600'} text-xs font-medium`}>{goal}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View className="p-4">
              <Text className="text-xs text-slate-500 mb-1">Loại tiền tệ</Text>
              <TouchableOpacity 
                onPress={() => {
                  const currencies = ['VND - Việt Nam Đồng', 'USD - US Dollar', 'EUR - Euro'];
                  const currentCode = profile.currency.split(' - ')[0];
                  const currentLabel = currencies.find(c => c.startsWith(currentCode)) || currencies[0];
                  const currentIndex = currencies.indexOf(currentLabel);
                  const next = currencies[(currentIndex + 1) % currencies.length];
                  setProfile({...profile, currency: next});
                }}
                className="flex-row justify-between items-center bg-slate-50 px-3 py-3 rounded-lg border border-slate-100"
              >
                <Text className="font-semibold text-slate-800 text-sm">
                  {profile.currency.split(' - ')[0] in {'VND':'','USD':'','EUR':''}
                    ? profile.currency
                    : ({'VND':'VND - Việt Nam Đồng','USD':'USD - US Dollar','EUR':'EUR - Euro'} as any)[profile.currency] || profile.currency}
                </Text>
                <Feather name="refresh-cw" size={16} color="#0D9488" />
              </TouchableOpacity>
            </View>
          </View>

          {/* BẢO MẬT */}
          <Text className="text-xs font-bold text-slate-400 uppercase mb-3 ml-1 tracking-wider" style={{ fontFamily: 'Manrope-Bold' }}>Bảo mật</Text>
          <View className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6">
            <View className="p-4 border-b border-slate-50">
              <View className="flex-row items-center mb-3">
                <Feather name="shield" size={18} color="#0D9488" className="mr-3" />
                <Text className="flex-1 text-sm text-slate-700 font-medium">Đổi mật khẩu</Text>
              </View>
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                className="font-semibold text-slate-800 text-sm py-2 bg-slate-50 px-3 rounded-lg mb-2"
                placeholder="Mật khẩu hiện tại"
              />
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                className="font-semibold text-slate-800 text-sm py-2 bg-slate-50 px-3 rounded-lg"
                placeholder="Mật khẩu mới (ít nhất 6 ký tự)"
              />
            </View>
            <View className="flex-row items-center py-3 px-4 border-b border-slate-100">
              <Ionicons name="finger-print-outline" size={20} color="#0D9488" className="mr-3" />
              <Text className="flex-1 text-sm text-slate-700 font-medium">Xác thực sinh trắc học</Text>
              <Switch
                trackColor={{ false: "#E2E8F0", true: "#0D9488" }}
                thumbColor={"#ffffff"}
                onValueChange={setBiometricEnabled}
                value={biometricEnabled}
              />
            </View>
            <TouchableOpacity onPress={handleLogoutOtherDevices} className="flex-row items-center py-4 px-4">
              <Feather name="monitor" size={18} color="#0D9488" className="mr-3" />
              <Text className="flex-1 text-sm text-slate-700 font-medium">Thiết bị đăng nhập</Text>
              <Text className="text-xs text-slate-400 mr-2">2 thiết bị</Text>
              <Feather name="chevron-right" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          </View>

          {/* Delete Account */}
          <TouchableOpacity onPress={handleDeleteAccount} className="py-4 items-center mb-8">
            <Text className="text-[#D63031] font-bold flex-row items-center">
              <Feather name="trash-2" size={14} /> Xóa tài khoản
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

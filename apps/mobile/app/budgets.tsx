import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { apiClient, getAuthToken, setAuthToken } from '../lib/http';
import BudgetAlerts, { BudgetCategorySummary } from '../components/BudgetAlerts';

type BudgetEntry = {
  id?: string;
  categoryId: number;
  categoryName: string;
  amount: number;
};

export default function BudgetsScreen() {
  const router = useRouter();

  // Selected Month & Year State (Default to current month/year)
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Screen States
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
  const [saveSuccess, setSaveSuccess] = useState<Record<string, boolean>>({});
  
  // Local input amounts state (mapping category name to raw digit string e.g. "5000000")
  const [inputs, setInputs] = useState<Record<string, string>>({});
  
  // Which category input is currently focused (to show raw digits while typing)
  const [focusedCategory, setFocusedCategory] = useState<string | null>(null);
  
  // Original budget amounts from server (mapping category name to number)
  const [serverBudgets, setServerBudgets] = useState<Record<string, number>>({});
  
  // Stores category summary data for displaying alerts
  const [budgetSummaryCategories, setBudgetSummaryCategories] = useState<BudgetCategorySummary[]>([]);

  // AI Suggestion states
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Array<{
    categoryId: number;
    categoryName: string;
    suggestedAmount: number;
    reasoning: string;
  }>>([]);
  const [showAiModal, setShowAiModal] = useState(false);

  // static fallback categories list (consistent with add-transaction)
  const categoriesList = [
    { name: 'Thực phẩm & Ăn uống', icon: 'silverware-fork-knife', color: '#0d9488', bgColor: 'bg-teal-100' },
    { name: 'Di chuyển & Xe cộ', icon: 'car', color: '#0284c7', bgColor: 'bg-blue-100' },
    { name: 'Nhà cửa & Hóa đơn', icon: 'home', color: '#7c3aed', bgColor: 'bg-purple-100' },
    { name: 'Giải trí & Mua sắm', icon: 'shopping', color: '#db2777', bgColor: 'bg-pink-100' },
    { name: 'Lương & Thưởng', icon: 'cash', color: '#16a34a', bgColor: 'bg-green-100' },
    { name: 'Khác', icon: 'dots-horizontal', color: '#64748b', bgColor: 'bg-slate-100' },
  ];

  // Helper to format amount display (e.g. 5000000 -> 5.000.000)
  const formatAmount = (numStr: string) => {
    const numeric = numStr.replace(/\D/g, '');
    if (!numeric) return '';
    return Number(numeric).toLocaleString('vi-VN');
  };

  // Navigating months
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  // Fetch budgets from API for the selected month and year
  const fetchBudgets = async () => {
    setIsLoading(true);
    try {
      let token = await getAuthToken();
      if (!token) {
        // Register or login a demo user if not logged in (consistent with context/add-transaction)
        const demoEmail = `mobile_user_${Math.round(Math.random() * 100000)}@example.com`;
        const res = await apiClient.post('/auth/register', {
          email: demoEmail,
          password: 'Password123!',
        });
        token = res.data?.token || res.data?.data?.token;
        if (token) await setAuthToken(token);
      }

      const response = await apiClient.get(`/budgets/summary?month=${selectedMonth}&year=${selectedYear}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const serverData = response.data?.data?.categories || response.data?.categories || [];
      setBudgetSummaryCategories(serverData);
      
      // Map server budget entries to easily query by category name
      const budgetMap: Record<string, number> = {};
      const inputMap: Record<string, string> = {};

      // Initialize all categories with empty string
      categoriesList.forEach((cat) => {
        inputMap[cat.name] = '';
        budgetMap[cat.name] = 0;
      });

      // Populate from server
      if (Array.isArray(serverData)) {
        serverData.forEach((b: any) => {
          const catName = b.categoryName;
          if (catName) {
            // Use Math.round to safely handle Prisma Decimal (e.g. "5000000.00" or "5e6")
            const numericVal = Math.round(Number(b.budgetAmount));
            budgetMap[catName] = numericVal;
            // Store as integer string (raw digits only, no formatting)
            inputMap[catName] = numericVal > 0 ? numericVal.toString() : '';
          }
        });
      }

      setServerBudgets(budgetMap);
      setInputs(inputMap);
    } catch (error) {
      console.warn('Lỗi fetch budgets:', error);
      // Fallback local initial state
      const inputMap: Record<string, string> = {};
      categoriesList.forEach((cat) => {
        inputMap[cat.name] = '';
      });
      setInputs(inputMap);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger fetch when month/year changes or screen is focused (SMM-158 / SMM-166 compliance)
  useFocusEffect(
    useCallback(() => {
      fetchBudgets();
    }, [selectedMonth, selectedYear])
  );

  // Handle saving budget inline
  const handleSaveBudget = async (categoryName: string, textValue: string) => {
    const numericAmount = Number(textValue.replace(/\D/g, '')) || 0;
    const previousAmount = serverBudgets[categoryName] || 0;

    // Avoid saving if value hasn't changed
    if (numericAmount === previousAmount) return;

    // Set saving state for this specific category row
    setIsSaving((prev) => ({ ...prev, [categoryName]: true }));
    setSaveSuccess((prev) => ({ ...prev, [categoryName]: false }));

    try {
      let token = await getAuthToken();
      
      // Call POST /budgets API endpoint we just built!
      await apiClient.post('/budgets', {
        category: categoryName,
        amount: numericAmount,
        month: selectedMonth,
        year: selectedYear,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Update server state local cache
      setServerBudgets((prev) => ({ ...prev, [categoryName]: numericAmount }));
      
      // Trigger success checkmark animation
      setSaveSuccess((prev) => ({ ...prev, [categoryName]: true }));
      setTimeout(() => {
        setSaveSuccess((prev) => ({ ...prev, [categoryName]: false }));
      }, 3000);
    } catch (error) {
      console.warn(`Lỗi lưu budget cho ${categoryName}:`, error);
      Alert.alert("Lỗi kết nối", `Không thể lưu ngân sách cho ${categoryName}. Vui lòng thử lại.`);
      // Rollback input to previous amount
      setInputs((prev) => ({
        ...prev,
        [categoryName]: previousAmount > 0 ? previousAmount.toString() : '',
      }));
    } finally {
      setIsSaving((prev) => ({ ...prev, [categoryName]: false }));
    }
  };

  // Fetch budget recommendations from Gemini API
  const fetchAiSuggestions = async () => {
    setIsSuggesting(true);
    try {
      const token = await getAuthToken();
      const response = await apiClient.post('/budgets/suggest', {
        month: selectedMonth,
        year: selectedYear,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = response.data?.data?.suggestions || response.data?.suggestions || [];
      if (data.length === 0) {
        Alert.alert('Thông tin', 'Chưa có đủ dữ liệu giao dịch 3 tháng gần nhất để AI phân tích gợi ý.');
        return;
      }
      setAiSuggestions(data);
      setShowAiModal(true);
    } catch (error) {
      console.warn('Lỗi gọi AI suggest:', error);
      Alert.alert('Lỗi', 'Không thể lấy đề xuất từ AI. Vui lòng thử lại sau.');
    } finally {
      setIsSuggesting(false);
    }
  };

  // Apply all suggestions recommended by AI
  const handleApplyAiSuggestions = async () => {
    try {
      setIsLoading(true);
      const token = await getAuthToken();
      
      // Save all suggestions to the database
      await Promise.all(
        aiSuggestions.map(async (sug) => {
          await apiClient.post('/budgets', {
            category: sug.categoryName,
            amount: sug.suggestedAmount,
            month: selectedMonth,
            year: selectedYear,
          }, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        })
      );
      
      setShowAiModal(false);
      Alert.alert('Thành công', 'Đã áp dụng toàn bộ ngân sách gợi ý từ AI.');
      fetchBudgets();
    } catch (error) {
      console.warn('Lỗi áp dụng ngân sách AI:', error);
      Alert.alert('Lỗi', 'Không thể áp dụng toàn bộ ngân sách. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to find server budget summary for a given category name
  const getCategorySummary = (catName: string) => {
    return budgetSummaryCategories.find((b) => b.categoryName === catName);
  };

  const categoriesWithBudget = categoriesList.filter((cat) => {
    const budgetAmount = serverBudgets[cat.name] || 0;
    return budgetAmount > 0;
  });

  const categoriesWithoutBudget = categoriesList.filter((cat) => {
    const budgetAmount = serverBudgets[cat.name] || 0;
    return budgetAmount === 0;
  });

  // Calculate total budget set for this month
  const totalBudget = Object.values(serverBudgets).reduce((sum, val) => sum + val, 0);

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        enabled={Platform.OS !== 'web'}
      >
        {/* Header Section */}
        <View className="flex-row items-center justify-between px-6 pt-3 pb-4 border-b border-slate-100 bg-white shadow-sm">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-slate-50 items-center justify-center border border-slate-100 active:bg-slate-100"
          >
            <Feather name="arrow-left" size={22} color="#1e293b" />
          </Pressable>
          <Text className="text-xl font-bold text-slate-800 tracking-tight">Thiết lập Ngân sách</Text>
          <View className="w-10 h-10" />
        </View>

        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          {/* Month/Year Navigation Carousel Card */}
          <View className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mt-5 mb-5 flex-row justify-between items-center">
            <Pressable
              onPress={handlePrevMonth}
              className="w-10 h-10 rounded-full bg-teal-50 items-center justify-center active:bg-teal-100"
            >
              <Feather name="chevron-left" size={24} color="#0d9488" />
            </Pressable>

            <View className="items-center">
              <Text className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-0.5">Thời gian</Text>
              <Text className="text-lg font-extrabold text-slate-800">
                Tháng {selectedMonth}, {selectedYear}
              </Text>
            </View>

            <Pressable
              onPress={handleNextMonth}
              className="w-10 h-10 rounded-full bg-teal-50 items-center justify-center active:bg-teal-100"
            >
              <Feather name="chevron-right" size={24} color="#0d9488" />
            </Pressable>
          </View>

          {/* Budget Alert Notifications (SMM-163 & SMM-165) */}
          {budgetSummaryCategories.length > 0 && !isLoading ? (
            <BudgetAlerts 
              categories={budgetSummaryCategories} 
              month={selectedMonth} 
              year={selectedYear} 
            />
          ) : null}

          {/* Overall Sum Header Card */}
          <View className="bg-gradient-to-br bg-[#0d9488] rounded-3xl p-6 shadow-md shadow-teal-900/10 mb-6">
            <View className="flex-row items-center mb-2">
              <MaterialCommunityIcons name="wallet-membership" size={20} color="#ccfbf1" style={{ marginRight: 6 }} />
              <Text className="text-teal-100 font-semibold text-sm uppercase tracking-wider">Tổng ngân sách tháng này</Text>
            </View>
            <Text className="text-white text-3xl font-extrabold tracking-tight">
              {totalBudget.toLocaleString('vi-VN')} đ
            </Text>
            <Text className="text-teal-50/70 text-xs mt-2 leading-4">
              Hạn mức tổng toàn bộ các danh mục chi tiêu mà bạn đã thiết lập trong Tháng {selectedMonth}.
            </Text>
          </View>

          {/* AI Budget Suggestions Trigger (SMM-168) */}
          <TouchableOpacity
            onPress={fetchAiSuggestions}
            disabled={isSuggesting}
            className="bg-teal-50 border border-teal-100 rounded-2xl py-3.5 px-4 mb-6 flex-row justify-between items-center active:bg-teal-100"
          >
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-teal-100 items-center justify-center mr-3">
                <MaterialCommunityIcons name="auto-fix" size={18} color="#0d9488" />
              </View>
              <View>
                <Text className="text-slate-800 font-bold text-sm">Gợi ý ngân sách bằng AI ✨</Text>
                <Text className="text-slate-500 text-xs mt-0.5">Tự động đề xuất dựa trên chi tiêu 3 tháng gần nhất</Text>
              </View>
            </View>
            {isSuggesting ? (
              <ActivityIndicator size="small" color="#0d9488" />
            ) : (
              <Feather name="chevron-right" size={20} color="#0d9488" />
            )}
          </TouchableOpacity>

          {/* Heading Description */}
          <View className="mb-4 flex-row justify-between items-center">
            <Text className="text-base font-bold text-slate-800">Hạn mức chi tiêu danh mục</Text>
            {isLoading ? <ActivityIndicator size="small" color="#0d9488" /> : null}
          </View>

          {isLoading ? (
            <View className="py-20 items-center justify-center">
              <ActivityIndicator size="large" color="#0d9488" />
              <Text className="text-sm text-slate-400 mt-4">Đang đồng bộ dữ liệu ngân sách...</Text>
            </View>
          ) : (
            <View className="mb-12">
              {/* Group 1: Categories with budget set (Active Progress Tracking) */}
              <View className="space-y-4">
                {categoriesWithBudget.map((cat, index) => {
                  const currentVal = inputs[cat.name] || '';
                  const isCurrentRowSaving = isSaving[cat.name] || false;
                  const isCurrentRowSuccess = saveSuccess[cat.name] || false;
                  const summary = getCategorySummary(cat.name);
                  const spentAmount = summary ? Number(summary.spentAmount) : 0;
                  const budgetAmount = serverBudgets[cat.name] || 0;
                  const percentage = summary ? Math.round(Number(summary.percentage)) : 0;
                  const remaining = Math.max(budgetAmount - spentAmount, 0);

                  return (
                    <View
                      key={`with-${index}`}
                      className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm"
                    >
                      {/* Category Icon, Name, and Budget Input */}
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center flex-1 mr-4">
                          <View className={`w-12 h-12 rounded-full ${cat.bgColor} items-center justify-center mr-4 shadow-sm`}>
                            <MaterialCommunityIcons name={cat.icon as any} size={24} color={cat.color} />
                          </View>
                          <View className="flex-1">
                            <Text className="text-base font-bold text-slate-800" numberOfLines={1}>
                              {cat.name}
                            </Text>
                            <Text className="text-xs text-slate-400 mt-0.5" numberOfLines={1}>
                              {cat.name === 'Lương & Thưởng' ? 'Ngân sách thu' : 'Ngân sách chi'}
                            </Text>
                          </View>
                        </View>

                        {/* Input */}
                        <View className="items-end">
                          <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-3 w-36 h-10">
                            <TextInput
                              value={
                                focusedCategory === cat.name
                                  ? currentVal  // raw digits while typing → no cursor jump
                                  : currentVal ? formatAmount(currentVal) : ''
                              }
                              onChangeText={(text) => {
                                // Strip all non-digit chars (handles formatted input paste too)
                                const cleaned = text.replace(/\D/g, '');
                                setInputs((prev) => ({ ...prev, [cat.name]: cleaned }));
                              }}
                              onFocus={() => setFocusedCategory(cat.name)}
                              onBlur={() => {
                                setFocusedCategory(null);
                                handleSaveBudget(cat.name, currentVal);
                              }}
                              keyboardType="numeric"
                              placeholder="Chưa đặt"
                              placeholderTextColor="#94a3b8"
                              style={{ minWidth: 0, width: '100%' }}
                              className="flex-1 h-full text-right font-extrabold text-slate-800 text-sm p-0 mr-1"
                            />
                            <Text className="text-xs font-bold text-slate-500">đ</Text>
                          </View>
                        </View>
                      </View>

                      {/* Progress Bar & Info (SMM-BUD-02 AC Compliance) */}
                      <View className="mt-4 pt-4 border-t border-slate-50">
                        <View className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
                          <View
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                            className={`h-full rounded-full ${
                              percentage >= 100
                                ? 'bg-rose-500'
                                : percentage >= 80
                                ? 'bg-amber-500'
                                : 'bg-[#0d9488]'
                            }`}
                          />
                        </View>
                        <View className="flex-row justify-between items-center mt-1">
                          <Text className="text-[11px] text-slate-500">
                            Đã tiêu: <Text className="font-bold text-slate-700">{spentAmount.toLocaleString('vi-VN')} đ</Text>
                            {remaining > 0 ? (
                              <Text className="text-slate-400"> | Còn lại: <Text className="font-semibold text-slate-600">{remaining.toLocaleString('vi-VN')} đ</Text></Text>
                            ) : budgetAmount > 0 && spentAmount >= budgetAmount ? (
                              <Text className="text-rose-600 font-semibold"> | Đã hết hạn mức!</Text>
                            ) : null}
                          </Text>
                          <Text className={`text-[11px] font-bold ${
                            percentage >= 100 ? 'text-rose-600' : percentage >= 80 ? 'text-amber-600' : 'text-[#0d9488]'
                          }`}>
                            {percentage}%
                          </Text>
                        </View>
                      </View>

                      {/* Micro-interaction feedback */}
                      <View className="h-4 mt-1 items-end justify-center">
                        {isCurrentRowSaving && (
                          <View className="flex-row items-center">
                            <ActivityIndicator size="small" color="#0d9488" style={{ marginRight: 3, transform: [{ scale: 0.6 }] }} />
                            <Text className="text-[10px] text-teal-600 font-medium">Đang lưu...</Text>
                          </View>
                        )}
                        {isCurrentRowSuccess && (
                          <View className="flex-row items-center">
                            <Feather name="check" size={10} color="#16a34a" style={{ marginRight: 2 }} />
                            <Text className="text-[10px] text-green-600 font-semibold">Đã lưu tự động</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Group 2: Categories without budget set (SMM-BUD-02 AC Compliance) */}
              {categoriesWithoutBudget.length > 0 && (
                <View className="mt-8">
                  <Text className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">Danh mục chưa thiết lập hạn mức</Text>
                  <View className="space-y-4">
                    {categoriesWithoutBudget.map((cat, index) => {
                      const currentVal = inputs[cat.name] || '';
                      const isCurrentRowSaving = isSaving[cat.name] || false;
                      const isCurrentRowSuccess = saveSuccess[cat.name] || false;

                      return (
                        <View
                          key={`without-${index}`}
                          className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm flex-row items-center justify-between"
                        >
                          <View className="flex-row items-center flex-1 mr-4">
                            <View className={`w-12 h-12 rounded-full ${cat.bgColor} items-center justify-center mr-4 shadow-sm`}>
                              <MaterialCommunityIcons name={cat.icon as any} size={24} color={cat.color} />
                            </View>
                            <View className="flex-1">
                              <Text className="text-base font-bold text-slate-800" numberOfLines={1}>
                                {cat.name}
                              </Text>
                              <Text className="text-xs text-slate-400 mt-0.5" numberOfLines={1}>
                                {cat.name === 'Lương & Thưởng' ? 'Ngân sách thu' : 'Ngân sách chi'}
                              </Text>
                            </View>
                          </View>

                          <View className="items-end">
                            <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-3 w-36 h-10">
                              <TextInput
                                value={
                                  focusedCategory === cat.name
                                    ? currentVal  // raw digits while typing → no cursor jump
                                    : currentVal ? formatAmount(currentVal) : ''
                                }
                                onChangeText={(text) => {
                                  // Strip all non-digit chars (handles formatted input paste too)
                                  const cleaned = text.replace(/\D/g, '');
                                  setInputs((prev) => ({ ...prev, [cat.name]: cleaned }));
                                }}
                                onFocus={() => setFocusedCategory(cat.name)}
                                onBlur={() => {
                                  setFocusedCategory(null);
                                  handleSaveBudget(cat.name, currentVal);
                                }}
                                keyboardType="numeric"
                                placeholder="Chưa đặt"
                                placeholderTextColor="#94a3b8"
                                style={{ minWidth: 0, width: '100%' }}
                                className="flex-1 h-full text-right font-extrabold text-slate-800 text-sm p-0 mr-1"
                              />
                              <Text className="text-xs font-bold text-slate-500">đ</Text>
                            </View>

                            <View className="h-4 mt-1 justify-center">
                              {isCurrentRowSaving && (
                                <View className="flex-row items-center">
                                  <ActivityIndicator size="small" color="#0d9488" style={{ marginRight: 3, transform: [{ scale: 0.6 }] }} />
                                  <Text className="text-[10px] text-teal-600 font-medium">Đang lưu...</Text>
                                </View>
                              )}
                              {isCurrentRowSuccess && (
                                <View className="flex-row items-center">
                                  <Feather name="check" size={10} color="#16a34a" style={{ marginRight: 2 }} />
                                  <Text className="text-[10px] text-green-600 font-semibold">Đã lưu tự động</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Grand Total Footer Card (SMM-152 AC Compliance) */}
              <View className="bg-slate-100 border border-slate-200 rounded-3xl p-5 mt-6 mb-12 flex-row justify-between items-center">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-[#0d9488] rounded-2xl items-center justify-center mr-3 shadow-sm">
                    <MaterialCommunityIcons name="wallet-membership" size={20} color="white" />
                  </View>
                  <View>
                    <Text className="text-slate-800 font-extrabold text-sm">Tổng ngân sách tháng</Text>
                    <Text className="text-slate-400 text-xs mt-0.5">Thời gian: {selectedMonth}/{selectedYear}</Text>
                  </View>
                </View>
                <Text className="text-[#0d9488] font-black text-lg">
                  {totalBudget.toLocaleString('vi-VN')} đ
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* AI Suggestions Review Modal (SMM-168) */}
        <Modal
          visible={showAiModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAiModal(false)}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-[40px] max-h-[85%] p-6 shadow-2xl">
              {/* Header */}
              <View className="flex-row justify-between items-center pb-4 border-b border-slate-100">
                <View className="flex-row items-center">
                  <View className="w-9 h-9 bg-teal-100 rounded-xl items-center justify-center mr-3">
                    <MaterialCommunityIcons name="auto-fix" size={18} color="#0d9488" />
                  </View>
                  <View>
                    <Text className="font-extrabold text-slate-800 text-base">Đề xuất ngân sách từ AI</Text>
                    <Text className="text-slate-400 text-xs mt-0.5">Áp dụng cho tháng {selectedMonth}/{selectedYear}</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  onPress={() => setShowAiModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center active:bg-slate-100"
                >
                  <Feather name="x" size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Suggestions List */}
              <ScrollView className="my-4" showsVerticalScrollIndicator={false}>
                <Text className="text-xs text-slate-500 mb-4 leading-5">
                  AI đã phân tích lịch sử chi tiêu của bạn trong 3 tháng gần nhất để đưa ra gợi ý hạn mức tối ưu giúp bạn tiết kiệm chi phí không cần thiết:
                </Text>
                
                {aiSuggestions.map((sug, idx) => (
                  <View key={idx} className="bg-slate-50 rounded-2xl p-4 mb-3 border border-slate-100">
                    <View className="flex-row justify-between items-center mb-2">
                      <Text className="font-bold text-slate-700 text-sm">{sug.categoryName}</Text>
                      <Text className="font-black text-[#0d9488] text-sm">
                        {sug.suggestedAmount.toLocaleString('vi-VN')} đ
                      </Text>
                    </View>
                    <Text className="text-xs text-slate-500 leading-relaxed italic">
                      💡 {sug.reasoning}
                    </Text>
                  </View>
                ))}
              </ScrollView>

              {/* Footer Buttons */}
              <View className="flex-row space-x-3 pt-2">
                <TouchableOpacity
                  onPress={() => setShowAiModal(false)}
                  className="flex-1 bg-slate-100 rounded-2xl py-4 items-center active:bg-slate-200"
                >
                  <Text className="text-slate-600 font-bold text-sm">Bỏ qua</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleApplyAiSuggestions}
                  className="flex-1 bg-[#0d9488] rounded-2xl py-4 items-center active:bg-[#0b766c]"
                >
                  <Text className="text-white font-bold text-sm">Áp dụng tất cả</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Refactored: style(budgets): update budget progress bar colors for alert states

// Refactored: style(budgets): update budget progress bar colors for alert states

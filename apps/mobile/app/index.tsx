import React, { useState, useEffect, useCallback } from "react";
import { Text } from "@/components/ui/text";
import { useRouter, useFocusEffect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { View, Pressable, ScrollView, TouchableOpacity, Platform } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Home, PiggyBank, User, Wallet, Utensils, Car, DollarSign, ShoppingCart, Bot } from "lucide-react-native";
import { useTransactions } from "../context/TransactionsContext";
import { apiClient, getAuthToken } from "../lib/http";
import BudgetAlerts from "../components/BudgetAlerts";
import AppBottomTab from "../components/AppBottomTab";
import { PieChart } from "react-native-gifted-charts";
import TopCategoriesList from "../components/TopCategoriesList";
import TrendChart from "../components/TrendChart";
import CompareChart from "../components/CompareChart";
import QuickInputBar from "../components/QuickInputBar";
import HealthScoreCard from "../components/HealthScoreCard";
import WeeklyInsightCard from "../components/WeeklyInsightCard";
import RecurringExpenseCard from "../components/RecurringExpenseCard";

export default function Index() {
  const router = useRouter();
  const { 
    transactions, 
    stats, 
    refreshTransactions,
    userProfile,
    fetchUserProfile,
    localAvatarOverride
  } = useTransactions();
  const { user: clerkUser } = useUser();
  const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

  const gotoAddTransaction = () => {
    router.push("/add-transaction");
  };

  const gotoTransactionsList = () => {
    router.push("/transactions");
  };

  const gotoChat = () => router.push('/chat');
  const gotoBudgets = () => router.push('/budgets');
  const gotoGoals = () => router.push('/goals');

  const gotoExample = () => {
    router.push("/example");
  };

  const { totalIncome, totalExpense, currentBalance } = stats || {
    totalIncome: 0,
    totalExpense: 0,
    currentBalance: 0,
  };

  // User Profile and Real-time Clock states
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // Real-time Budget progression states
  const [budgetSummary, setBudgetSummary] = useState<{
    totalBudget: number;
    totalSpent: number;
    remaining: number;
    month: number;
    year: number;
    categories: Array<{
      categoryId: number;
      categoryName: string;
      budgetAmount: number;
      spentAmount: number;
      percentage: number;
      threshold: "NONE" | "WARNING" | "DANGER";
    }>;
  } | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);

  // Dashboard summary data state (Primary datasource for chart, balances and transactions)
  const [dashboardData, setDashboardData] = useState<{
    month: number;
    year: number;
    totalBalance: number;
    totalIncomeMonth: number;
    totalExpenseMonth: number;
    recentTransactions: Array<{
      id: string;
      type: 'expense' | 'income' | 'saving';
      amount: number;
      transactionDate: string;
      note: string;
      category?: {
        name: string;
        nameVi?: string;
        color?: string;
      };
    }>;
    categorySpending: Array<{
      categoryId?: number;
      categoryName: string;
      amount: number;
      percentage: number;
      color: string;
    }>;
    budgetProgress: {
      totalBudget: number;
      totalSpent: number;
      remaining: number;
      percentage: number;
    };
  } | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);



  const fetchBudgetSummary = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();

      const response = await apiClient.get(`/budgets/summary?month=${month}&year=${year}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = response.data?.data || response.data;
      if (data) {
        setBudgetSummary({
          totalBudget: Number(data.totalBudget) || 0,
          totalSpent: Number(data.totalSpent) || 0,
          remaining: Number(data.remaining) || 0,
          month: Number(data.month) || month,
          year: Number(data.year) || year,
          categories: data.categories || [],
        });
      }
    } catch (error) {
      console.warn("Lỗi fetch budget summary ở Dashboard:", error);
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const fetchDashboardSummary = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();

      const response = await apiClient.get(`/dashboard/summary?month=${month}&year=${year}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = response.data?.data || response.data;
      if (data) {
        setDashboardData(data);
      }
    } catch (error) {
      console.warn("Lỗi fetch dashboard summary ở Dashboard:", error);
    } finally {
      setIsDashboardLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
    
    // Real-time clock ticks every 10 seconds to keep calendar & budgets completely sync'd
    const clockTimer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 10000);

    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    fetchUserProfile();
    fetchBudgetSummary();
    fetchDashboardSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions]);

  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
      refreshTransactions();
    }, [])
  );

  // Primary variables for display (using dashboard API data as primary, falling back to local transactions)
  const displayBalance = dashboardData !== null ? dashboardData.totalBalance : currentBalance;
  const displayIncome = dashboardData !== null ? dashboardData.totalIncomeMonth : totalIncome;
  const displayExpense = dashboardData !== null ? dashboardData.totalExpenseMonth : totalExpense;

  // Donut chart dynamic data mapping
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  const totalExpenseAmount = expenseTransactions.reduce((acc, t) => acc + t.amount, 0);

  let donutData: any[] = [];

  if (dashboardData && dashboardData.categorySpending && dashboardData.categorySpending.length > 0) {
    donutData = dashboardData.categorySpending.map(item => ({
      categoryName: item.categoryName,
      percentage: item.percentage,
      color: item.color,
      amount: item.amount
    }));
  } else if (totalExpenseAmount > 0) {
    const categorySums: Record<string, number> = {};
    expenseTransactions.forEach(t => {
      const cat = t.category || "Khác";
      categorySums[cat] = (categorySums[cat] || 0) + t.amount;
    });

    const sortedCategories = Object.entries(categorySums)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: Math.round((amount / totalExpenseAmount) * 100)
      }))
      .sort((a, b) => b.amount - a.amount);

    const colors = ["#0D9488", "#1A6B5A", "#2DD4BF", "#115E59", "#94A3B8"];
    if (sortedCategories.length > 0) {
      let topCategories = sortedCategories.slice(0, 4).map((c, i) => ({
        categoryName: c.name,
        percentage: c.percentage,
        color: colors[i % colors.length],
        amount: c.amount
      }));

      const topPercentageSum = topCategories.reduce((acc, c) => acc + c.percentage, 0);
      const topAmountSum = topCategories.reduce((acc, c) => acc + c.amount, 0);
      if (topPercentageSum < 100 && sortedCategories.length > 4) {
        topCategories.push({
          categoryName: "Khác",
          percentage: 100 - topPercentageSum,
          color: "#94A3B8",
          amount: totalExpenseAmount - topAmountSum
        });
      } else if (topPercentageSum < 100) {
        if (topCategories.length > 0) {
          topCategories[0].percentage += (100 - topPercentageSum);
        }
      }
      donutData = topCategories;
    }
  } else if (!userProfile) {
    // Show mock data ONLY if user is not authenticated / guest mode
    donutData = [
      { categoryName: "Ăn uống", percentage: 35, color: "#0D9488", amount: 2100000 },
      { categoryName: "Mua sắm", percentage: 20, color: "#1A6B5A", amount: 1200000 },
      { categoryName: "Di chuyển", percentage: 20, color: "#2DD4BF", amount: 1200000 },
      { categoryName: "Nhà ở", percentage: 15, color: "#115E59", amount: 900000 },
      { categoryName: "Khác", percentage: 10, color: "#94A3B8", amount: 600000 }
    ];
  }

  // Map donutData to react-native-gifted-charts format with custom gray slice if empty
  const isSpendingEmpty = donutData.length === 0 || donutData.every(item => item.percentage === 0);
  const pieData = isSpendingEmpty 
    ? [{ value: 100, color: "#E2E8F0", text: "0%" }] 
    : donutData.map(item => ({
        value: item.percentage,
        color: item.color,
        text: `${item.percentage}%`,
      }));

  // Monthly Budgets mapping with warning alerts
  const displayBudgets = budgetSummary && budgetSummary.categories && budgetSummary.categories.length > 0
    ? budgetSummary.categories.map(c => ({
        title: c.categoryName,
        spent: c.spentAmount,
        limit: c.budgetAmount,
        percentage: Math.min((c.spentAmount / c.budgetAmount) * 100, 100),
        ratio: `${c.spentAmount.toLocaleString('vi-VN')} / ${c.budgetAmount.toLocaleString('vi-VN')} VND`,
        remaining: c.budgetAmount - c.spentAmount,
      }))
    : !userProfile
      ? [
          {
            title: "Ăn uống",
            spent: 2100000,
            limit: 5000000,
            percentage: 42,
            ratio: "2.100.000 / 5.000.000 VND",
            remaining: 2900000,
          },
          {
            title: "Mua sắm",
            spent: 3200000,
            limit: 4000000,
            percentage: 80,
            ratio: "3.200.000 / 4.000.000 VND",
            remaining: 800000,
          }
        ]
      : [];

  // Dynamic recent transactions mapping: prioritize real user transactions
  let displayTransactions: any[] = [];

  if (dashboardData && dashboardData.recentTransactions && dashboardData.recentTransactions.length > 0) {
    displayTransactions = dashboardData.recentTransactions.map((tx: any) => {
      const dateObj = new Date(tx.transactionDate);
      const isToday = dateObj.toDateString() === new Date().toDateString();
      const dateText = isToday 
        ? `Hôm nay, ${dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
        : dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

      return {
        id: tx.id.toString(),
        category: tx.category?.nameVi || tx.category?.name || "Khác",
        note: tx.note || tx.description || (tx.category?.nameVi || tx.category?.name || "Giao dịch"),
        date: dateText,
        amount: Number(tx.amount),
        type: tx.type === 'saving' ? 'savings' : tx.type
      };
    });
  } else if (transactions && transactions.length > 0) {
    displayTransactions = transactions.slice(0, 3);
  } else if (!userProfile) {
    // Show mock data ONLY if user is not authenticated / guest mode
    displayTransactions = [
      {
        id: "mock-1",
        category: "Ăn uống",
        note: "Phở Thìn Lò Đúc",
        date: "Hôm nay, 08:30",
        amount: 95000,
        type: "expense"
      },
      {
        id: "mock-2",
        category: "Lương",
        note: "Lương tháng 10",
        date: "Hôm qua, 17:00",
        amount: 25000000,
        type: "income"
      },
      {
        id: "mock-3",
        category: "Di chuyển",
        note: "Grab ride",
        date: "24/10/2023",
        amount: 120000,
        type: "expense"
      }
    ];
  }

  const getTxVisuals = (category: string, type: string) => {
    const lowerCat = category?.toLowerCase() || '';
    let IconComponent = Wallet;
    let bgClass = 'bg-teal-50';
    let colorClass = '#0D9488';

    if (lowerCat.includes('ăn') || lowerCat.includes('uống') || lowerCat.includes('phở') || lowerCat.includes('nhà hàng')) {
      IconComponent = Utensils;
      bgClass = 'bg-emerald-50';
      colorClass = '#0D9488';
    } else if (lowerCat.includes('di chuy') || lowerCat.includes('grab') || lowerCat.includes('xe') || lowerCat.includes('taxi')) {
      IconComponent = Car;
      bgClass = 'bg-cyan-50';
      colorClass = '#06B6D4';
    } else if (lowerCat.includes('lương') || lowerCat.includes('thu nhập') || type === 'income') {
      IconComponent = DollarSign;
      bgClass = 'bg-teal-50';
      colorClass = '#1A6B5A';
    } else if (lowerCat.includes('mua') || lowerCat.includes('sắm') || lowerCat.includes('siêu thị')) {
      IconComponent = ShoppingCart;
      bgClass = 'bg-rose-50';
      colorClass = '#D63031';
    }

    return { IconComponent, bgClass, colorClass };
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F4F7F6]" edges={['top']}>
      <ScrollView 
        className="flex-1 px-5 pt-4" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Welcome Header with Date Badge */}
        <View className="flex-row items-center justify-between mb-6 mt-2 gap-2">
          <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
            <View className="w-9 h-9 rounded-full border border-teal-200 overflow-hidden bg-teal-50 justify-center items-center shrink-0">
              {localAvatarOverride || userProfile?.avatarUrl || clerkUser?.imageUrl ? (
                <Image 
                  source={{ uri: localAvatarOverride || (userProfile?.avatarUrl ? (userProfile.avatarUrl.startsWith('http') ? userProfile.avatarUrl : `${baseUrl}${userProfile.avatarUrl}`) : clerkUser?.imageUrl) }} 
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                  transition={150}
                />
              ) : (
                <User size={18} color="#0D9488" />
              )}
            </View>
            <Text 
              className="text-[15px] font-bold text-slate-800 flex-1"
              style={{ fontFamily: 'Manrope-Bold' }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Xin chào, {userProfile?.fullName || clerkUser?.fullName || ""} 👋
            </Text>
          </View>
          {/* Date Badge */}
          <View className="bg-teal-50 border border-teal-100 rounded-full px-2.5 py-1.5 flex-row items-center gap-1 shrink-0">
            <Text 
              className="text-[11px] text-[#0D9488] font-bold"
              style={{ fontFamily: 'Manrope-Bold' }}
            >
              {`Tháng ${currentDateTime.getMonth() + 1}, ${currentDateTime.getFullYear()}`}
            </Text>
            <Feather name="calendar" size={13} color="#0D9488" />
          </View>
        </View>

        {/* AI Quick Input */}
        <QuickInputBar />

        {/* Balance Card */}
        <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100/50 mb-6">
          <Text 
            className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1"
            style={{ fontFamily: 'Manrope-Bold' }}
          >
            Số dư hiện tại
          </Text>
          <View className="flex-row items-baseline mb-6">
            <Text 
              className="text-teal-600 text-3xl font-black mr-2"
              style={{ fontFamily: 'HankenGrotesk-Bold' }}
            >
              {displayBalance.toLocaleString('vi-VN')}
            </Text>
            <Text 
              className="text-teal-600 text-sm font-bold"
              style={{ fontFamily: 'Manrope-Bold' }}
            >
              VND
            </Text>
          </View>
          
          <View className="flex-row justify-between border-t border-slate-100 pt-4">
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5 mb-1">
                <Feather name="arrow-down" size={14} color="#0D9488" />
                <Text 
                  className="text-slate-500 text-xs font-bold"
                  style={{ fontFamily: 'Manrope-Bold' }}
                >
                  Tổng thu
                </Text>
              </View>
              <Text 
                className="text-[#0D9488] font-black text-lg"
                style={{ fontFamily: 'HankenGrotesk-Bold' }}
              >
                {displayIncome.toLocaleString('vi-VN')}
              </Text>
            </View>
            <View className="w-px bg-slate-100 mx-4" />
            <View className="flex-1 items-start">
              <View className="flex-row items-center gap-1.5 mb-1">
                <Feather name="arrow-up" size={14} color="#D63031" />
                <Text 
                  className="text-slate-500 text-xs font-bold"
                  style={{ fontFamily: 'Manrope-Bold' }}
                >
                  Tổng chi
                </Text>
              </View>
              <Text 
                className="text-[#D63031] font-black text-lg"
                style={{ fontFamily: 'HankenGrotesk-Bold' }}
              >
                {displayExpense.toLocaleString('vi-VN')}
              </Text>
            </View>
          </View>
        </View>

        {/* Budget Alert Notifications (Real-time checks) */}
        {!isSummaryLoading && budgetSummary && (
          <BudgetAlerts 
            categories={budgetSummary.categories} 
            month={budgetSummary.month} 
            year={budgetSummary.year} 
          />
        )}

        {/* Financial Health Score (SMM-AI-06) */}
        <HealthScoreCard />

        {/* Weekly Spending Insight (SMM-AI-04) */}
        <WeeklyInsightCard />

        {/* Recurring Expense Detection (SMM-AI-05) */}
        <RecurringExpenseCard />

        {/* Category Spending (Donut Chart Section) */}
        <View className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100/50 mb-6">
          <Text 
            className="text-base font-bold text-slate-800 mb-2"
            style={{ fontFamily: 'Manrope-Bold' }}
          >
            Chi tiêu theo hạng mục
          </Text>
          
          <View className="items-center justify-center py-6 border-b border-slate-100/60 mb-5">
            {/* Pie/Donut Chart using Gifted Charts */}
            <PieChart
              data={pieData}
              donut
              radius={64}
              innerRadius={48}
              innerCircleColor="white"
              centerLabelComponent={() => {
                return (
                  <View className="items-center justify-center">
                    <Text 
                      className="text-[9px] text-slate-400 font-bold uppercase tracking-wider"
                      style={{ fontFamily: 'Manrope-Bold' }}
                    >
                      Tháng {currentDateTime.getMonth() + 1}
                    </Text>
                    <Text 
                      className="text-[15px] font-black text-slate-800 mt-0.5"
                      style={{ fontFamily: 'HankenGrotesk-Bold' }}
                    >
                      {isSpendingEmpty ? "0%" : "Chi tiêu"}
                    </Text>
                  </View>
                );
              }}
            />
          </View>

          {/* Top Categories Legend */}
          <TopCategoriesList categories={donutData} />
        </View>

        {/* Action Cards */}
        <View className="space-y-4 mb-8">
          <Pressable
            onPress={gotoTransactionsList}
            className="flex-row items-center bg-[#047857] active:bg-emerald-800 p-5 rounded-3xl shadow-lg shadow-emerald-900/20"
          >
            <View className="w-14 h-14 bg-white/20 rounded-2xl items-center justify-center mr-4">
              <MaterialCommunityIcons name="view-list" size={30} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-xl font-bold mb-1">
                Danh sách Giao dịch
              </Text>
              <Text className="text-emerald-100 text-sm leading-5">
                Xem toàn bộ lịch sử chi tiêu, thu nhập phân nhóm theo ngày & bộ lọc thông minh.
              </Text>
            </View>
            <Feather name="chevron-right" size={24} color="white" />
          </Pressable>

          <Pressable
            onPress={gotoBudgets}
            className="flex-row items-center bg-white active:bg-slate-50 border border-teal-100 p-5 rounded-3xl shadow-sm"
          >
            <View className="w-14 h-14 bg-teal-50 rounded-2xl items-center justify-center mr-4">
              <MaterialCommunityIcons name="wallet-membership" size={28} color="#0d9488" />
            </View>
            <View className="flex-1">
              <Text className="text-slate-800 text-lg font-bold mb-1">
                Thiết lập Ngân sách
              </Text>
              <Text className="text-slate-500 text-sm leading-5">
                Quản lý ngân sách chi tiêu từng danh mục hàng tháng với tính năng tự động lưu.
              </Text>
            </View>
            <Feather name="chevron-right" size={24} color="#0d9488" />
          </Pressable>

          <Pressable
            onPress={gotoGoals}
            className="flex-row items-center bg-indigo-500 active:bg-indigo-600 p-5 rounded-3xl shadow-lg shadow-indigo-900/20 mt-4"
          >
            <View className="w-14 h-14 bg-white/20 rounded-2xl items-center justify-center mr-4">
              <MaterialCommunityIcons name="target" size={30} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-xl font-bold mb-1">
                Mục tiêu tài chính
              </Text>
              <Text className="text-indigo-100 text-sm leading-5">
                Lên kế hoạch, theo dõi tiến độ và nhận gợi ý AI để đạt được mục tiêu nhanh nhất.
              </Text>
            </View>
            <Feather name="chevron-right" size={24} color="white" />
          </Pressable>

          <Pressable
            onPress={gotoAddTransaction}
            className="flex-row items-center bg-white active:bg-slate-50 border border-teal-100 p-5 rounded-3xl shadow-sm"
          >
            <View className="w-14 h-14 bg-teal-50 rounded-2xl items-center justify-center mr-4">
              <Feather name="plus-circle" size={28} color="#0d9488" />
            </View>
            <View className="flex-1">
              <Text className="text-slate-800 text-lg font-bold mb-1">
                Thêm giao dịch mới
              </Text>
              <Text className="text-slate-500 text-sm leading-5">
                Giao diện thiết kế mới với hỗ trợ AI tự động phân loại hạng mục chi tiêu.
              </Text>
            </View>
            <Feather name="chevron-right" size={24} color="#0d9488" />
          </Pressable>

          <Pressable
            onPress={gotoExample}
            className="flex-row items-center bg-white active:bg-slate-50 border border-slate-200 p-5 rounded-3xl shadow-sm"
          >
            <View className="w-14 h-14 bg-slate-100 rounded-2xl items-center justify-center mr-4">
              <Feather name="grid" size={28} color="#64748b" />
            </View>
            <View className="flex-1">
              <Text className="text-slate-800 text-lg font-bold mb-1">
                Trang mẫu (Example)
              </Text>
              <Text className="text-slate-500 text-sm leading-5">
                Xem cấu trúc component mặc định của hệ thống.
              </Text>
            </View>
            <Feather name="chevron-right" size={24} color="#64748b" />
          </Pressable>
        </View>

        <View className="mb-12">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-slate-800">Giao dịch gần đây ({transactions.length})</Text>
            <Pressable onPress={gotoTransactionsList}>
              <Text className="text-sm font-semibold text-teal-600">Xem tất cả</Text>
            </Pressable>
          </View>
          {/* Top 5 Categories List */}
          <TopCategoriesList categories={donutData} />
        </View>

        {/* Transaction Trend Line Chart Section */}
        <TrendChart />

        {/* Comparison Chart Section */}
        <CompareChart />

        {/* Monthly Budget Section */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text 
              className="text-base font-bold text-slate-800"
              style={{ fontFamily: 'Manrope-Bold' }}
            >
              Ngân sách tháng
            </Text>
            <TouchableOpacity onPress={gotoBudgets}>
              <Text 
                className="text-xs font-semibold text-teal-600"
                style={{ fontFamily: 'Manrope-SemiBold' }}
              >
                Xem tất cả
              </Text>
            </TouchableOpacity>
          </View>

          <View className="gap-3">
            {displayBudgets.length === 0 ? (
              <View className="bg-white p-6 rounded-2xl border border-slate-100/50 shadow-sm items-center justify-center">
                <Text 
                  className="text-slate-400 text-xs font-semibold text-center"
                  style={{ fontFamily: 'Manrope-SemiBold' }}
                >
                  Chưa thiết lập ngân sách tháng này.
                </Text>
              </View>
            ) : (
              displayBudgets.map((b, idx) => {
                const isWarning = b.percentage >= 80;
                const isExceeded = b.percentage > 100;
                
                let barColor = 'bg-[#0D9488]';
                let textColor = 'text-[#0D9488]';
                let infoText = `Còn lại ${b.remaining.toLocaleString('vi-VN')} VND (An toàn)`;

                if (isExceeded) {
                  barColor = 'bg-[#D63031]';
                  textColor = 'text-[#D63031]';
                  infoText = `⚠️ Đã vượt hạn mức! (đã chi ${Math.round(b.percentage)}%)`;
                } else if (isWarning) {
                  barColor = 'bg-[#D63031]';
                  textColor = 'text-[#D63031]';
                  infoText = `Sắp chạm hạn mức (${Math.round(b.percentage)}%)`;
                }

                return (
                  <View key={idx} className="bg-white p-5 rounded-2xl border border-slate-100/50 shadow-sm">
                    <View className="flex-row justify-between items-center mb-2">
                      <Text 
                        className="text-sm font-bold text-slate-800"
                        style={{ fontFamily: 'Manrope-Bold' }}
                      >
                        {b.title}
                      </Text>
                      <Text 
                        className="text-xs text-slate-500 font-bold"
                        style={{ fontFamily: 'HankenGrotesk-Bold' }}
                      >
                        {b.ratio}
                      </Text>
                    </View>

                    {/* Progress Bar */}
                    <View className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
                      <View 
                        style={{ width: `${Math.min(b.percentage, 100)}%` }}
                        className={`h-full rounded-full ${barColor}`}
                      />
                    </View>

                    {/* Warning / Safe text */}
                    <Text 
                      className={`text-[10px] font-bold ${textColor}`}
                      style={{ fontFamily: 'Manrope-Bold' }}
                    >
                      {infoText}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Recent Transactions List */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text 
              className="text-base font-bold text-slate-800"
              style={{ fontFamily: 'Manrope-Bold' }}
            >
              Giao dịch gần đây
            </Text>
            <TouchableOpacity onPress={gotoTransactionsList}>
              <Text 
                className="text-xs font-semibold text-teal-600"
                style={{ fontFamily: 'Manrope-SemiBold' }}
              >
                Xem tất cả
              </Text>
            </TouchableOpacity>
          </View>

          {/* Grouped Transaction Card */}
          <View className="bg-white rounded-3xl border border-slate-100/50 shadow-sm overflow-hidden">
            {displayTransactions.length === 0 ? (
              <View className="p-8 items-center justify-center">
                <Text 
                  className="text-slate-400 text-xs font-semibold text-center"
                  style={{ fontFamily: 'Manrope-SemiBold' }}
                >
                  Chưa có giao dịch nào trong tháng này.
                </Text>
              </View>
            ) : (
              displayTransactions.map((tx, idx) => {
                const { IconComponent, bgClass, colorClass } = getTxVisuals(tx.category || '', tx.type || '');
                const isExpense = tx.type === 'expense';
                const sign = isExpense ? '-' : '+';
                const amountColor = isExpense ? 'text-[#D63031]' : 'text-[#0D9488]';

                return (
                  <View key={tx.id || idx}>
                    <Pressable 
                      onPress={gotoTransactionsList}
                      className="p-4 flex-row items-center justify-between active:bg-slate-50"
                    >
                      <View className="flex-row items-center flex-1 mr-3">
                        <View className={`w-11 h-11 rounded-full items-center justify-center mr-3.5 ${bgClass}`}>
                          <IconComponent size={20} color={colorClass} />
                        </View>
                        <View className="flex-1">
                          <Text 
                            className="text-sm font-bold text-slate-800 mb-0.5"
                            style={{ fontFamily: 'Manrope-Bold' }}
                            numberOfLines={1}
                          >
                            {tx.note || tx.category}
                          </Text>
                          <Text 
                            className="text-[10px] text-slate-400 font-medium"
                            style={{ fontFamily: 'Manrope-Medium' }}
                          >
                            {tx.date || 'Giao dịch'}
                          </Text>
                        </View>
                      </View>

                      <Text 
                        className={`text-sm font-extrabold ${amountColor}`}
                        style={{ fontFamily: 'HankenGrotesk-Bold' }}
                      >
                        {sign}{tx.amount.toLocaleString('vi-VN')}
                      </Text>
                    </Pressable>
                    
                    {idx < displayTransactions.length - 1 && (
                      <View className="h-[1px] bg-slate-100 mx-4" />
                    )}
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      {/* Reusable Bottom Navigation Tab */}
      <AppBottomTab activeTab="home" />
    </SafeAreaView>
  );
}

// Refactored: style(dashboard): refresh summary card layout on home screen

// Refactored: style(dashboard): refresh summary card layout on home screen

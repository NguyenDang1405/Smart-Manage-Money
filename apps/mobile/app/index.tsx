import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, useWindowDimensions, Modal, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useUser } from '@clerk/clerk-expo';
import { Home as HomeIcon, PiggyBank, User, Wallet, Utensils, Car, DollarSign, ShoppingCart, Bot, Coffee, RefreshCw, FileText } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { apiClient, getAuthToken } from '../lib/http';
import AppBottomTab from '../components/AppBottomTab';
import { useTransactions } from '../context/TransactionsContext';
import QuickInputBar from '../components/QuickInputBar';
import TrendChart from '../components/TrendChart';
import CompareChart from '../components/CompareChart';

// ─── Sub-Component: Health Score Column ──────────────────────────────────
function HealthScoreCol({ score, label, color, savingsScore, budgetScore }: {
  score: number;
  label: string;
  color: string;
  savingsScore: number;
  budgetScore: number;
}) {
  const displayScore = score || 0;
  const displayLabel = label || 'Chưa đánh giá';
  const displayColor = color || '#cbd5e1'; // default grey

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      {/* Badge */}
      <View style={{ 
        backgroundColor: displayColor === '#cbd5e1' ? '#f1f5f9' : '#FEE2E2', 
        paddingHorizontal: 12, 
        paddingVertical: 4, 
        borderRadius: 12, 
        marginBottom: 8 
      }}>
        <Text style={{ 
          fontSize: 10, 
          color: displayColor === '#cbd5e1' ? '#64748b' : '#EF4444', 
          fontWeight: '800', 
          fontFamily: 'Manrope-Bold' 
        }}>
          {displayLabel}
        </Text>
      </View>

      {/* Circle Gauge */}
      <View style={{
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 6,
        borderColor: displayColor === '#16a34a' ? '#16a34a' : (displayColor === '#cbd5e1' ? '#e2e8f0' : '#EF4444'),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        shadowColor: displayColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#1e293b', fontFamily: 'HankenGrotesk-Bold', lineHeight: 22 }}>
          {displayScore}
        </Text>
        <Text style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium' }}>
          /100
        </Text>
      </View>

      {/* Factors */}
      <View style={{ width: '100%', gap: 6 }}>
        {/* Savings Rate */}
        <View style={{ width: '100%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <Text numberOfLines={1} style={{ fontSize: 9, color: '#64748b', fontFamily: 'Manrope-Medium', flex: 1 }}>
              Tỉ lệ tiết kiệm
            </Text>
            <Text style={{ fontSize: 9, fontWeight: '700', color: '#0d9488', fontFamily: 'Manrope-Bold' }}>
              {savingsScore}%
            </Text>
          </View>
          <View style={{ height: 4, width: '100%', backgroundColor: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${savingsScore}%`, backgroundColor: '#0D9488' }} />
          </View>
        </View>

        {/* Budget Adherence */}
        <View style={{ width: '100%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <Text numberOfLines={1} style={{ fontSize: 9, color: '#64748b', fontFamily: 'Manrope-Medium', flex: 1 }}>
              Tuân thủ ngân sách
            </Text>
            <Text style={{ fontSize: 9, fontWeight: '700', color: '#0d9488', fontFamily: 'Manrope-Bold' }}>
              {budgetScore}%
            </Text>
          </View>
          <View style={{ height: 4, width: '100%', backgroundColor: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${budgetScore}%`, backgroundColor: '#0D9488' }} />
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Sub-Component: Spending Bar Chart ────────────────────────────────────
function SpendingBarChart({ data }: { data: Array<{ name: string; amount: number }> }) {
  if (data.length === 0) {
    return (
      <View style={{ flex: 1, paddingRight: 5, minHeight: 150 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e293b', fontFamily: 'Manrope-Bold', marginBottom: 12 }}>
          Phân tích Chi tiêu
        </Text>
        <View style={{ 
          flex: 1, 
          alignItems: 'center', 
          justifyContent: 'center', 
          backgroundColor: '#f8fafc', 
          borderRadius: 16, 
          padding: 16, 
          borderStyle: 'dashed', 
          borderWidth: 1, 
          borderColor: '#e2e8f0',
          minHeight: 110
        }}>
          <Text style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium', textAlign: 'center' }}>
            Chưa có dữ liệu chi tiêu
          </Text>
        </View>
      </View>
    );
  }

  const chartData = data.slice(0, 4);
  while (chartData.length < 4) {
    chartData.push({ name: 'Khác', amount: 0 });
  }

  const maxVal = Math.max(...chartData.map(d => d.amount), 500000);
  const yTicks = [500, 400, 300, 200, 100, 0];

  return (
    <View style={{ flex: 1, paddingRight: 5 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e293b', fontFamily: 'Manrope-Bold', marginBottom: 12 }}>
        Phân tích Chi tiêu
      </Text>
      
      <View style={{ flexDirection: 'row', height: 120 }}>
        {/* Y-Axis */}
        <View style={{ justifyContent: 'space-between', paddingRight: 6, height: 110 }}>
          {yTicks.map((tick) => (
            <Text key={tick} style={{ fontSize: 8, color: '#94a3b8', fontFamily: 'Manrope-Medium', textAlign: 'right', width: 20 }}>
              {tick}
            </Text>
          ))}
        </View>

        {/* Bars Container */}
        <View style={{
          flex: 1,
          borderLeftWidth: 1,
          borderLeftColor: '#e2e8f0',
          borderBottomWidth: 1,
          borderBottomColor: '#e2e8f0',
          height: 110,
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-around',
          paddingBottom: 2,
        }}>
          {chartData.map((item, idx) => {
            const heightPct = maxVal > 0 ? (item.amount / maxVal) * 100 : 0;
            return (
              <View key={idx} style={{ alignItems: 'center', width: '20%', height: '100%', justifyContent: 'flex-end' }}>
                <View style={{
                  width: 16,
                  height: `${heightPct}%`,
                  backgroundColor: '#0D9488',
                  borderTopLeftRadius: 3,
                  borderTopRightRadius: 3,
                  minHeight: item.amount > 0 ? 3 : 0,
                }} />
              </View>
            );
          })}
        </View>
      </View>

      {/* X-Axis Labels */}
      <View style={{ flexDirection: 'row', paddingLeft: 26, justifyContent: 'space-around', marginTop: 4 }}>
        {chartData.map((item, idx) => (
          <Text key={idx} numberOfLines={1} style={{ fontSize: 8, color: '#64748b', fontFamily: 'Manrope-Medium', width: '22%', textAlign: 'center' }}>
            {item.name}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ─── Sub-Component: Month-to-Month Compare Table ──────────────────────────
function MonthlyCompareTable({ data }: { data: Array<{ name: string; current: number; prev: number }> }) {
  if (data.length === 0) {
    return (
      <View style={{ flex: 1.1, paddingHorizontal: 4, minHeight: 150 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e293b', fontFamily: 'Manrope-Bold', marginBottom: 12 }}>
          So sánh tháng trước
        </Text>
        <View style={{ 
          flex: 1, 
          alignItems: 'center', 
          justifyContent: 'center', 
          backgroundColor: '#f8fafc', 
          borderRadius: 16, 
          padding: 16, 
          borderStyle: 'dashed', 
          borderWidth: 1, 
          borderColor: '#e2e8f0',
          minHeight: 110
        }}>
          <Text style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium', textAlign: 'center' }}>
            Chưa có dữ liệu so sánh
          </Text>
        </View>
      </View>
    );
  }

  const tableData = data.slice(0, 4);

  const formatAmount = (val: number) => {
    return val.toLocaleString('vi-VN');
  };

  return (
    <View style={{ flex: 1.1, paddingHorizontal: 4 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e293b', fontFamily: 'Manrope-Bold', marginBottom: 12 }}>
        So sánh tháng trước
      </Text>

      {/* Header */}
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 6, marginBottom: 4 }}>
        <Text style={{ flex: 1.1, fontSize: 8, color: '#94a3b8', fontFamily: 'Manrope-Bold' }}></Text>
        <Text style={{ flex: 1, fontSize: 8, color: '#94a3b8', fontFamily: 'Manrope-Bold', textAlign: 'right' }}>Chi tiêu</Text>
        <Text style={{ flex: 1, fontSize: 8, color: '#94a3b8', fontFamily: 'Manrope-Bold', textAlign: 'right' }}>Tháng trước</Text>
      </View>

      {/* Rows */}
      {tableData.map((item, idx) => (
        <View key={idx} style={{
          flexDirection: 'row',
          paddingVertical: 5,
          borderBottomWidth: idx < tableData.length - 1 ? 1 : 0,
          borderBottomColor: '#f8fafc',
          alignItems: 'center',
        }}>
          <Text numberOfLines={1} style={{ flex: 1.1, fontSize: 9.5, color: '#475569', fontFamily: 'Manrope-Medium' }}>
            {item.name}
          </Text>
          <Text style={{ flex: 1, fontSize: 9.5, color: '#1e293b', fontFamily: 'HankenGrotesk-Bold', textAlign: 'right' }}>
            {formatAmount(item.current)}
          </Text>
          <Text style={{ flex: 1, fontSize: 9.5, color: '#dc2626', fontFamily: 'HankenGrotesk-Bold', textAlign: 'right' }}>
            {formatAmount(item.prev)}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Sub-Component: AI Tip Card ───────────────────────────────────────────
function AiTipCard({ text }: { text: string }) {
  return (
    <View style={{
      flex: 0.9,
      backgroundColor: '#F0F4F8',
      borderRadius: 16,
      padding: 12,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(226,232,240,0.8)',
    }}>
      <Text style={{ fontSize: 10, color: '#334155', fontFamily: 'Manrope-Medium', lineHeight: 16 }}>
        <Text style={{ fontWeight: '800', fontFamily: 'Manrope-Bold', color: '#0F766E' }}>AI Tip: </Text>
        {text}
      </Text>
    </View>
  );
}

// ─── Sub-Component: Detailed Category Spending Table (Screen 2) ───────────
function DetailedCategorySpending({ data, period }: {
  data: Array<{ categoryName: string; amount: number; percentage: number; color: string }>;
  period: string;
}) {
  const totalSpendingSum = data.reduce((acc, item) => acc + item.amount, 0);
  if (data.length === 0 || totalSpendingSum === 0) {
    return (
      <View style={{
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(226,232,240,0.8)',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 150,
      }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textAlign: 'center' }}>
          Không có phân tích chi tiêu chi tiết cho tháng {period}
        </Text>
      </View>
    );
  }

  const tableData = data;

  const getCategoryIcon = (category: string, color: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('ăn') || lower.includes('uống') || lower.includes('phở') || lower.includes('thực phẩm') || lower.includes('food')) {
      return { Icon: Utensils, bg: 'bg-emerald-50' };
    }
    if (lower.includes('di chuy') || lower.includes('grab') || lower.includes('xe') || lower.includes('taxi') || lower.includes('transport')) {
      return { Icon: Car, bg: 'bg-cyan-50' };
    }
    if (lower.includes('mua') || lower.includes('sắm') || lower.includes('shopping') || lower.includes('siêu thị')) {
      return { Icon: ShoppingCart, bg: 'bg-rose-50' };
    }
    if (lower.includes('nha') || lower.includes('ở') || lower.includes('điện') || lower.includes('nước') || lower.includes('hóa đơn') || lower.includes('bill')) {
      return { Icon: HomeIcon, bg: 'bg-amber-50' };
    }
    return { Icon: Coffee, bg: 'bg-purple-50' };
  };

  return (
    <View style={{
      backgroundColor: 'white',
      borderRadius: 24,
      padding: 20,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
      borderWidth: 1,
      borderColor: 'rgba(226,232,240,0.8)',
    }}>
      <Text style={{ fontSize: 15, fontWeight: '800', color: '#1e293b', fontFamily: 'Manrope-Bold', marginBottom: 16 }}>
        Phân tích Chi chi tiêu Chi tiết Tháng {period}
      </Text>

      {/* Table Header */}
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 8, marginBottom: 8 }}>
        <Text style={{ flex: 1.5, fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Bold' }}>Danh mục</Text>
        <Text style={{ flex: 1, fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Bold', textAlign: 'center' }}>Số tiền</Text>
        <Text style={{ flex: 0.8, fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Bold', textAlign: 'right' }}>% Tổng</Text>
      </View>

      {/* Table Rows */}
      {tableData.map((item, idx) => {
        const { Icon, bg } = getCategoryIcon(item.categoryName, item.color);
        return (
          <View key={idx} style={{
            flexDirection: 'row',
            paddingVertical: 10,
            borderBottomWidth: idx < tableData.length - 1 ? 1 : 0,
            borderBottomColor: '#f8fafc',
            alignItems: 'center',
          }}>
            {/* Category Column */}
            <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View className={bg} style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={14} color={item.color} />
              </View>
              <Text style={{ fontSize: 11.5, color: '#334155', fontFamily: 'Manrope-SemiBold' }}>
                {item.categoryName}
              </Text>
            </View>

            {/* Spent Column */}
            <Text style={{ flex: 1, fontSize: 11.5, color: '#dc2626', fontFamily: 'HankenGrotesk-Bold', textAlign: 'center' }}>
              -{item.amount.toLocaleString('vi-VN')}
            </Text>

            {/* Percentage Column */}
            <Text style={{ flex: 0.8, fontSize: 11.5, color: '#64748b', fontFamily: 'HankenGrotesk-Bold', textAlign: 'right' }}>
              {item.percentage}%
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── MAIN HOME SCREEN ─────────────────────────────────────────────────────
export default function Index() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width > 768;

  const { stats, userProfile, localAvatarOverride, fetchUserProfile } = useTransactions();
  const { user: clerkUser } = useUser();
  const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [prevReportData, setPrevReportData] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [prevDashboardData, setPrevDashboardData] = useState<any>(null);
  const [healthData, setHealthData] = useState<any>(null);

  const currentDateObj = new Date();
  const [month, setMonth] = useState(currentDateObj.getMonth() + 1);
  const [year, setYear] = useState(currentDateObj.getFullYear());
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // Generate last 12 months for picker modal
  const recentMonths = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date(currentDateObj.getFullYear(), currentDateObj.getMonth() - i, 1);
    return `${d.getMonth() + 1}/${d.getFullYear()}`;
  });

  const fetchAllReportData = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch current monthly report details
      const resCurrent = await apiClient.get(`/reports/monthly?month=${month}/${year}`, { headers });
      const currentReport = resCurrent.data?.data || resCurrent.data;
      setReportData(currentReport);

      // 2. Fetch current dashboard summary
      try {
        const resDash = await apiClient.get(`/dashboard/summary?month=${month}&year=${year}`, { headers });
        const dashData = resDash.data?.data || resDash.data;
        setDashboardData(dashData);
      } catch (err) {
        console.warn('Lỗi fetch dashboard summary:', err);
        setDashboardData(null);
      }

      // 3. Fetch previous month report and dashboard summary for comparison
      const prevM = month === 1 ? 12 : month - 1;
      const prevY = month === 1 ? year - 1 : year;
      try {
        const resPrev = await apiClient.get(`/reports/monthly?month=${prevM}/${prevY}`, { headers });
        setPrevReportData(resPrev.data?.data || resPrev.data);
      } catch (err) {
        console.warn('Lỗi fetch data tháng trước:', err);
        setPrevReportData(null);
      }

      try {
        const resPrevDash = await apiClient.get(`/dashboard/summary?month=${prevM}&year=${prevY}`, { headers });
        const prevDashData = resPrevDash.data?.data || resPrevDash.data;
        setPrevDashboardData(prevDashData);
      } catch (err) {
        console.warn('Lỗi fetch dashboard summary tháng trước:', err);
        setPrevDashboardData(null);
      }

      // 4. Fetch financial health score metrics
      try {
        const resHealth = await apiClient.get('/ai/health-score', { headers });
        setHealthData(resHealth.data?.data || resHealth.data);
      } catch (err) {
        console.warn('Lỗi fetch health score:', err);
        setHealthData(null);
      }

    } catch (e) {
      Alert.alert('Lỗi', 'Không thể lấy dữ liệu báo cáo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
    fetchAllReportData();
  }, [month, year]);

  const gotoTransactionsList = () => router.push('/transactions');
  const gotoBudgets = () => router.push('/budgets');
  const gotoGoals = () => router.push('/goals');
  const gotoAddTransaction = () => router.push('/add-transaction');

  // Dynamic values computation
  const { totalIncome, totalExpense, currentBalance } = stats || {
    totalIncome: 0,
    totalExpense: 0,
    currentBalance: 0,
  };

  const displayBalance = dashboardData !== null ? dashboardData.totalBalance : currentBalance;
  const displayIncome = dashboardData !== null ? dashboardData.totalIncomeMonth : totalIncome;
  const displayExpense = dashboardData !== null ? dashboardData.totalExpenseMonth : totalExpense;

  // Formatting balance to include '+' prefix if positive
  const formatBalance = (val: number) => {
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toLocaleString('vi-VN')}`;
  };

  // Processing Category spending arrays for visual components
  const spendingData = dashboardData !== null
    ? (dashboardData.categorySpending || []).map((c: any) => ({
        name: c.categoryName || c.name,
        amount: c.amount,
      }))
    : (reportData?.categorySpending || []).map((c: any) => ({
        name: c.name || c.categoryName,
        amount: c.amount,
      }));

  // Table spending data with percentage calculation
  const totalSpendingSum = spendingData.reduce((acc: number, c: { name: string; amount: number }) => acc + c.amount, 0);
  const colorsList = ['#0D9488', '#06B6D4', '#F43F5E', '#10B981', '#8B5CF6'];
  const detailedSpendingTableData = spendingData.map((c: { name: string; amount: number }, idx: number) => {
    const percentage = totalSpendingSum > 0 ? Math.round((c.amount / totalSpendingSum) * 100) : 0;
    return {
      categoryName: c.name,
      amount: c.amount,
      percentage,
      color: colorsList[idx % colorsList.length],
    };
  });

  // Comparing this month vs last month categories spending
  const currentSpendingMap = dashboardData?.categorySpending || reportData?.categorySpending || [];
  const prevSpendingMap = prevDashboardData?.categorySpending || prevReportData?.categorySpending || [];
  const mergedCats = Array.from(new Set([
    ...currentSpendingMap.map((c: any) => c.categoryName || c.name),
    ...prevSpendingMap.map((c: any) => c.categoryName || c.name),
  ]));

  const compareTableData = mergedCats.map((name) => {
    const currentVal = currentSpendingMap.find((c: any) => (c.categoryName || c.name) === name)?.amount || 0;
    const prevVal = prevSpendingMap.find((c: any) => (c.categoryName || c.name) === name)?.amount || 0;
    return { name, current: currentVal, prev: prevVal };
  }).sort((a, b) => b.current - a.current).slice(0, 3);

  // Dynamic AI Suggestions
  let aiAssistantTip = 'Hãy bắt đầu nhập giao dịch để tôi có thể hỗ trợ phân tích chi tiêu giúp bạn nhé!';
  if (spendingData.length > 0) {
    const topCatName = spendingData[0].name;
    if (topCatName.toLowerCase().includes('ăn') || topCatName.toLowerCase().includes('uống') || topCatName.toLowerCase().includes('thực phẩm')) {
      aiAssistantTip = 'Dựa trên chi tiêu, bạn nên giảm ăn ngoài!';
    } else {
      aiAssistantTip = `Dựa trên chi tiêu, bạn nên giảm chi tiêu cho mục ${topCatName}!`;
    }
  }

  let aiTipText = 'Hãy lập kế hoạch ngân sách và ghi chép giao dịch để nhận các mẹo tài chính hữu ích từ AI!';
  if (compareTableData.length > 0) {
    const increases = compareTableData.map(c => ({
      name: c.name,
      diff: c.current - c.prev,
    })).sort((a, b) => b.diff - a.diff);

    if (increases[0] && increases[0].diff > 0) {
      aiTipText = `Cân nhắc giảm chi tiêu cho mục ${increases[0].name}.`;
    } else {
      aiTipText = `Cân nhắc giảm chi tiêu cho mục ${compareTableData[0].name}.`;
    }
  }

  // Health factors values
  const healthScore = healthData?.score || 0;
  const healthLabel = healthData?.label || 'Chưa đánh giá';
  const healthColor = healthData?.color || '#cbd5e1';
  
  const savingsRate = healthData?.factors?.find((f: any) => f.key === 'savings')?.score || 0;
  const budgetCompliance = healthData?.factors?.find((f: any) => f.key === 'budget')?.score || 0;

  // Recent transactions list
  const displayTransactions = dashboardData !== null
    ? (dashboardData.recentTransactions || []).slice(0, 3).map((tx: any) => {
        const dateObj = new Date(tx.transactionDate || tx.createdAt);
        const isToday = dateObj.toDateString() === new Date().toDateString();
        const dateText = isToday 
          ? 'Hôm nay'
          : dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        return {
          id: tx.id.toString(),
          category: tx.category?.nameVi || tx.category?.name || tx.categoryName || 'Khác',
          note: tx.note || tx.category?.nameVi || tx.category?.name || 'Giao dịch',
          date: dateText,
          amount: Number(tx.amount),
          type: tx.type,
        };
      })
    : (reportData?.transactions || []).slice(0, 3).map((tx: any) => {
        const isToday = tx.date === new Date().toLocaleDateString('vi-VN');
        const dateText = isToday ? 'Hôm nay' : tx.date;
        return {
          id: tx.id.toString(),
          category: tx.categoryName,
          note: tx.note || tx.categoryName,
          date: dateText,
          amount: Number(tx.amount),
          type: tx.type,
        };
      });

  const getTxVisuals = (category: string, type: string) => {
    const lowerCat = category?.toLowerCase() || '';
    let IconComponent = Wallet;
    let bgClass = 'bg-teal-50';
    let colorClass = '#0D9488';

    if (lowerCat.includes('ăn') || lowerCat.includes('uống') || lowerCat.includes('phở') || lowerCat.includes('nhà hàng') || lowerCat.includes('thực phẩm') || lowerCat.includes('food')) {
      IconComponent = Utensils;
      bgClass = 'bg-emerald-50';
      colorClass = '#0D9488';
    } else if (lowerCat.includes('di chuy') || lowerCat.includes('grab') || lowerCat.includes('xe') || lowerCat.includes('taxi') || lowerCat.includes('transport')) {
      IconComponent = Car;
      bgClass = 'bg-cyan-50';
      colorClass = '#06B6D4';
    } else if (lowerCat.includes('lương') || lowerCat.includes('thu nhập') || type === 'income') {
      IconComponent = DollarSign;
      bgClass = 'bg-teal-50';
      colorClass = '#1A6B5A';
    } else if (lowerCat.includes('mua') || lowerCat.includes('sắm') || lowerCat.includes('shopping') || lowerCat.includes('siêu thị')) {
      IconComponent = ShoppingCart;
      bgClass = 'bg-rose-50';
      colorClass = '#D63031';
    } else if (lowerCat.includes('nha') || lowerCat.includes('ở') || lowerCat.includes('điện') || lowerCat.includes('nước') || lowerCat.includes('hóa đơn') || lowerCat.includes('bill')) {
      IconComponent = HomeIcon;
      bgClass = 'bg-amber-50';
      colorClass = '#10B981';
    }

    return { IconComponent, bgClass, colorClass };
  };

  // Create PDF function
  const generateHtml = (data: any) => {
    const formatCurrency = (val: number) => val.toLocaleString('vi-VN') + ' đ';

    const categoriesHtml = data.categorySpending && data.categorySpending.length > 0
      ? data.categorySpending.map((c: any) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #f1f5f9;">${c.name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #D63031; font-weight: bold;">${formatCurrency(c.amount)}</td>
        </tr>
      `).join('')
      : `<tr><td colspan="2" style="padding: 12px; text-align: center; color: #94a3b8;">Không có dữ liệu chi tiêu</td></tr>`;

    const transactionsHtml = data.transactions && data.transactions.length > 0
      ? data.transactions.map((t: any) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; color: #64748b;">${t.date}</td>
          <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-weight: 500;">${t.note || t.categoryName}</td>
          <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; color: #64748b;">${t.categoryName}</td>
          <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: bold; color: ${t.type === 'income' ? '#0D9488' : '#D63031'};">
            ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
          </td>
        </tr>
      `).join('')
      : `<tr><td colspan="4" style="padding: 12px; text-align: center; color: #94a3b8;">Không có giao dịch nào</td></tr>`;

    return `
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #334155; padding: 40px; margin: 0; background-color: #ffffff; }
            h1 { color: #0f172a; text-align: center; font-size: 28px; margin-bottom: 8px; }
            p.subtitle { text-align: center; color: #64748b; font-size: 16px; margin-top: 0; margin-bottom: 40px; }
            h2 { color: #0f172a; margin-top: 40px; margin-bottom: 16px; font-size: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
            th { background-color: #f8fafc; padding: 12px; text-align: left; font-weight: bold; color: #475569; border-bottom: 2px solid #e2e8f0; }
            .summary-box { display: flex; justify-content: space-between; background-color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; }
            .summary-item { text-align: center; flex: 1; }
            .summary-item:not(:last-child) { border-right: 1px solid #e2e8f0; }
            .summary-label { font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: bold; }
            .summary-value { font-size: 24px; font-weight: bold; margin-top: 8px; }
            .income { color: #0D9488; }
            .expense { color: #D63031; }
            .net { color: #0f172a; }
            .footer { margin-top: 60px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 20px; }
          </style>
        </head>
        <body>
          <h1>Báo Cáo Tài Chính</h1>
          <p class="subtitle">Tháng ${data.period}</p>
          <div class="summary-box">
            <div class="summary-item">
              <div class="summary-label">Tổng thu</div>
              <div class="summary-value income">${formatCurrency(data.totalIncome)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Tổng chi</div>
              <div class="summary-value expense">${formatCurrency(data.totalExpense)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Tích lũy</div>
              <div class="summary-value net">${formatCurrency(data.netSaving)}</div>
            </div>
          </div>
          <h2>Chi tiêu theo Hạng mục</h2>
          <table>
            <tr>
              <th>Hạng mục</th>
              <th style="text-align: right;">Số tiền</th>
            </tr>
            ${categoriesHtml}
          </table>
          <h2>Chi tiết Giao dịch</h2>
          <table>
            <tr>
              <th>Ngày</th>
              <th>Mô tả</th>
              <th>Hạng mục</th>
              <th style="text-align: right;">Số tiền</th>
            </tr>
            ${transactionsHtml}
          </table>
          <div class="footer">
            Báo cáo được tạo tự động bởi Smart Money Manager<br/>
            Ngày trích xuất: ${new Date().toLocaleDateString('vi-VN')}
          </div>
        </body>
      </html>
    `;
  };

  const sharePDF = async () => {
    if (!reportData) return;
    try {
      const html = generateHtml(reportData);
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Báo cáo tài chính Tháng ${month}/${year}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Lỗi', 'Thiết bị không hỗ trợ chia sẻ file');
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi tạo PDF');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F4F7F6]" edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* ═══ HEADER GRADIENT CARD ═══ */}
        <View
          style={{
            backgroundColor: '#0D9488',
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 60,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            shadowColor: '#0D9488',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {/* Greeting and Calendar Month Selector row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  borderWidth: 2,
                  borderColor: 'rgba(255,255,255,0.5)',
                  overflow: 'hidden',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {localAvatarOverride || userProfile?.avatarUrl || clerkUser?.imageUrl ? (
                  <Image
                    source={{ uri: localAvatarOverride || (userProfile?.avatarUrl ? (userProfile.avatarUrl.startsWith('http') ? userProfile.avatarUrl : `${baseUrl}${userProfile.avatarUrl}`) : clerkUser?.imageUrl) }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                    transition={150}
                  />
                ) : (
                  <Feather name="user" size={20} color="white" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontFamily: 'Manrope-Medium' }}>
                  Chào mừng trở lại!
                </Text>
                <Text
                  style={{ color: 'white', fontSize: 15, fontWeight: '700', fontFamily: 'Manrope-Bold' }}
                  numberOfLines={1}
                >
                  {userProfile?.fullName || clerkUser?.fullName || 'Nguyên Đặng'} 👋
                </Text>
              </View>
            </View>

            {/* Calendar Selector Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowMonthPicker(true)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.18)',
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 6,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.25)',
              }}
            >
              <Feather name="calendar" size={12} color="rgba(255,255,255,0.9)" />
              <Text style={{ color: 'white', fontSize: 11, fontWeight: '700', fontFamily: 'Manrope-Bold' }}>
                T{month}/{year}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Balance Area */}
          <View style={{ alignItems: 'center', paddingVertical: 4 }}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', fontFamily: 'Manrope-Bold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2, lineHeight: 16 }}>
              Số dư hiện tại
            </Text>
            <Text style={{ color: 'white', fontSize: 32, fontWeight: '900', fontFamily: 'HankenGrotesk-Bold', letterSpacing: -0.5, lineHeight: 38 }}>
              {formatBalance(displayBalance)}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600', fontFamily: 'Manrope-Bold', marginTop: 1, lineHeight: 18 }}>
              VND
            </Text>
          </View>
        </View>

        {/* ═══ FLOATING INCOME / EXPENSE CARD ═══ */}
        <View style={{ paddingHorizontal: 20, marginTop: -26, zIndex: 30 }}>
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: 20,
              padding: 16,
              paddingBottom: 16,
              flexDirection: 'row',
              shadowColor: '#0D9488',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 6,
              borderWidth: 1,
              borderColor: '#f1f5f9',
            }}
          >
            {/* Income */}
            <View style={{ flex: 1, alignItems: 'center' }}>
              <View style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                backgroundColor: '#d1fae5',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 6,
              }}>
                <Feather name="arrow-down-circle" size={18} color="#059669" />
              </View>
              <Text style={{ fontSize: 9, color: '#64748b', fontWeight: '600', fontFamily: 'Manrope-Bold', marginBottom: 2 }}>THU NHẬP</Text>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#059669', fontFamily: 'HankenGrotesk-Bold' }}>
                {displayIncome.toLocaleString('vi-VN')}
              </Text>
            </View>

            {/* Divider */}
            <View style={{ width: 1, backgroundColor: '#f1f5f9', marginHorizontal: 8 }} />

            {/* Expense */}
            <View style={{ flex: 1, alignItems: 'center' }}>
              <View style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                backgroundColor: '#fee2e2',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 6,
              }}>
                <Feather name="arrow-up-circle" size={18} color="#dc2626" />
              </View>
              <Text style={{ fontSize: 9, color: '#64748b', fontWeight: '600', fontFamily: 'Manrope-Bold', marginBottom: 2 }}>CHI TIÊU</Text>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#dc2626', fontFamily: 'HankenGrotesk-Bold' }}>
                {displayExpense.toLocaleString('vi-VN')}
              </Text>
            </View>
          </View>

          {/* ═══ AI CHAT BUBBLE - below income/expense card ═══ */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 10,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Robot Avatar */}
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: 'white',
                borderWidth: 1.5,
                borderColor: '#E2E8F0',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 3,
                elevation: 2,
              }}>
                <Bot size={16} color="#4F46E5" />
              </View>

              {/* Speech Bubble */}
              <View style={{
                backgroundColor: '#EDE9FE',
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 7,
                paddingLeft: 18,
                marginLeft: -10,
                borderWidth: 1,
                borderColor: '#E0DBFC',
                shadowColor: '#4F46E5',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 1,
              }}>
                <Text style={{ fontSize: 11, color: '#4F46E5', fontFamily: 'Manrope-Medium' }}>
                  <Text style={{ fontWeight: '700', fontFamily: 'Manrope-Bold' }}>Trợ lý: </Text>
                  {aiAssistantTip}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ═══ CONTENT AREA ═══ */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          {/* AI Quick Input Bar */}
          <QuickInputBar />

          {/* ─── Phân tích Chuyên sâu & Mẹo card ─── */}
          <View style={{ marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b', fontFamily: 'Manrope-Bold' }}>
                Phân tích Chuyên sâu & Mẹo
              </Text>
              <Text style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 2 }}>
                Cập nhật: {reportData ? currentDateObj.toLocaleDateString('vi-VN') : '18/6/2026'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 6 }}>
              {/* PDF Action */}
              <TouchableOpacity
                onPress={sharePDF}
                disabled={loading || !reportData}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: 'white',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  opacity: loading || !reportData ? 0.5 : 1,
                }}
              >
                <FileText size={16} color="#0D9488" />
              </TouchableOpacity>
              
              {/* Refresh Action */}
              <TouchableOpacity
                onPress={fetchAllReportData}
                disabled={loading}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: 'white',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#64748b" />
                ) : (
                  <RefreshCw size={14} color="#64748b" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* The Multi-Column Panel */}
          <View style={{
            backgroundColor: 'white',
            borderRadius: 24,
            padding: 20,
            borderWidth: 1,
            borderColor: 'rgba(226,232,240,0.8)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
            marginBottom: 24,
          }}>
            {isWide ? (
              <View style={{ flexDirection: 'row', gap: 16 }}>
                {/* Column 1: Health Score */}
                <View style={{ flex: 1 }}>
                  <HealthScoreCol
                    score={healthScore}
                    label={healthLabel}
                    color={healthColor}
                    savingsScore={savingsRate}
                    budgetScore={budgetCompliance}
                  />
                </View>

                <View style={{ width: 1, backgroundColor: '#f1f5f9' }} />

                {/* Column 2: Bar Chart */}
                <View style={{ flex: 1.1 }}>
                  <SpendingBarChart data={spendingData} />
                </View>

                <View style={{ width: 1, backgroundColor: '#f1f5f9' }} />

                {/* Column 3: Comparison Table */}
                <View style={{ flex: 1.2 }}>
                  <MonthlyCompareTable data={compareTableData} />
                </View>

                <View style={{ width: 1, backgroundColor: '#f1f5f9' }} />

                {/* Column 4: AI Tip Card */}
                <View style={{ flex: 0.8 }}>
                  <AiTipCard text={aiTipText} />
                </View>
              </View>
            ) : (
              <View style={{ gap: 20 }}>
                {/* Health Score */}
                <HealthScoreCol
                  score={healthScore}
                  label={healthLabel}
                  color={healthColor}
                  savingsScore={savingsRate}
                  budgetScore={budgetCompliance}
                />
                
                <View style={{ height: 1, backgroundColor: '#f1f5f9' }} />

                {/* Spending Chart */}
                <SpendingBarChart data={spendingData} />

                <View style={{ height: 1, backgroundColor: '#f1f5f9' }} />

                {/* Comparison Table */}
                <MonthlyCompareTable data={compareTableData} />

                <View style={{ height: 1, backgroundColor: '#f1f5f9' }} />

                {/* AI Tip Card */}
                <AiTipCard text={aiTipText} />
              </View>
            )}
          </View>

          {/* ─── QUICK ACTION CARDS (Screen 2) ─── */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            {/* Giao dịch Card */}
            <Pressable
              onPress={gotoTransactionsList}
              style={{
                flex: 1,
                backgroundColor: '#0D9488',
                borderRadius: 20,
                padding: 16,
                minHeight: 110,
                justifyContent: 'space-between',
                shadowColor: '#0D9488',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View style={{ width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="view-list" size={20} color="white" />
              </View>
              <View>
                <Text style={{ color: 'white', fontSize: 13, fontWeight: '700', fontFamily: 'Manrope-Bold' }}>Giao dịch</Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontFamily: 'Manrope-Medium', marginTop: 2 }}>Lịch sử chi tiêu</Text>
              </View>
            </Pressable>

            {/* Ngân sách Card */}
            <Pressable
              onPress={gotoBudgets}
              style={{
                flex: 1,
                backgroundColor: 'white',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 20,
                padding: 16,
                minHeight: 110,
                justifyContent: 'space-between',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <View style={{ width: 36, height: 36, backgroundColor: '#F0FDF4', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="wallet-membership" size={20} color="#0D9488" />
              </View>
              <View>
                <Text style={{ color: '#1e293b', fontSize: 13, fontWeight: '700', fontFamily: 'Manrope-Bold' }}>Ngân sách</Text>
                <Text style={{ color: '#94a3b8', fontSize: 10, fontFamily: 'Manrope-Medium', marginTop: 2 }}>Quản lý hạn mức</Text>
              </View>
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
            {/* Mục tiêu Card */}
            <Pressable
              onPress={gotoGoals}
              style={{
                flex: 1,
                backgroundColor: '#6366F1',
                borderRadius: 20,
                padding: 16,
                minHeight: 110,
                justifyContent: 'space-between',
                shadowColor: '#6366F1',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View style={{ width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="target" size={20} color="white" />
              </View>
              <View>
                <Text style={{ color: 'white', fontSize: 13, fontWeight: '700', fontFamily: 'Manrope-Bold' }}>Mục tiêu</Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontFamily: 'Manrope-Medium', marginTop: 2 }}>Kế hoạch tài chính</Text>
              </View>
            </Pressable>

            {/* Thêm mới Card */}
            <Pressable
              onPress={gotoAddTransaction}
              style={{
                flex: 1,
                backgroundColor: 'white',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 20,
                padding: 16,
                minHeight: 110,
                justifyContent: 'space-between',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <View style={{ width: 36, height: 36, backgroundColor: '#F5F3FF', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="plus-circle" size={20} color="#6366F1" />
              </View>
              <View>
                <Text style={{ color: '#1e293b', fontSize: 13, fontWeight: '700', fontFamily: 'Manrope-Bold' }}>Thêm mới</Text>
                <Text style={{ color: '#94a3b8', fontSize: 10, fontFamily: 'Manrope-Medium', marginTop: 2 }}>Ghi giao dịch</Text>
              </View>
            </Pressable>
          </View>

          {/* ─── TREND LINE CHART ─── */}
          <TrendChart />

          {/* ─── COMPARE BAR CHART ─── */}
          <CompareChart />

          {/* ─── DETAILED CATEGORY SPENDING TABLE ─── */}
          <DetailedCategorySpending data={detailedSpendingTableData} period={`${month}/${year}`} />

          {/* ─── RECENT TRANSACTIONS ─── */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1e293b', fontFamily: 'Manrope-Bold' }}>
                Giao dịch gần đây
              </Text>
              <TouchableOpacity onPress={gotoTransactionsList}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#0d9488', fontFamily: 'Manrope-SemiBold' }}>Xem tất cả</Text>
              </TouchableOpacity>
            </View>

            <View style={{
              backgroundColor: 'white',
              borderRadius: 20,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 2,
              borderWidth: 1,
              borderColor: 'rgba(226,232,240,0.8)',
            }}>
              {displayTransactions.length === 0 ? (
                <View style={{ padding: 32, alignItems: 'center' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '600', textAlign: 'center', fontFamily: 'Manrope-SemiBold' }}>
                    Chưa có giao dịch nào trong tháng này.
                  </Text>
                </View>
              ) : (
                displayTransactions.map((tx: any, idx: number) => {
                  const { IconComponent, bgClass, colorClass } = getTxVisuals(tx.category || '', tx.type || '');
                  const isExpense = tx.type === 'expense';
                  const sign = isExpense ? '-' : '+';
                  const amountColor = isExpense ? '#dc2626' : '#059669';

                  return (
                    <View key={tx.id || idx}>
                      <Pressable
                        onPress={gotoTransactionsList}
                        style={({ pressed }) => ({
                          padding: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: pressed ? '#f8fafc' : 'transparent',
                        })}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
                          <View
                            className={bgClass}
                            style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
                          >
                            <IconComponent size={18} color={colorClass} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b', fontFamily: 'Manrope-Bold', marginBottom: 2 }} numberOfLines={1}>
                              {tx.note || tx.category}
                            </Text>
                            <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '500', fontFamily: 'Manrope-Medium' }}>
                              {tx.date || 'Giao dịch'}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: amountColor, fontFamily: 'HankenGrotesk-Bold' }}>
                          {sign}{tx.amount.toLocaleString('vi-VN')}
                        </Text>
                      </Pressable>
                      {idx < displayTransactions.length - 1 && (
                        <View style={{ height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 16 }} />
                      )}
                    </View>
                  );
                })
              )}
            </View>
          </View>

        </View>
      </ScrollView>

      {/* ═══ MONTH SELECTION MODAL ═══ */}
      <Modal
        visible={showMonthPicker}
        transparent={true}
        animationType="fade"
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e293b', fontFamily: 'Manrope-Bold' }}>
                Chọn tháng báo cáo
              </Text>
              <TouchableOpacity onPress={() => setShowMonthPicker(false)}>
                <Feather name="x" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300 }}>
              {recentMonths.map((mStr) => {
                const [mVal, yVal] = mStr.split('/').map(Number);
                const isSelected = month === mVal && year === yVal;
                return (
                  <TouchableOpacity
                    key={mStr}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      marginBottom: 8,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: isSelected ? '#F0FDF4' : 'white',
                    }}
                    onPress={() => {
                      setMonth(mVal);
                      setYear(yVal);
                      setShowMonthPicker(false);
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        color: isSelected ? '#0D9488' : '#475569',
                        fontWeight: isSelected ? '700' : '500',
                        fontFamily: isSelected ? 'Manrope-Bold' : 'Manrope-Medium',
                      }}
                    >
                      Tháng {mStr}
                    </Text>
                    {isSelected && (
                      <Feather name="check" size={18} color="#0D9488" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bottom Tab navigation */}
      <AppBottomTab activeTab="home" />
    </SafeAreaView>
  );
}

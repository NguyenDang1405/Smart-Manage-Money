import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import Papa from 'papaparse';
import { apiPost, apiClient, getAuthToken } from '../lib/http';
import {
  ArrowLeft,
  FileUp,
  Plus,
  ShoppingCart,
  AlertTriangle,
  Wallet,
  Coffee,
} from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// ─── Types ────────────────────────────────────────────────────
type ImportTransaction = {
  id: string;
  name: string;
  date: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  hasError?: boolean;
  hasWarning?: boolean;
  errorMessage?: string;
};

// ─── Mock Data ────────────────────────────────────────────────
const MOCK_TRANSACTIONS: ImportTransaction[] = [
  {
    id: '1',
    name: 'Siêu thị Winmart',
    date: '24/05/2024',
    category: 'Mua sắm',
    amount: 450000,
    type: 'expense',
  },
  {
    id: '2',
    name: 'Chuyển tiền Momo',
    date: '25/05/2024',
    category: '',
    amount: 2100000,
    type: 'expense',
    hasError: true,
    errorMessage: 'Thiếu danh mục chi tiêu',
  },
  {
    id: '3',
    name: 'Lương tháng 5',
    date: '25/05/2024',
    category: 'Thu nhập',
    amount: 25000000,
    type: 'income',
  },
  {
    id: '4',
    name: 'The Coffee House',
    date: '26/05/2024',
    category: 'Ăn uống',
    amount: 65000,
    type: 'expense',
  },
];

// ─── Stepper Component ───────────────────────────────────────
const STEPS = [
  { label: 'Upload', step: 1 },
  { label: 'Review', step: 2 },
  { label: 'Finish', step: 3 },
];

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <View className="flex-row items-center justify-center px-6 py-4">
      {STEPS.map((s, i) => {
        const isCompleted = s.step < currentStep;
        const isCurrent = s.step === currentStep;
        const isPending = s.step > currentStep;

        return (
          <React.Fragment key={s.step}>
            {/* Connector Line (before step, except first) */}
            {i > 0 && (
              <View
                className={`flex-1 h-[2px] ${
                  isCompleted || isCurrent ? 'bg-[#1B5E4B]' : 'bg-slate-200'
                }`}
              />
            )}

            {/* Step Circle + Label */}
            <View className="items-center">
              <View
                className={`w-8 h-8 rounded-full items-center justify-center ${
                  isCompleted
                    ? 'bg-[#1B5E4B]'
                    : isCurrent
                    ? 'bg-[#1B5E4B]'
                    : 'bg-slate-200'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isPending ? 'text-slate-500' : 'text-white'
                  }`}
                >
                  {s.step}
                </Text>
              </View>
              <Text
                className={`text-xs mt-1 font-medium ${
                  isCurrent
                    ? 'text-[#1B5E4B] font-bold'
                    : isCompleted
                    ? 'text-[#1B5E4B]'
                    : 'text-slate-400'
                }`}
              >
                {s.label}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─── Transaction Row Component ────────────────────────────────
function TransactionRow({ item, isLast }: { item: ImportTransaction; isLast: boolean }) {
  const isError = item.hasError;
  const isWarning = item.hasWarning;
  const isIncome = item.type === 'income';

  const getIcon = () => {
    if (isError || isWarning) return AlertTriangle;
    if (isIncome) return Wallet;
    if (item.category?.includes('Ăn uống')) return Coffee;
    return ShoppingCart;
  };
  const IconComponent = getIcon();

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      const formatted = (amount / 1000).toLocaleString('vi-VN');
      return `${formatted}k`;
    }
    if (amount >= 1000) {
      const formatted = (amount / 1000).toLocaleString('vi-VN');
      return `${formatted}k`;
    }
    return amount.toLocaleString('vi-VN');
  };

  return (
    <View
      className={`flex-row items-center p-4 ${
        isError
          ? 'border border-[#D63031] rounded-xl bg-white mx-1 my-1'
          : isWarning
          ? 'border border-amber-500 rounded-xl bg-white mx-1 my-1'
          : !isLast
          ? 'border-b border-slate-100'
          : ''
      }`}
    >
      {/* Icon */}
      <View
        className={`w-11 h-11 rounded-full items-center justify-center mr-3 ${
          isError ? 'bg-red-50' : isWarning ? 'bg-amber-50' : isIncome ? 'bg-emerald-50' : 'bg-emerald-50'
        }`}
      >
        <IconComponent
          size={20}
          color={isError ? '#D63031' : isWarning ? '#F59E0B' : '#1B5E4B'}
        />
      </View>

      {/* Info */}
      <View className="flex-1 mr-3">
        <Text className="text-sm font-semibold text-slate-800" numberOfLines={1}>
          {item.name}
        </Text>
        {isError ? (
          <Text className="text-xs text-[#D63031] font-medium mt-0.5">
            {item.errorMessage}
          </Text>
        ) : isWarning ? (
          <Text className="text-xs text-amber-600 font-medium mt-0.5">
            {item.errorMessage}
          </Text>
        ) : (
          <Text className="text-xs text-slate-400 mt-0.5">
            {item.date} • {item.category}
          </Text>
        )}
      </View>

      {/* Amount */}
      <Text
        className={`text-sm font-bold ${
          isError
            ? 'text-[#D63031]'
            : isWarning
            ? 'text-amber-600'
            : isIncome
            ? 'text-[#1B5E4B]'
            : 'text-[#D63031]'
        }`}
      >
        {isIncome ? '+' : '-'}
        {formatAmount(item.amount)}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────
export default function ImportDataScreen() {
  const router = useRouter();
  const [fileSelected, setFileSelected] = useState(false);
  const [fileAsset, setFileAsset] = useState<any>(null);
  const [transactions, setTransactions] = useState<ImportTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const errorCount = transactions.filter((t) => t.hasError).length;
  const validCount = transactions.length - errorCount;
  const currentStep = fileSelected ? 2 : 1;

  const fetchBudgets = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return [];
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const res = await apiClient.get(`/budgets/summary?month=${month}&year=${year}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data?.data?.categories || [];
    } catch (error) {
      console.warn("Lỗi fetch budget summary ở Import:", error);
      return [];
    }
  };

  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setFileAsset(asset);
        setFileSelected(true);
        setIsLoading(true);

        try {
          const budgets = await fetchBudgets();
          const budgetSpentMap: Record<string, number> = {};
          budgets.forEach((b: any) => {
            budgetSpentMap[b.categoryName] = b.spentAmount;
          });

          const res = await fetch(asset.uri);
          const text = await res.text();

          Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: (parsedResult) => {
              const previewData: ImportTransaction[] = [];
              
              parsedResult.data.forEach((row: any, index: number) => {
                const amount = parseFloat(row.amount || "0");
                let hasError = false;
                let hasWarning = false;
                let errorMessage = "";

                if (isNaN(amount) || amount === 0) {
                  hasError = true;
                  errorMessage = "Số tiền không hợp lệ";
                }

                const name = row.note || row.description || "Giao dịch";
                const category = row.category || "Khác";
                const rawType = (row.type || "expense").toLowerCase();
                const type = rawType === "income" ? "income" : "expense";
                const date = row.date || new Date().toLocaleDateString('en-GB');

                // Ngân sách / Hạn mức mapping
                if (type === 'expense' && !hasError) {
                  const budget = budgets.find((b: any) => b.categoryName.toLowerCase() === category.toLowerCase());
                  if (budget) {
                    const newSpent = (budgetSpentMap[budget.categoryName] || 0) + amount;
                    budgetSpentMap[budget.categoryName] = newSpent; // accumulate local spent
                    
                    if (newSpent > budget.budgetAmount) {
                      hasWarning = true;
                      errorMessage = `Vượt ngân sách ${category} (${budget.budgetAmount.toLocaleString('vi-VN')} đ)`;
                    } else if (newSpent >= budget.budgetAmount * 0.8) {
                      hasWarning = true;
                      errorMessage = `Sắp chạm hạn mức ${category}`;
                    }
                  }
                }

                previewData.push({
                  id: `row-${index}`,
                  name,
                  date,
                  category,
                  amount,
                  type,
                  hasError,
                  hasWarning,
                  errorMessage,
                });
              });

              setTransactions(previewData);
              setIsLoading(false);
            },
            error: (err: any) => {
              setIsLoading(false);
              Alert.alert('Lỗi', 'Không thể đọc nội dung file CSV');
            }
          });
        } catch (err: any) {
          setIsLoading(false);
          Alert.alert('Lỗi', 'Đã xảy ra sự cố khi đọc file');
        }
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chọn file');
    }
  };

  const uploadFile = async () => {
    if (!fileAsset) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      
      if (Platform.OS === 'web' && fileAsset.file) {
        formData.append('file', fileAsset.file);
      } else {
        formData.append('file', {
          uri: fileAsset.uri,
          name: fileAsset.name,
          type: fileAsset.mimeType || 'text/csv',
        } as any);
      }

      const response: any = await apiPost('/transactions/import', formData);
      setIsLoading(false);
      Alert.alert('Thành công', `Đã nhập ${response.successCount} giao dịch hợp lệ.`);
      router.back();
    } catch (err: any) {
      setIsLoading(false);
      Alert.alert('Lỗi', err.message || 'Không thể upload file');
    }
  };

  const handleImport = () => {
    if (errorCount > 0) {
      Alert.alert(
        'Có lỗi dữ liệu',
        `Có ${errorCount} giao dịch bị lỗi trong bản xem trước. Server sẽ tự động bỏ qua các giao dịch này. Nhập ${validCount} giao dịch hợp lệ?`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Nhập giao dịch hợp lệ',
            onPress: uploadFile,
          },
        ]
      );
    } else {
      uploadFile();
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F4F7F6]">
      {/* ── Header ── */}
      <View className="flex-row items-center justify-between px-5 py-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center"
          accessibilityLabel="Quay lại"
        >
          <ArrowLeft size={22} color="#1B5E4B" />
        </TouchableOpacity>

        <Text className="text-lg font-bold text-slate-800">Import dữ liệu</Text>

        {/* Avatar placeholder */}
        <View className="w-9 h-9 rounded-full bg-emerald-100 items-center justify-center overflow-hidden">
          <Text className="text-xs font-bold text-[#1B5E4B]">U</Text>
        </View>
      </View>

      {/* ── Stepper ── */}
      <Stepper currentStep={currentStep} />

      {/* ── Scrollable Content ── */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 140, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Upload Card ── */}
        <Card className="border-0 shadow-sm mb-5">
          <CardContent className="items-center py-6">
            {/* Upload Icon */}
            <View className="w-16 h-16 rounded-full bg-emerald-50 items-center justify-center mb-4">
              <FileUp size={28} color="#1B5E4B" />
            </View>

            <Text className="text-base font-bold text-[#1B5E4B] mb-2">
              Tải tệp lên
            </Text>

            <Text className="text-xs text-slate-400 text-center leading-5 mb-4 px-2">
              Nhấn để chọn file CSV hoặc .xlsx để bắt đầu quá trình xử lý dữ liệu
              của bạn.
            </Text>

            <Button
              onPress={handleSelectFile}
              className="bg-[#1B5E4B] rounded-lg px-6"
              disabled={isLoading}
            >
              <Plus size={16} color="white" />
              <Text className="text-white text-sm font-semibold ml-1">
                {isLoading ? 'Đang đọc file...' : fileSelected ? 'Chọn file khác' : 'Chọn file'}
              </Text>
            </Button>
          </CardContent>
        </Card>

        {/* ── Data Preview Section ── */}
        {fileSelected && (
          <View className="mb-4">
          {/* Section Header */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-bold text-slate-800">
              Xem trước dữ liệu
            </Text>

            {/* Badge */}
            <View className="bg-emerald-50 px-3 py-1 rounded-full">
              <Text className="text-xs font-semibold text-[#1B5E4B]">
                {transactions.length} Giao dịch
              </Text>
            </View>
          </View>

          {/* Transaction List Card */}
          <Card className="border-0 shadow-sm overflow-hidden p-0">
            {transactions.map((tx, index) => (
              <TransactionRow
                key={tx.id}
                item={tx}
                isLast={index === transactions.length - 1}
              />
            ))}
          </Card>
        </View>
        )}
      </ScrollView>

      {/* ── Sticky Bottom Action Bar ── */}
      {fileSelected && (
        <View
          className="absolute bottom-0 left-0 right-0 bg-white px-5 pt-3 pb-6 border-t border-slate-100"
          style={Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
            },
            android: { elevation: 8 },
          })}
        >
          <Button
            onPress={handleImport}
            disabled={isLoading || validCount === 0}
            className="bg-[#1B5E4B] rounded-full h-12 w-full mb-2"
          >
            <Text className="text-white text-base font-bold">
              {isLoading ? 'Đang xử lý...' : `Nhập ${validCount} giao dịch`}
            </Text>
          </Button>

          <Button
            variant="ghost"
            onPress={handleCancel}
            className="h-10 w-full"
          >
            <Text className="text-slate-400 text-sm font-medium">Hủy bỏ</Text>
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
}

// Refactored: chore(uploads): add logs for CSV parsing errors

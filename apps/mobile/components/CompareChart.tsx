import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, ActivityIndicator, Modal, ScrollView } from "react-native";
import { Text } from "@/components/ui/text";
import { BarChart } from "react-native-gifted-charts";
import { apiClient, getAuthToken } from "../lib/http";
import { Feather } from "@expo/vector-icons";

export default function CompareChart() {
  const currentDate = new Date();
  
  // Default: compare last month (m1) with current month (m2)
  const defaultM1 = `${currentDate.getMonth() === 0 ? 12 : currentDate.getMonth()}/${currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear()}`;
  const defaultM2 = `${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;

  const [m1, setM1] = useState(defaultM1);
  const [m2, setM2] = useState(defaultM2);
  const [loading, setLoading] = useState(true);
  const [compareData, setCompareData] = useState<any>(null);

  const [showPicker, setShowPicker] = useState<"m1" | "m2" | null>(null);

  // Generate last 12 months for picker
  const recentMonths = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    return `${d.getMonth() + 1}/${d.getFullYear()}`;
  });

  const fetchCompareData = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await apiClient.get(`/dashboard/compare?m1=${m1}&m2=${m2}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data?.data || response.data;
      if (data && data.m1 && data.m2) {
        setCompareData(data);
      }
    } catch (error) {
      console.warn("Lỗi fetch compare data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompareData();
  }, [m1, m2]);

  const formatYAxis = (val: number | string) => {
    const num = Number(val);
    if (isNaN(num)) return String(val);
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + ' tỷ';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + ' tr';
    if (num >= 1000) return (num / 1000).toFixed(0) + ' k';
    return num.toString();
  };

  let barData: any[] = [];
  if (compareData) {
    barData = [
      {
        value: compareData.m1.income,
        label: 'Thu',
        spacing: 2,
        labelWidth: 30,
        labelTextStyle: { color: 'gray', fontFamily: 'Manrope-Medium', fontSize: 11 },
        frontColor: '#81E6D9',
        topLabelComponent: () => (
          <Text className="text-[8px] text-slate-400 mb-1" style={{ fontFamily: 'Manrope-Medium' }}>{compareData.m1.label}</Text>
        ),
      },
      {
        value: compareData.m2.income,
        frontColor: '#0D9488',
        topLabelComponent: () => (
          <Text className="text-[8px] text-[#0D9488] mb-1 font-bold" style={{ fontFamily: 'Manrope-Bold' }}>{compareData.m2.label}</Text>
        ),
      },
      {
        value: compareData.m1.expense,
        label: 'Chi',
        spacing: 2,
        labelWidth: 30,
        labelTextStyle: { color: 'gray', fontFamily: 'Manrope-Medium', fontSize: 11 },
        frontColor: '#FC8181',
        topLabelComponent: () => (
          <Text className="text-[8px] text-slate-400 mb-1" style={{ fontFamily: 'Manrope-Medium' }}>{compareData.m1.label}</Text>
        ),
      },
      {
        value: compareData.m2.expense,
        frontColor: '#D63031',
        topLabelComponent: () => (
          <Text className="text-[8px] text-[#D63031] mb-1 font-bold" style={{ fontFamily: 'Manrope-Bold' }}>{compareData.m2.label}</Text>
        ),
      }
    ];
  }

  const renderPercentageChange = (value: number, type: 'income' | 'expense') => {
    if (value === 0) return null;
    
    // For Income: Positive is good (green), Negative is bad (red)
    // For Expense: Positive is bad (red), Negative is good (green)
    const isIncrease = value > 0;
    const isGood = type === 'income' ? isIncrease : !isIncrease;
    
    const colorClass = isGood ? 'text-teal-600 bg-teal-50' : 'text-red-600 bg-red-50';
    const iconName = isIncrease ? 'trending-up' : 'trending-down';
    const iconColor = isGood ? '#0D9488' : '#D63031';

    return (
      <View className={`flex-row items-center px-2 py-1 rounded-full ${colorClass}`}>
        <Feather name={iconName} size={12} color={iconColor} />
        <Text 
          className={`text-[10px] font-bold ml-1`} 
          style={{ fontFamily: 'Manrope-Bold', color: iconColor }}
        >
          {Math.abs(value).toFixed(1)}%
        </Text>
      </View>
    );
  };

  return (
    <View className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100/50 mb-6">
      <View className="flex-row items-center justify-between mb-4">
        <Text 
          className="text-base font-bold text-slate-800"
          style={{ fontFamily: 'Manrope-Bold' }}
        >
          So sánh tháng
        </Text>
      </View>

      {/* Month Selectors */}
      <View className="flex-row items-center justify-center gap-4 mb-6">
        <TouchableOpacity 
          className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl flex-row items-center gap-2"
          onPress={() => setShowPicker("m1")}
        >
          <Text className="text-sm font-semibold text-slate-600" style={{ fontFamily: 'Manrope-SemiBold' }}>
            {m1}
          </Text>
          <Feather name="chevron-down" size={14} color="#64748B" />
        </TouchableOpacity>
        
        <Text className="text-slate-400 font-bold" style={{ fontFamily: 'Manrope-Bold' }}>VS</Text>

        <TouchableOpacity 
          className="bg-teal-50 border border-teal-100 px-3 py-2 rounded-xl flex-row items-center gap-2"
          onPress={() => setShowPicker("m2")}
        >
          <Text className="text-sm font-bold text-teal-700" style={{ fontFamily: 'Manrope-Bold' }}>
            {m2}
          </Text>
          <Feather name="chevron-down" size={14} color="#0F766E" />
        </TouchableOpacity>
      </View>

      {/* Changes Summary */}
      {!loading && compareData && (
        <View className="flex-row justify-around border-t border-b border-slate-50 py-3 mb-6">
          <View className="items-center">
            <Text className="text-xs text-slate-400 font-medium mb-1" style={{ fontFamily: 'Manrope-Medium' }}>Thu nhập</Text>
            {renderPercentageChange(compareData.changes.incomePercentage, 'income')}
          </View>
          <View className="w-[1px] bg-slate-100" />
          <View className="items-center">
            <Text className="text-xs text-slate-400 font-medium mb-1" style={{ fontFamily: 'Manrope-Medium' }}>Chi tiêu</Text>
            {renderPercentageChange(compareData.changes.expensePercentage, 'expense')}
          </View>
        </View>
      )}

      {/* Chart View */}
      <View className="items-center justify-center py-2 min-h-[220px]">
        {loading ? (
          <ActivityIndicator size="small" color="#0D9488" />
        ) : !compareData ? (
          <Text className="text-slate-400 text-xs font-semibold" style={{ fontFamily: 'Manrope-SemiBold' }}>
            Không có dữ liệu
          </Text>
        ) : (
          <View style={{ marginLeft: -15 }}>
            <BarChart
              data={barData}
              barWidth={28}
              spacing={35}
              roundedTop
              xAxisThickness={0}
              yAxisThickness={0}
              yAxisTextStyle={{ color: '#94A3B8', fontSize: 10, fontFamily: 'Manrope-Medium' }}
              noOfSections={4}
              formatYLabel={formatYAxis}
              yAxisColor="#E2E8F0"
              xAxisColor="#E2E8F0"
              hideRules={false}
              rulesColor="#F1F5F9"
              rulesType="solid"
            />
          </View>
        )}
      </View>

      {/* Legend */}
      <View className="flex-row items-center justify-center gap-5 mt-4">
        <View className="flex-row items-center gap-1.5">
          <View className="w-3 h-3 rounded bg-[#81E6D9]" />
          <Text className="text-xs text-slate-500" style={{ fontFamily: 'Manrope-Medium' }}>{m1}</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="w-3 h-3 rounded bg-[#0D9488]" />
          <Text className="text-xs text-slate-500 font-bold" style={{ fontFamily: 'Manrope-Bold' }}>{m2}</Text>
        </View>
      </View>

      {/* Picker Modal */}
      <Modal
        visible={showPicker !== null}
        transparent={true}
        animationType="fade"
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-5 pb-10">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-base font-bold text-slate-800" style={{ fontFamily: 'Manrope-Bold' }}>
                Chọn tháng {showPicker === 'm1' ? 'đầu tiên' : 'so sánh'}
              </Text>
              <TouchableOpacity onPress={() => setShowPicker(null)}>
                <Feather name="x" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <ScrollView className="max-h-[300px]">
              {recentMonths.map((m) => (
                <TouchableOpacity
                  key={m}
                  className={`py-3 px-4 rounded-xl mb-2 flex-row justify-between items-center ${(showPicker === 'm1' ? m1 : m2) === m ? 'bg-teal-50' : 'bg-white'}`}
                  onPress={() => {
                    if (showPicker === 'm1') setM1(m);
                    if (showPicker === 'm2') setM2(m);
                    setShowPicker(null);
                  }}
                >
                  <Text 
                    className={`text-base ${(showPicker === 'm1' ? m1 : m2) === m ? 'text-teal-700 font-bold' : 'text-slate-600 font-medium'}`}
                    style={{ fontFamily: (showPicker === 'm1' ? m1 : m2) === m ? 'Manrope-Bold' : 'Manrope-Medium' }}
                  >
                    Tháng {m}
                  </Text>
                  {(showPicker === 'm1' ? m1 : m2) === m && (
                    <Feather name="check" size={18} color="#0F766E" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

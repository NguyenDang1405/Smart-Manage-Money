import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import { LineChart } from "react-native-gifted-charts";
import { apiClient, getAuthToken } from "../lib/http";
import { useAuth } from "@clerk/clerk-expo";

export default function TrendChart() {
  const [period, setPeriod] = useState<"week" | "month">("month");
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isLoaded, isSignedIn } = useAuth();


  const fetchTrendData = async (selectedPeriod: "week" | "month") => {
    // Don't fetch if Clerk is not ready or user not signed in
    if (!isLoaded || !isSignedIn) return;

    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const limit = 6;
      const response = await apiClient.get(`/dashboard/trend?period=${selectedPeriod}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data?.data || response.data;
      if (Array.isArray(data)) {
        setTrendData(data);
      }
    } catch (error) {
      console.warn("Lỗi fetch trend data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch when Clerk is ready and user is signed in
    if (isLoaded && isSignedIn) {
      fetchTrendData(period);
    } else if (isLoaded && !isSignedIn) {
      setLoading(false);
    }
  }, [period, isLoaded, isSignedIn]); // removed 'transactions' — was causing infinite refetch loop


  const formatYAxis = (val: string | number) => {
    const num = Number(val);
    if (isNaN(num)) return String(val);
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + ' tỷ';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + ' tr';
    if (num >= 1000) return (num / 1000).toFixed(0) + ' k';
    return num.toString();
  };

  const expenseData = trendData.map((item) => ({
    value: item.expense,
    label: item.label,
    dataPointText: formatYAxis(item.expense),
  }));

  const incomeData = trendData.map((item) => ({
    value: item.income,
    label: item.label,
    dataPointText: formatYAxis(item.income),
  }));

  return (
    <View className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100/50 mb-6">
      <View className="flex-row items-center justify-between mb-4">
        <Text 
          className="text-base font-bold text-slate-800"
          style={{ fontFamily: 'Manrope-Bold' }}
        >
          Xu hướng giao dịch
        </Text>
        
        {/* Toggle Period */}
        <View className="flex-row bg-slate-100 rounded-full p-1">
          <TouchableOpacity 
            onPress={() => setPeriod('week')}
            className={`px-3 py-1.5 rounded-full ${period === 'week' ? 'bg-white shadow-sm' : ''}`}
          >
            <Text 
              className={`text-xs font-bold ${period === 'week' ? 'text-teal-600' : 'text-slate-400'}`}
              style={{ fontFamily: 'Manrope-Bold' }}
            >
              Tuần
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setPeriod('month')}
            className={`px-3 py-1.5 rounded-full ${period === 'month' ? 'bg-white shadow-sm' : ''}`}
          >
            <Text 
              className={`text-xs font-bold ${period === 'month' ? 'text-teal-600' : 'text-slate-400'}`}
              style={{ fontFamily: 'Manrope-Bold' }}
            >
              Tháng
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Chart Legend */}
      <View className="flex-row items-center justify-center gap-4 mb-4 mt-2">
        <View className="flex-row items-center gap-1.5">
          <View className="w-2.5 h-2.5 rounded-full bg-[#D63031]" />
          <Text className="text-xs text-slate-500 font-bold" style={{ fontFamily: 'Manrope-Bold' }}>Chi tiêu</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="w-2.5 h-2.5 rounded-full bg-[#0D9488]" />
          <Text className="text-xs text-slate-500 font-bold" style={{ fontFamily: 'Manrope-Bold' }}>Thu nhập</Text>
        </View>
      </View>

      {/* Chart View */}
      <View className="items-center justify-center py-2 min-h-[220px]">
        {loading ? (
          <ActivityIndicator size="small" color="#0D9488" />
        ) : trendData.length === 0 ? (
          <Text className="text-slate-400 text-xs font-semibold" style={{ fontFamily: 'Manrope-SemiBold' }}>
            Chưa có dữ liệu giao dịch
          </Text>
        ) : (
          <View style={{ marginLeft: -15 }}>
            <LineChart
              data={expenseData}
              data2={incomeData}
              height={180}
              width={280}
              initialSpacing={20}
              spacing={45}
              textColor1="#D63031"
              textColor2="#0D9488"
              dataPointsColor1="#D63031"
              dataPointsColor2="#0D9488"
              color1="#D63031"
              color2="#0D9488"
              thickness1={3}
              thickness2={3}
              yAxisTextStyle={{ color: '#94A3B8', fontSize: 10, fontFamily: 'Manrope-Medium' }}
              xAxisLabelTextStyle={{ color: '#94A3B8', fontSize: 10, fontFamily: 'Manrope-Medium', textAlign: 'center' }}
              formatYLabel={formatYAxis}
              yAxisColor="#E2E8F0"
              xAxisColor="#E2E8F0"
              hideRules={false}
              rulesColor="#F1F5F9"
              rulesType="solid"
              pointerConfig={{
                pointerStripHeight: 160,
                pointerStripColor: 'lightgray',
                pointerStripWidth: 2,
                pointerColor: 'lightgray',
                radius: 6,
                pointerLabelWidth: 100,
                pointerLabelHeight: 90,
                activatePointersOnLongPress: true,
                autoAdjustPointerLabelPosition: false,
                pointerLabelComponent: (items: any) => {
                  return (
                    <View className="bg-slate-800 rounded-lg p-2 shadow-lg z-50 justify-center">
                      <Text className="text-white text-[10px] font-bold mb-1 text-center" style={{ fontFamily: 'Manrope-Bold' }}>
                        {items[0].label}
                      </Text>
                      {items[0] && (
                        <View className="flex-row items-center gap-1">
                          <View className="w-2 h-2 rounded-full bg-[#D63031]" />
                          <Text className="text-white text-[10px] font-bold" style={{ fontFamily: 'Manrope-Bold' }}>
                            {items[0].value.toLocaleString('vi-VN')} đ
                          </Text>
                        </View>
                      )}
                      {items[1] && (
                        <View className="flex-row items-center gap-1 mt-0.5">
                          <View className="w-2 h-2 rounded-full bg-[#0D9488]" />
                          <Text className="text-white text-[10px] font-bold" style={{ fontFamily: 'Manrope-Bold' }}>
                            {items[1].value.toLocaleString('vi-VN')} đ
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                },
              }}
            />
          </View>
        )}
      </View>
    </View>
  );
}

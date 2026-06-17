import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { apiClient, getAuthToken } from "../lib/http";
import { useAuth } from "@clerk/clerk-expo";

export default function TrendChart() {
  const [period, setPeriod] = useState<"week" | "month">("month");
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isLoaded, isSignedIn } = useAuth();

  const fetchTrendData = async (selectedPeriod: "week" | "month") => {
    if (!isLoaded || !isSignedIn) return;
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;
      const response = await apiClient.get(
        `/dashboard/trend?period=${selectedPeriod}&limit=6`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = response.data?.data || response.data;
      if (Array.isArray(data)) setTrendData(data);
    } catch (error) {
      console.warn("Lỗi fetch trend data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchTrendData(period);
    } else if (isLoaded && !isSignedIn) {
      setLoading(false);
    }
  }, [period, isLoaded, isSignedIn]);

  const formatVal = (val: number | undefined) => {
    if (val === undefined || val === null || isNaN(val)) return "0";
    if (val >= 1000000000) return (val / 1000000000).toFixed(1).replace(/\.0$/, "") + " tỷ";
    if (val >= 1000000) return (val / 1000000).toFixed(1).replace(/\.0$/, "") + " tr";
    if (val >= 1000) return (val / 1000).toFixed(0) + " k";
    return val.toString();
  };

  const expenseData = trendData.map((item) => ({
    value: item.expense ?? 0,
    label: item.label ?? "",
    dataPointText: formatVal(item.expense),
  }));

  const incomeData = trendData.map((item) => ({
    value: item.income ?? 0,
    label: item.label ?? "",
    dataPointText: formatVal(item.income),
  }));

  return (
    <View style={{
      backgroundColor: "white",
      borderRadius: 24,
      padding: 20,
      marginBottom: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
      borderWidth: 1,
      borderColor: "rgba(226,232,240,0.8)",
    }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <Text style={{ fontSize: 15, fontWeight: "800", color: "#1e293b", fontFamily: "Manrope-Bold" }}>
          Xu hướng giao dịch
        </Text>

        {/* Toggle Period */}
        <View style={{ flexDirection: "row", backgroundColor: "#f1f5f9", borderRadius: 20, padding: 4 }}>
          <TouchableOpacity
            onPress={() => setPeriod("week")}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              backgroundColor: period === "week" ? "white" : "transparent",
              shadowColor: period === "week" ? "#000" : "transparent",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: period === "week" ? 0.08 : 0,
              shadowRadius: 2,
              elevation: period === "week" ? 1 : 0,
            }}
          >
            <Text style={{
              fontSize: 11,
              fontWeight: "700",
              fontFamily: "Manrope-Bold",
              color: period === "week" ? "#0D9488" : "#94a3b8",
            }}>
              Tuần
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setPeriod("month")}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              backgroundColor: period === "month" ? "white" : "transparent",
              shadowColor: period === "month" ? "#000" : "transparent",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: period === "month" ? 0.08 : 0,
              shadowRadius: 2,
              elevation: period === "month" ? 1 : 0,
            }}
          >
            <Text style={{
              fontSize: 11,
              fontWeight: "700",
              fontFamily: "Manrope-Bold",
              color: period === "month" ? "#0D9488" : "#94a3b8",
            }}>
              Tháng
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Legend */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#D63031" }} />
          <Text style={{ fontSize: 11, color: "#64748b", fontFamily: "Manrope-Bold", fontWeight: "700" }}>Chi tiêu</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#0D9488" }} />
          <Text style={{ fontSize: 11, color: "#64748b", fontFamily: "Manrope-Bold", fontWeight: "700" }}>Thu nhập</Text>
        </View>
      </View>

      {/* Chart */}
      <View style={{ alignItems: "center", justifyContent: "center", minHeight: 220, paddingVertical: 8 }}>
        {loading ? (
          <ActivityIndicator size="small" color="#0D9488" />
        ) : trendData.length === 0 ? (
          <Text style={{ color: "#94a3b8", fontSize: 12, fontFamily: "Manrope-SemiBold" }}>
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
              yAxisTextStyle={{ color: "#94A3B8", fontSize: 10, fontFamily: "Manrope-Medium" }}
              xAxisLabelTextStyle={{ color: "#94A3B8", fontSize: 10, fontFamily: "Manrope-Medium", textAlign: "center" }}
              formatYLabel={formatVal}
              yAxisColor="#E2E8F0"
              xAxisColor="#E2E8F0"
              hideRules={false}
              rulesColor="#F1F5F9"
              rulesType="solid"
              pointerConfig={{
                pointerStripHeight: 160,
                pointerStripColor: "lightgray",
                pointerStripWidth: 2,
                pointerColor: "lightgray",
                radius: 6,
                pointerLabelWidth: 110,
                pointerLabelHeight: 90,
                activatePointersOnLongPress: true,
                autoAdjustPointerLabelPosition: false,
                pointerLabelComponent: (items: any) => {
                  const item0 = items?.[0];
                  const item1 = items?.[1];
                  return (
                    <View style={{
                      backgroundColor: "#1e293b",
                      borderRadius: 10,
                      padding: 8,
                      justifyContent: "center",
                    }}>
                      <Text style={{ color: "white", fontSize: 10, fontFamily: "Manrope-Bold", marginBottom: 4, textAlign: "center" }}>
                        {item0?.label ?? ""}
                      </Text>
                      {item0 && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#D63031" }} />
                          <Text style={{ color: "white", fontSize: 10, fontFamily: "Manrope-Bold" }}>
                            {(item0.value ?? 0).toLocaleString("vi-VN")} đ
                          </Text>
                        </View>
                      )}
                      {item1 && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#0D9488" }} />
                          <Text style={{ color: "white", fontSize: 10, fontFamily: "Manrope-Bold" }}>
                            {(item1.value ?? 0).toLocaleString("vi-VN")} đ
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

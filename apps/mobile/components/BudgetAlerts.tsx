import React, { useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { isAlertDismissed, dismissAlert } from "../lib/alerts";

export type BudgetCategorySummary = {
  categoryId: number;
  categoryName: string;
  budgetAmount: number;
  spentAmount: number;
  percentage: number;
  threshold: "NONE" | "WARNING" | "DANGER";
};

type BudgetAlertsProps = {
  categories: BudgetCategorySummary[];
  month: number;
  year: number;
};

export default function BudgetAlerts({ categories, month, year }: BudgetAlertsProps) {
  const [activeAlerts, setActiveAlerts] = useState<BudgetCategorySummary[]>([]);

  useEffect(() => {
    // Filter alerts that have WARNING or DANGER threshold and have not been dismissed
    const alertsToDisplay = categories.filter((cat) => {
      if (cat.threshold === "NONE") return false;
      return !isAlertDismissed(cat.categoryName, month, year);
    });

    // Sort DANGER alerts first, then WARNING
    alertsToDisplay.sort((a, b) => {
      if (a.threshold === "DANGER" && b.threshold !== "DANGER") return -1;
      if (a.threshold !== "DANGER" && b.threshold === "DANGER") return 1;
      return b.percentage - a.percentage; // Higher percentage first
    });

    setActiveAlerts(alertsToDisplay);
  }, [categories, month, year]);

  const handleDismiss = (categoryName: string) => {
    dismissAlert(categoryName, month, year);
    setActiveAlerts((prev) => prev.filter((alert) => alert.categoryName !== categoryName));
  };

  if (activeAlerts.length === 0) return null;

  return (
    <View className="mb-6 space-y-3">
      {activeAlerts.map((alert) => {
        const isDanger = alert.threshold === "DANGER";
        
        return (
          <View
            key={alert.categoryId}
            className={`rounded-2xl p-4 border ${
              isDanger 
                ? "bg-rose-50 border-rose-200 shadow-sm shadow-rose-900/10" 
                : "bg-amber-50 border-amber-200 shadow-sm shadow-amber-900/10"
            }`}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-row items-center flex-1 mr-3">
                <View 
                  className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                    isDanger ? "bg-rose-100" : "bg-amber-100"
                  }`}
                >
                  <MaterialCommunityIcons 
                    name="alert-circle-outline" 
                    size={22} 
                    color={isDanger ? "#e11d48" : "#d97706"} 
                  />
                </View>
                <View className="flex-1">
                  <Text 
                    className={`font-bold text-sm ${
                      isDanger ? "text-rose-800" : "text-amber-800"
                    }`}
                  >
                    {isDanger ? "Đã vượt ngân sách!" : "Sắp vượt ngân sách!"}
                  </Text>
                  <Text 
                    className={`text-xs mt-1 leading-4 ${
                      isDanger ? "text-rose-700" : "text-amber-700"
                    }`}
                  >
                    Danh mục <Text className="font-bold">{alert.categoryName}</Text> đã tiêu {alert.percentage}% ({alert.spentAmount.toLocaleString('vi-VN')} đ / {alert.budgetAmount.toLocaleString('vi-VN')} đ).
                  </Text>
                </View>
              </View>

              <Pressable 
                onPress={() => handleDismiss(alert.categoryName)}
                className="w-8 h-8 items-center justify-center -mr-2 -mt-2 opacity-60 active:opacity-100"
              >
                <Feather name="x" size={20} color={isDanger ? "#be123c" : "#b45309"} />
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}

import React from "react";
import { View, Text } from "react-native";
import { 
  Utensils, 
  ShoppingCart, 
  Car, 
  Home, 
  Wallet, 
  Gift, 
  Heart, 
  Coffee, 
  BookOpen,
  Activity,
  HelpCircle 
} from "lucide-react-native";

export type CategorySpendingItem = {
  categoryId?: number;
  categoryName: string;
  amount: number;
  percentage: number;
  color: string;
};

interface TopCategoriesListProps {
  categories: CategorySpendingItem[];
}

// Custom icon mapping based on category names for dynamic high-premium visuals
const getCategoryIcon = (categoryName: string, color: string) => {
  const lowerName = categoryName.toLowerCase();
  const iconSize = 16;

  if (lowerName.includes("ăn") || lowerName.includes("uống") || lowerName.includes("phở") || lowerName.includes("nhà hàng") || lowerName.includes("food")) {
    return <Utensils size={iconSize} color={color} />;
  }
  if (lowerName.includes("mua") || lowerName.includes("sắm") || lowerName.includes("shopping") || lowerName.includes("siêu thị")) {
    return <ShoppingCart size={iconSize} color={color} />;
  }
  if (lowerName.includes("di") || lowerName.includes("chuyển") || lowerName.includes("xe") || lowerName.includes("taxi") || lowerName.includes("grab") || lowerName.includes("travel")) {
    return <Car size={iconSize} color={color} />;
  }
  if (lowerName.includes("nhà") || lowerName.includes("ở") || lowerName.includes("rent") || lowerName.includes("điện") || lowerName.includes("nước")) {
    return <Home size={iconSize} color={color} />;
  }
  if (lowerName.includes("lương") || lowerName.includes("thu nhập") || lowerName.includes("salary")) {
    return <Wallet size={iconSize} color={color} />;
  }
  if (lowerName.includes("quà") || lowerName.includes("tặng") || lowerName.includes("gift")) {
    return <Gift size={iconSize} color={color} />;
  }
  if (lowerName.includes("sức") || lowerName.includes("khỏe") || lowerName.includes("y") || lowerName.includes("health") || lowerName.includes("gym")) {
    return <Activity size={iconSize} color={color} />;
  }
  if (lowerName.includes("học") || lowerName.includes("giáo") || lowerName.includes("sách") || lowerName.includes("education")) {
    return <BookOpen size={iconSize} color={color} />;
  }
  if (lowerName.includes("cà phê") || lowerName.includes("coffee") || lowerName.includes("giải trí") || lowerName.includes("entertainment")) {
    return <Coffee size={iconSize} color={color} />;
  }
  
  return <HelpCircle size={iconSize} color={color} />;
};

export default function TopCategoriesList({ categories }: TopCategoriesListProps) {
  // Sort descending by amount / percentage, and take top 5
  const topCategories = [...categories]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const isListEmpty = topCategories.length === 0 || topCategories.every(item => item.amount === 0);

  if (isListEmpty) {
    return (
      <View className="py-6 items-center justify-center">
        <Text 
          className="text-slate-400 text-xs font-semibold text-center"
          style={{ fontFamily: "Manrope-SemiBold" }}
        >
          Chưa có chi tiêu danh mục nào trong tháng này.
        </Text>
      </View>
    );
  }

  // Get max amount to scale progress bars relative to the highest spending category
  const maxAmount = Math.max(...topCategories.map(c => c.amount), 1);

  return (
    <View className="space-y-4">
      {topCategories.map((item, index) => {
        const rank = index + 1;
        const barWidthPercent = Math.max(Math.round((item.amount / maxAmount) * 100), 5);
        
        // Define premium color palettes for rank badges
        const rankBadgeStyle = 
          rank === 1 ? "bg-teal-600 text-white" :
          rank === 2 ? "bg-teal-500/20 text-teal-700" :
          rank === 3 ? "bg-teal-500/10 text-teal-600" :
          "bg-slate-100 text-slate-500";

        return (
          <View key={item.categoryId || index} className="flex-row items-center gap-3">
            {/* Rank badge */}
            <View className={`w-6 h-6 rounded-full items-center justify-center shrink-0 ${rankBadgeStyle}`}>
              <Text 
                className="text-[10px] font-black"
                style={{ fontFamily: "HankenGrotesk-Bold" }}
              >
                #{rank}
              </Text>
            </View>

            {/* Icon + Bar + Text area */}
            <View className="flex-1 space-y-1">
              {/* Top row: Name, Spent Amount, Percentage */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View 
                    className="w-7 h-7 rounded-lg items-center justify-center shrink-0"
                    style={{ backgroundColor: `${item.color}15` }}
                  >
                    {getCategoryIcon(item.categoryName, item.color)}
                  </View>
                  <Text 
                    className="text-xs font-bold text-slate-800"
                    style={{ fontFamily: "Manrope-Bold" }}
                  >
                    {item.categoryName}
                  </Text>
                </View>
                
                <View className="flex-row items-center gap-1.5">
                  <Text 
                    className="text-xs font-black text-slate-800"
                    style={{ fontFamily: "HankenGrotesk-Bold" }}
                  >
                    {item.amount.toLocaleString("vi-VN")}
                  </Text>
                  <Text 
                    className="text-[9px] font-bold text-slate-400"
                    style={{ fontFamily: "Manrope-Bold" }}
                  >
                    VND
                  </Text>
                  <Text 
                    className="text-[10px] font-bold text-slate-400 pl-1 border-l border-slate-200"
                    style={{ fontFamily: "HankenGrotesk-Bold" }}
                  >
                    {item.percentage}%
                  </Text>
                </View>
              </View>

              {/* Progress bar mapping category percentage */}
              <View className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <View 
                  style={{ 
                    width: `${barWidthPercent}%`,
                    backgroundColor: item.color 
                  }}
                  className="h-full rounded-full"
                />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

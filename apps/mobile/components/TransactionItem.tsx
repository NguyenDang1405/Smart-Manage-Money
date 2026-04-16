import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { Transaction } from '../context/TransactionsContext';

type TransactionItemProps = {
  transaction: Transaction;
  isDeleting: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onDelete: () => void;
  isLast?: boolean;
};

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction: tx,
  isDeleting,
  onPress,
  onLongPress,
  onDelete,
  isLast = false,
}) => {
  // Mapping icon & colors based on type and category
  const getCategoryConfig = () => {
    if (tx.type === 'income') {
      return { icon: 'cash', iconColor: '#0d9488', bgColor: 'bg-teal-50' };
    }
    if (tx.type === 'savings') {
      return { icon: 'piggy-bank', iconColor: '#2563eb', bgColor: 'bg-blue-50' };
    }

    const cat = tx.category.toLowerCase();
    if (cat.includes('thực phẩm') || cat.includes('ăn uống')) {
      return { icon: 'silverware-fork-knife', iconColor: '#b91c1c', bgColor: 'bg-red-50' };
    }
    if (cat.includes('di chuyển') || cat.includes('xe')) {
      return { icon: 'car', iconColor: '#0284c7', bgColor: 'bg-sky-50' };
    }
    if (cat.includes('nhà') || cat.includes('hóa đơn')) {
      return { icon: 'home', iconColor: '#7c3aed', bgColor: 'bg-purple-50' };
    }
    if (cat.includes('mua sắm') || cat.includes('giải trí')) {
      return { icon: 'shopping', iconColor: '#db2777', bgColor: 'bg-pink-50' };
    }
    return { icon: 'wallet', iconColor: '#f59e0b', bgColor: 'bg-amber-50' };
  };

  const { icon, iconColor, bgColor } = getCategoryConfig();

  // Amount formatting & color coding
  const amountColorClass =
    tx.type === 'expense' ? 'text-[#b91c1c]' : tx.type === 'income' ? 'text-[#0d9488]' : 'text-[#2563eb]';

  const amountSign = tx.type === 'expense' ? '-' : '+';

  return (
    <View className={`relative ${!isLast ? 'border-b border-slate-100' : ''}`}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        className={`bg-white p-4 flex-row items-center justify-between transition-all ${
          isDeleting ? 'pr-20 bg-red-50/10' : ''
        }`}
      >
        <View className="flex-row items-center flex-1 mr-3">
          <View className={`w-12 h-12 rounded-full items-center justify-center mr-3.5 ${bgColor}`}>
            <MaterialCommunityIcons name={icon as any} size={24} color={iconColor} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-slate-800 mb-0.5" numberOfLines={1}>
              {tx.note}
            </Text>
            <Text className="text-xs font-medium text-slate-500">
              {tx.category} • {tx.time || '12:00'}
            </Text>
          </View>
        </View>

        <Text className={`text-base font-extrabold ${amountColorClass}`}>
          {amountSign}
          {tx.amount.toLocaleString('vi-VN')}đ
        </Text>
      </Pressable>

      {/* Delete Quick Action Block */}
      {isDeleting && (
        <Pressable
          onPress={onDelete}
          className="absolute right-0 top-0 bottom-0 bg-[#b91c1c] w-16 items-center justify-center shadow-md"
        >
          <Feather name="trash-2" size={22} color="white" />
        </Pressable>
      )}
    </View>
  );
};

import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';

type DateRangePickerProps = {
  visible: boolean;
  onClose: () => void;
  startDate: string | null;
  endDate: string | null;
  onApply: (start: string | null, end: string | null) => void;
};

export function DateRangePicker({ visible, onClose, startDate, endDate, onApply }: DateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const getStartOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  };

  const getEndOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  };

  const getStartOfYear = (date: Date) => {
    return new Date(date.getFullYear(), 0, 1).toISOString().split('T')[0];
  };

  const getEndOfYear = (date: Date) => {
    return new Date(date.getFullYear(), 11, 31).toISOString().split('T')[0];
  };

  const handleApplyPreset = (preset: string) => {
    const today = new Date();
    setSelectedPreset(preset);

    switch (preset) {
      case 'all':
        onApply(null, null);
        break;
      case 'this_month':
        onApply(getStartOfMonth(today), getEndOfMonth(today));
        break;
      case 'last_month':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        onApply(getStartOfMonth(lastMonth), getEndOfMonth(lastMonth));
        break;
      case 'this_year':
        onApply(getStartOfYear(today), getEndOfYear(today));
        break;
      default:
        onApply(null, null);
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-white rounded-t-3xl p-6">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-bold text-slate-800">Chọn thời gian</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View className="space-y-3 mb-6">
            <TouchableOpacity
              onPress={() => handleApplyPreset('all')}
              className={`py-3 px-4 rounded-xl border flex-row justify-between items-center ${
                selectedPreset === 'all' || (!startDate && !endDate) ? 'border-[#047857] bg-teal-50' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <Text className={`font-semibold ${selectedPreset === 'all' || (!startDate && !endDate) ? 'text-[#047857]' : 'text-slate-700'}`}>
                Tất cả thời gian
              </Text>
              {(selectedPreset === 'all' || (!startDate && !endDate)) && <Feather name="check" size={20} color="#047857" />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleApplyPreset('this_month')}
              className={`py-3 px-4 rounded-xl border flex-row justify-between items-center ${
                selectedPreset === 'this_month' ? 'border-[#047857] bg-teal-50' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <Text className={`font-semibold ${selectedPreset === 'this_month' ? 'text-[#047857]' : 'text-slate-700'}`}>
                Tháng này
              </Text>
              {selectedPreset === 'this_month' && <Feather name="check" size={20} color="#047857" />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleApplyPreset('last_month')}
              className={`py-3 px-4 rounded-xl border flex-row justify-between items-center ${
                selectedPreset === 'last_month' ? 'border-[#047857] bg-teal-50' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <Text className={`font-semibold ${selectedPreset === 'last_month' ? 'text-[#047857]' : 'text-slate-700'}`}>
                Tháng trước
              </Text>
              {selectedPreset === 'last_month' && <Feather name="check" size={20} color="#047857" />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleApplyPreset('this_year')}
              className={`py-3 px-4 rounded-xl border flex-row justify-between items-center ${
                selectedPreset === 'this_year' ? 'border-[#047857] bg-teal-50' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <Text className={`font-semibold ${selectedPreset === 'this_year' ? 'text-[#047857]' : 'text-slate-700'}`}>
                Năm nay
              </Text>
              {selectedPreset === 'this_year' && <Feather name="check" size={20} color="#047857" />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Animated,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { apiClient } from '../lib/http';
import { RefreshCw, Repeat, CheckCircle2, MinusCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react-native';

export interface RecurringExpense {
  id: string;
  description: string;
  amount: number;
  frequency: string;
  category: string;
  suggestion: "Giữ nguyên" | "Cắt giảm" | "Huỷ bỏ";
  reason: string;
}

export interface RecurringInsightsResult {
  expenses: RecurringExpense[];
  totalPotentialSavings: number;
  generatedAt: string;
}

export default function RecurringExpenseCard() {
  const [data, setData] = useState<RecurringInsightsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 800, useNativeDriver: true })
    ).start();
    try {
      const res = await apiClient.get('/ai/insights/recurring');
      const d = res.data?.data || res.data;
      if (d) setData(d);
    } catch (e) {
      console.warn('Recurring insight fetch error', e);
    } finally {
      setLoading(false);
      rotateAnim.stopAnimation();
      rotateAnim.setValue(0);
    }
  }, []);

  useEffect(() => { fetchInsights(); }, []);

  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  if (loading && !data) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#db2777" />
          <Text style={styles.loadingText}>Đang quét các khoản chi định kỳ...</Text>
        </View>
      </View>
    );
  }

  if (!data || data.expenses.length === 0) return null;

  const renderSuggestionIcon = (suggestion: string) => {
    switch (suggestion) {
      case 'Cắt giảm': return <MinusCircle size={16} color="#f59e0b" />;
      case 'Huỷ bỏ': return <XCircle size={16} color="#ef4444" />;
      default: return <CheckCircle2 size={16} color="#10b981" />;
    }
  };

  const renderSuggestionColor = (suggestion: string) => {
    switch (suggestion) {
      case 'Cắt giảm': return '#f59e0b';
      case 'Huỷ bỏ': return '#ef4444';
      default: return '#10b981';
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconBox}>
            <Repeat size={20} color="#db2777" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Chi Phí Định Kỳ</Text>
            <Text style={styles.cardSubtitle}>
              Phát hiện {data.expenses.length} khoản chi lặp lại
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={fetchInsights} style={styles.refreshBtn}>
          <Animated.View style={{ transform: [{ rotate: loading ? spin : '0deg' }] }}>
            <RefreshCw size={16} color="#64748b" />
          </Animated.View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.expandBtn}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.expandBtnText}>{expanded ? 'Thu gọn' : 'Xem chi tiết'}</Text>
        {expanded ? <ChevronUp size={14} color="#db2777" /> : <ChevronDown size={14} color="#db2777" />}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expandedContent}>
          {data.totalPotentialSavings > 0 && (
            <View style={styles.savingsBox}>
              <Text style={styles.savingsLabel}>✨ Tiết kiệm tiềm năng:</Text>
              <Text style={styles.savingsAmount}>{data.totalPotentialSavings.toLocaleString('vi-VN')} đ/tháng</Text>
            </View>
          )}

          <View style={styles.expensesList}>
            {data.expenses.map((item, index) => (
              <View key={item.id || index} style={[styles.expenseItem, index === data.expenses.length - 1 && styles.lastItem]}>
                <View style={styles.expenseHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.expenseName}>{item.description}</Text>
                    <Text style={styles.expenseDetail}>{item.category} • {item.frequency}</Text>
                  </View>
                  <Text style={styles.expenseAmount}>{item.amount.toLocaleString('vi-VN')} đ</Text>
                </View>
                
                <View style={[styles.suggestionBox, { borderLeftColor: renderSuggestionColor(item.suggestion) }]}>
                  <View style={styles.suggestionHeader}>
                    {renderSuggestionIcon(item.suggestion)}
                    <Text style={[styles.suggestionTitle, { color: renderSuggestionColor(item.suggestion) }]}>
                      {item.suggestion}
                    </Text>
                  </View>
                  <Text style={styles.suggestionReason}>{item.reason}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#fdf2f8',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fdf2f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  savingsBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  savingsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16a34a',
  },
  savingsAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#16a34a',
  },
  expensesList: {
    gap: 16,
  },
  expenseItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 16,
  },
  lastItem: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  expenseName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 2,
  },
  expenseDetail: {
    fontSize: 12,
    color: '#94a3b8',
  },
  expenseAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  suggestionBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  suggestionReason: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  expandBtnText: {
    fontSize: 12,
    color: '#db2777',
    fontWeight: '600',
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 14,
  },
});

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
import { RefreshCw, Lightbulb, TrendingUp, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react-native';

export interface WeeklyInsight {
  insight: string;
  action: string;
}

export interface WeeklyInsightResult {
  insights: WeeklyInsight[];
  generatedAt: string;
}

export default function WeeklyInsightCard() {
  const [data, setData] = useState<WeeklyInsightResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 800, useNativeDriver: true })
    ).start();
    try {
      const res = await apiClient.get('/ai/insights/weekly');
      const d = res.data?.data || res.data;
      if (d) setData(d);
    } catch (e) {
      console.warn('Weekly insight fetch error', e);
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
          <ActivityIndicator size="small" color="#6366f1" />
          <Text style={styles.loadingText}>Đang phân tích chi tiêu tuần qua...</Text>
        </View>
      </View>
    );
  }

  if (!data || data.insights.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconBox}>
            <Lightbulb size={20} color="#4f46e5" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Insight Hàng Tuần</Text>
            <Text style={styles.cardSubtitle}>
              Cập nhật: {new Date(data.generatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}, {new Date(data.generatedAt).toLocaleDateString('vi-VN')}
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
        {expanded ? <ChevronUp size={14} color="#4f46e5" /> : <ChevronDown size={14} color="#4f46e5" />}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expandedContent}>
          <View style={styles.insightsList}>
            {data.insights.map((item, index) => (
              <View key={index} style={[styles.insightItem, index === data.insights.length - 1 && styles.lastItem]}>
                <View style={styles.insightHeader}>
                  {index === 0 ? (
                    <AlertTriangle size={16} color="#f59e0b" />
                  ) : (
                    <TrendingUp size={16} color="#0ea5e9" />
                  )}
                  <Text style={styles.insightText}>{item.insight}</Text>
                </View>
                <View style={styles.actionBox}>
                  <Text style={styles.actionLabel}>💡 Gợi ý hành động:</Text>
                  <Text style={styles.actionText}>{item.action}</Text>
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
    borderColor: '#eef2ff',
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
    backgroundColor: '#eef2ff',
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
  insightsList: {
    gap: 12,
  },
  insightItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
  },
  lastItem: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
    lineHeight: 20,
  },
  actionBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    marginLeft: 24,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
    marginBottom: 4,
  },
  actionText: {
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
    color: '#4f46e5',
    fontWeight: '600',
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 14,
  },
});

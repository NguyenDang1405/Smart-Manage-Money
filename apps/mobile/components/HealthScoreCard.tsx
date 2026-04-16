import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { apiClient } from '../lib/http';
import { RefreshCw, TrendingUp, ShieldCheck, BookOpen, ChevronDown, ChevronUp } from 'lucide-react-native';

interface HealthFactor {
  key: string;
  label: string;
  score: number;
  weight: number;
  detail: string;
}

interface HealthScoreData {
  score: number;
  label: string;
  color: string;
  factors: HealthFactor[];
  suggestions: string[];
  generatedAt: string;
}

const FACTOR_ICONS: Record<string, any> = {
  savings: TrendingUp,
  budget: ShieldCheck,
  consistency: BookOpen,
};

function ScoreArc({ score, color }: { score: number; color: string }) {
  const animValue = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: score,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [score]);

  // SVG-like arc using View transforms
  const size = 140;
  const radius = 58;
  const circumference = Math.PI * radius; // half circle
  const strokeWidth = 12;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size / 2 + 30 }}>
      {/* Track arc bg */}
      <View style={[styles.arcTrack, { borderColor: '#e2e8f0' }]} />
      {/* Score overlay */}
      <View style={styles.arcCenter}>
        <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
        <Text style={styles.scoreOf}>/100</Text>
      </View>
    </View>
  );
}

export default function HealthScoreCard() {
  const [data, setData] = useState<HealthScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  const fetchScore = useCallback(async () => {
    setLoading(true);
    Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 800, useNativeDriver: true })
    ).start();
    try {
      const res = await apiClient.get('/ai/health-score');
      const d = res.data?.data || res.data;
      if (d) setData(d);
    } catch (e) {
      console.warn('Health score fetch error', e);
    } finally {
      setLoading(false);
      rotateAnim.stopAnimation();
      rotateAnim.setValue(0);
    }
  }, []);

  useEffect(() => { fetchScore(); }, []);

  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  if (loading && !data) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#0d9488" />
          <Text style={styles.loadingText}>Đang tính điểm sức khoẻ...</Text>
        </View>
      </View>
    );
  }

  if (!data) return null;

  const getScoreBarWidth = (score: number) => `${Math.min(score, 100)}%` as any;
  const getFactorColor = (score: number) =>
    score >= 80 ? '#16a34a' : score >= 60 ? '#0d9488' : score >= 40 ? '#d97706' : '#dc2626';

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.cardTitle}>Sức khoẻ Tài chính</Text>
          <Text style={styles.cardSubtitle}>Cập nhật: {new Date(data.generatedAt).toLocaleDateString('vi-VN')}</Text>
        </View>
        <TouchableOpacity onPress={fetchScore} style={styles.refreshBtn}>
          <Animated.View style={{ transform: [{ rotate: loading ? spin : '0deg' }] }}>
            <RefreshCw size={16} color="#64748b" />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Score display */}
      <View style={styles.scoreRow}>
        {/* Circular visual */}
        <View style={[styles.scoreCircle, { borderColor: data.color, shadowColor: data.color }]}>
          <Text style={[styles.scoreCircleNumber, { color: data.color }]}>{data.score}</Text>
          <Text style={styles.scoreCircleLabel}>/100</Text>
        </View>

        <View style={styles.scoreInfo}>
          <View style={[styles.labelBadge, { backgroundColor: data.color + '20', borderColor: data.color + '40' }]}>
            <Text style={[styles.labelBadgeText, { color: data.color }]}>{data.label}</Text>
          </View>

          {/* Factors summary bars */}
          <View style={{ gap: 6, marginTop: 10 }}>
            {data.factors.map(f => {
              const Icon = FACTOR_ICONS[f.key] || TrendingUp;
              const fc = getFactorColor(f.score);
              return (
                <View key={f.key} style={styles.factorMini}>
                  <Icon size={12} color={fc} />
                  <Text style={styles.factorMiniLabel}>{f.label}</Text>
                  <View style={styles.factorMiniTrack}>
                    <View style={[styles.factorMiniBar, { width: getScoreBarWidth(f.score), backgroundColor: fc }]} />
                  </View>
                  <Text style={[styles.factorMiniScore, { color: fc }]}>{f.score}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* Expand/Collapse button */}
      <TouchableOpacity
        style={styles.expandBtn}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.expandBtnText}>{expanded ? 'Thu gọn' : 'Xem chi tiết & Gợi ý'}</Text>
        {expanded ? <ChevronUp size={14} color="#0d9488" /> : <ChevronDown size={14} color="#0d9488" />}
      </TouchableOpacity>

      {/* Expanded details */}
      {expanded && (
        <View style={styles.expandedContent}>
          {/* Factor details */}
          <Text style={styles.sectionTitle}>📊 Phân tích chi tiết</Text>
          {data.factors.map(f => {
            const Icon = FACTOR_ICONS[f.key] || TrendingUp;
            const fc = getFactorColor(f.score);
            return (
              <View key={f.key} style={styles.factorCard}>
                <View style={styles.factorHeader}>
                  <View style={[styles.factorIconBox, { backgroundColor: fc + '15' }]}>
                    <Icon size={16} color={fc} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.factorTitleRow}>
                      <Text style={styles.factorName}>{f.label}</Text>
                      <Text style={[styles.factorScore, { color: fc }]}>{f.score}<Text style={styles.factorWeight}>/100</Text></Text>
                    </View>
                    <View style={styles.factorTrack}>
                      <View style={[styles.factorBar, { width: getScoreBarWidth(f.score), backgroundColor: fc }]} />
                    </View>
                  </View>
                </View>
                <Text style={styles.factorDetail}>{f.detail}</Text>
              </View>
            );
          })}

          {/* AI Suggestions */}
          {data.suggestions.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 16 }]}>✨ Gợi ý cải thiện</Text>
              {data.suggestions.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </>
          )}
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
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
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
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
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
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
  },
  scoreCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 7,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
    flexShrink: 0,
  },
  scoreCircleNumber: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  scoreCircleLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  scoreInfo: {
    flex: 1,
  },
  labelBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  labelBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  factorMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  factorMiniLabel: {
    fontSize: 10,
    color: '#64748b',
    width: 80,
  },
  factorMiniTrack: {
    flex: 1,
    height: 5,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  factorMiniBar: {
    height: '100%',
    borderRadius: 3,
  },
  factorMiniScore: {
    fontSize: 10,
    fontWeight: '700',
    width: 24,
    textAlign: 'right',
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
    color: '#0d9488',
    fontWeight: '600',
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 14,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  factorCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  factorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  factorIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  factorTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  factorName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  factorScore: {
    fontSize: 15,
    fontWeight: '800',
  },
  factorWeight: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '400',
  },
  factorTrack: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  factorBar: {
    height: '100%',
    borderRadius: 3,
  },
  factorDetail: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
  tipRow: {
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#16a34a',
  },
  tipText: {
    fontSize: 13,
    color: '#1e293b',
    lineHeight: 18,
  },
  // arc placeholder styles
  arcTrack: {
    position: 'absolute',
    bottom: 0,
  },
  arcCenter: {
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 36,
    fontWeight: '900',
  },
  scoreOf: {
    fontSize: 13,
    color: '#94a3b8',
  },
});

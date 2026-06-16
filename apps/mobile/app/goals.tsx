import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator,
  Animated, Easing, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { apiClient, getAuthToken } from '../lib/http';

// ─── Types ────────────────────────────────────────────────────────────────────
type Priority = 'high' | 'medium' | 'low';
type GoalStatus = 'active' | 'completed' | 'cancelled';

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  percentage: number;
  deadline: string;
  daysRemaining: number;
  priority: Priority;
  status: GoalStatus;
  isCompleted: boolean;
  isOverdue: boolean;
}

interface AIPrediction {
  monthsToGoal: number | null;
  estimatedCompletionDate: string | null;
  isOnTrack: boolean;
  monthlyRequired: number;
  currentMonthlySavings: number;
  shortfallPerMonth: number;
  aiSuggestion: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  high:   { label: 'Cao',       color: '#ef4444', bg: '#fef2f2', icon: 'flag' },
  medium: { label: 'Trung bình', color: '#f59e0b', bg: '#fffbeb', icon: 'flag' },
  low:    { label: 'Thấp',      color: '#64748b', bg: '#f8fafc', icon: 'flag' },
};

// ─── Animated Progress Bar ────────────────────────────────────────────────────
function ProgressBar({ percentage, isCompleted, isOverdue }: { percentage: number; isCompleted: boolean; isOverdue: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.min(percentage, 100),
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const barColor = isCompleted ? '#16a34a' : isOverdue ? '#ef4444' : percentage >= 80 ? '#f59e0b' : '#6366f1';

  return (
    <View style={{ height: 10, backgroundColor: '#f1f5f9', borderRadius: 99, overflow: 'hidden', marginVertical: 6 }}>
      <Animated.View
        style={{
          height: '100%',
          borderRadius: 99,
          backgroundColor: barColor,
          width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}

// ─── Celebration Component ────────────────────────────────────────────────────
function CelebrationBadge() {
  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 6 }).start();
  }, []);
  return (
    <Animated.View style={{ transform: [{ scale }], backgroundColor: '#dcfce7', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Text style={{ fontSize: 14 }}>🎉</Text>
      <Text style={{ fontSize: 12, fontWeight: '700', color: '#16a34a' }}>Hoàn thành!</Text>
    </Animated.View>
  );
}

// ─── Goal Card ────────────────────────────────────────────────────────────────
function GoalCard({ goal, onEdit, onDelete, onContribute }: {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
  onContribute: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [prediction, setPrediction] = useState<AIPrediction | null>(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const cfg = PRIORITY_CONFIG[goal.priority];

  const loadPrediction = async () => {
    if (prediction) { setExpanded(!expanded); return; }
    setExpanded(true);
    setLoadingPrediction(true);
    try {
      const token = await getAuthToken();
      const res = await apiClient.get(`/goals/${goal.id}/prediction`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPrediction(res.data?.data || res.data);
    } catch {
      setPrediction(null);
    } finally {
      setLoadingPrediction(false);
    }
  };

  const deadlineDate = new Date(goal.deadline).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <View style={{
      backgroundColor: 'white',
      borderRadius: 24,
      padding: 20,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: goal.isCompleted ? '#bbf7d0' : goal.isOverdue ? '#fecaca' : '#e2e8f0',
      shadowColor: '#6366f1',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <View style={{ backgroundColor: cfg.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Feather name="flag" size={11} color={cfg.color} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: cfg.color }}>{cfg.label}</Text>
            </View>
            {goal.isCompleted && <CelebrationBadge />}
            {goal.isOverdue && !goal.isCompleted && (
              <View style={{ backgroundColor: '#fef2f2', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#ef4444' }}>⚠ Quá hạn</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#0f172a' }}>{goal.name}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={onEdit} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="edit-2" size={14} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="trash-2" size={14} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress */}
      <ProgressBar percentage={goal.percentage} isCompleted={goal.isCompleted} isOverdue={goal.isOverdue} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 13, color: '#64748b' }}>
          <Text style={{ fontWeight: '700', color: '#1e293b' }}>{goal.currentAmount.toLocaleString('vi-VN')}đ</Text>
          {' / '}{goal.targetAmount.toLocaleString('vi-VN')}đ
        </Text>
        <Text style={{ fontSize: 15, fontWeight: '800', color: goal.isCompleted ? '#16a34a' : '#6366f1' }}>{goal.percentage}%</Text>
      </View>

      {/* Deadline & Days */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Feather name="calendar" size={13} color="#94a3b8" />
          <Text style={{ fontSize: 12, color: '#94a3b8' }}>Hạn: {deadlineDate}</Text>
        </View>
        {!goal.isCompleted && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Feather name="clock" size={13} color={goal.daysRemaining < 30 && !goal.isCompleted ? '#f59e0b' : '#94a3b8'} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: goal.isOverdue ? '#ef4444' : goal.daysRemaining < 30 ? '#f59e0b' : '#64748b' }}>
              {goal.isOverdue ? `Quá ${Math.abs(goal.daysRemaining)} ngày` : `Còn ${goal.daysRemaining} ngày`}
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      {!goal.isCompleted && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={onContribute}
            style={{ flex: 1, backgroundColor: '#6366f1', borderRadius: 14, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
          >
            <Feather name="plus-circle" size={15} color="white" />
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Thêm tiết kiệm</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={loadPrediction}
            style={{ flex: 1, backgroundColor: '#f0f9ff', borderRadius: 14, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#bae6fd' }}
          >
            <MaterialCommunityIcons name="robot-outline" size={15} color="#0284c7" />
            <Text style={{ color: '#0284c7', fontWeight: '700', fontSize: 13 }}>Dự đoán AI</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* AI Prediction Panel */}
      {expanded && (
        <View style={{ marginTop: 14, backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e0f2fe' }}>
          {loadingPrediction ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ActivityIndicator size="small" color="#0284c7" />
              <Text style={{ fontSize: 13, color: '#64748b' }}>Đang phân tích...</Text>
            </View>
          ) : prediction ? (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <MaterialCommunityIcons name="robot-outline" size={16} color="#0284c7" />
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>Dự đoán AI</Text>
                <View style={{ marginLeft: 'auto', backgroundColor: prediction.isOnTrack ? '#dcfce7' : '#fef2f2', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: prediction.isOnTrack ? '#16a34a' : '#ef4444' }}>
                    {prediction.isOnTrack ? '✓ Đúng tiến độ' : '⚠ Cần điều chỉnh'}
                  </Text>
                </View>
              </View>

              {prediction.estimatedCompletionDate && (
                <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
                  <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Ước tính hoàn thành</Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>
                    {prediction.monthsToGoal === 0 ? 'Đã đạt mục tiêu! 🎉' :
                      `Sau ${prediction.monthsToGoal} tháng (${new Date(prediction.estimatedCompletionDate).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })})`}
                  </Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Đang tiết kiệm</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#6366f1' }}>{prediction.currentMonthlySavings.toLocaleString('vi-VN')}đ</Text>
                  <Text style={{ fontSize: 10, color: '#94a3b8' }}>/tháng</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Cần mỗi tháng</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: prediction.isOnTrack ? '#16a34a' : '#f59e0b' }}>{prediction.monthlyRequired.toLocaleString('vi-VN')}đ</Text>
                  <Text style={{ fontSize: 10, color: '#94a3b8' }}>/tháng</Text>
                </View>
                {prediction.shortfallPerMonth > 0 && (
                  <View style={{ flex: 1, backgroundColor: '#fef2f2', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#fecaca', alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Còn thiếu</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#ef4444' }}>{prediction.shortfallPerMonth.toLocaleString('vi-VN')}đ</Text>
                    <Text style={{ fontSize: 10, color: '#94a3b8' }}>/tháng</Text>
                  </View>
                )}
              </View>

              <View style={{ backgroundColor: '#eff6ff', borderRadius: 12, padding: 12, borderLeftWidth: 3, borderLeftColor: '#3b82f6' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1d4ed8', marginBottom: 4 }}>💡 Gợi ý từ AI</Text>
                <Text style={{ fontSize: 13, color: '#334155', lineHeight: 18 }}>{prediction.aiSuggestion}</Text>
              </View>
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: '#94a3b8' }}>Không thể tải dự đoán. Thử lại sau.</Text>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function GoalsScreen() {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Create/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [form, setForm] = useState({ name: '', targetAmount: '', deadline: '', priority: 'medium' as Priority });
  const [saving, setSaving] = useState(false);

  // Contribute Modal
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [contributing, setContributing] = useState(false);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const res = await apiClient.get('/goals', { headers: { Authorization: `Bearer ${token}` } });
      setGoals(res.data?.data || []);
    } catch (e) {
      console.warn('Goals fetch error', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchGoals(); }, []));

  const openCreateModal = () => {
    setEditingGoal(null);
    const tomorrow = new Date();
    tomorrow.setMonth(tomorrow.getMonth() + 6);
    setForm({ name: '', targetAmount: '', deadline: tomorrow.toISOString().split('T')[0], priority: 'medium' });
    setShowModal(true);
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setForm({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      deadline: new Date(goal.deadline).toISOString().split('T')[0],
      priority: goal.priority,
    });
    setShowModal(true);
  };

  const handleSaveGoal = async () => {
    if (!form.name.trim() || !form.targetAmount || !form.deadline) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ tên, số tiền và deadline.');
      return;
    }
    setSaving(true);
    try {
      const token = await getAuthToken();
      const payload = { name: form.name.trim(), targetAmount: Number(form.targetAmount.replace(/\D/g, '')), deadline: form.deadline, priority: form.priority };

      if (editingGoal) {
        await apiClient.patch(`/goals/${editingGoal.id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await apiClient.post('/goals', payload, { headers: { Authorization: `Bearer ${token}` } });
      }
      setShowModal(false);
      fetchGoals();
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Lỗi lưu mục tiêu.';
      Alert.alert('Lỗi', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGoal = (goal: Goal) => {
    Alert.alert(
      'Xoá mục tiêu',
      `Bạn có chắc muốn xoá mục tiêu "${goal.name}"? Các giao dịch liên kết sẽ được giữ lại.`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getAuthToken();
              await apiClient.delete(`/goals/${goal.id}`, { headers: { Authorization: `Bearer ${token}` } });
              fetchGoals();
            } catch {
              Alert.alert('Lỗi', 'Không thể xoá mục tiêu.');
            }
          },
        },
      ]
    );
  };

  const handleContribute = async () => {
    if (!contributeGoal || !contributeAmount) return;
    setContributing(true);
    try {
      const token = await getAuthToken();
      await apiClient.post(
        `/goals/${contributeGoal.id}/contribute`,
        { amount: Number(contributeAmount.replace(/\D/g, '')) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setContributeGoal(null);
      setContributeAmount('');
      fetchGoals();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể đóng góp tiết kiệm.');
    } finally {
      setContributing(false);
    }
  };

  // Stats
  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.isCompleted);
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);

  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
  const sortedGoals = [...goals].sort((a, b) => {
    if (a.isCompleted && !b.isCompleted) return 1;
    if (!a.isCompleted && b.isCompleted) return -1;
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
        <Pressable onPress={() => router.back()} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Feather name="arrow-left" size={20} color="#1e293b" />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>Mục tiêu tài chính</Text>
          <Text style={{ fontSize: 12, color: '#94a3b8' }}>{activeGoals.length} đang hoạt động</Text>
        </View>
        <Pressable
          onPress={openCreateModal}
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' }}
        >
          <Feather name="plus" size={20} color="white" />
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>

        {/* Summary Stats */}
        {goals.length > 0 && (
          <View style={{ backgroundColor: '#6366f1', borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#c7d2fe', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 }}>Tổng quan mục tiêu</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 11, color: '#a5b4fc', marginBottom: 2 }}>Đã tích luỹ</Text>
                <Text style={{ fontSize: 24, fontWeight: '900', color: 'white' }}>{totalSaved.toLocaleString('vi-VN')}đ</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 11, color: '#a5b4fc', marginBottom: 2 }}>Tổng mục tiêu</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#c7d2fe' }}>{totalTarget.toLocaleString('vi-VN')}đ</Text>
              </View>
            </View>
            <View style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 99, overflow: 'hidden' }}>
              <View style={{ height: '100%', borderRadius: 99, backgroundColor: 'white', width: `${totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : 0}%` }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: 'white' }}>{activeGoals.length}</Text>
                <Text style={{ fontSize: 11, color: '#a5b4fc' }}>Đang chạy</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#86efac' }}>{completedGoals.length}</Text>
                <Text style={{ fontSize: 11, color: '#a5b4fc' }}>Hoàn thành</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: 'white' }}>{goals.length}</Text>
                <Text style={{ fontSize: 11, color: '#a5b4fc' }}>Tổng cộng</Text>
              </View>
            </View>
          </View>
        )}

        {/* Limit Warning */}
        {activeGoals.length >= 5 && (
          <View style={{ backgroundColor: '#fffbeb', borderRadius: 14, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#fde68a', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="alert-triangle" size={16} color="#f59e0b" />
            <Text style={{ fontSize: 13, color: '#92400e', flex: 1 }}>Bạn đã đạt giới hạn 5 mục tiêu. Hoàn thành hoặc xoá mục tiêu cũ để tạo mới.</Text>
          </View>
        )}

        {/* Loading */}
        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center', gap: 12 }}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={{ fontSize: 14, color: '#94a3b8' }}>Đang tải mục tiêu...</Text>
          </View>
        ) : goals.length === 0 ? (
          <View style={{ paddingVertical: 60, alignItems: 'center', gap: 16 }}>
            <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="target" size={40} color="#6366f1" />
            </View>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#1e293b' }}>Chưa có mục tiêu nào</Text>
              <Text style={{ fontSize: 14, color: '#94a3b8', textAlign: 'center' }}>Hãy tạo mục tiêu tài chính đầu tiên của bạn để bắt đầu hành trình tiết kiệm!</Text>
            </View>
            <Pressable onPress={openCreateModal} style={{ backgroundColor: '#6366f1', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 28, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="plus" size={18} color="white" />
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Tạo mục tiêu đầu tiên</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            {sortedGoals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={() => openEditModal(goal)}
                onDelete={() => handleDeleteGoal(goal)}
                onContribute={() => { setContributeGoal(goal); setContributeAmount(''); }}
              />
            ))}
            <View style={{ height: 30 }} />
          </View>
        )}
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '90%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <View>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a' }}>{editingGoal ? 'Sửa mục tiêu' : 'Tạo mục tiêu mới'}</Text>
                  {!editingGoal && <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Còn {5 - activeGoals.length} slot trống</Text>}
                </View>
                <TouchableOpacity onPress={() => setShowModal(false)} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="x" size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Name */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 }}>Tên mục tiêu *</Text>
                <TextInput
                  value={form.name}
                  onChangeText={v => setForm(f => ({ ...f, name: v }))}
                  placeholder="VD: Mua xe, Du lịch Nhật, Mua điện thoại..."
                  placeholderTextColor="#94a3b8"
                  style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 14, fontSize: 15, color: '#0f172a', marginBottom: 16, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}) }}
                />

                {/* Target Amount */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 }}>Số tiền mục tiêu *</Text>
                <View style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <TextInput
                    value={form.targetAmount ? Number(form.targetAmount.replace(/\D/g, '')).toLocaleString('vi-VN') : ''}
                    onChangeText={v => setForm(f => ({ ...f, targetAmount: v.replace(/\D/g, '') }))}
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    style={{ flex: 1, fontSize: 15, fontWeight: '700', color: '#0f172a', ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}) }}
                  />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#94a3b8' }}>đ</Text>
                </View>

                {/* Deadline */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 }}>Deadline *</Text>
                <TextInput
                  value={form.deadline}
                  onChangeText={v => setForm(f => ({ ...f, deadline: v }))}
                  placeholder="YYYY-MM-DD (VD: 2025-12-31)"
                  placeholderTextColor="#94a3b8"
                  style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 14, fontSize: 15, color: '#0f172a', marginBottom: 16, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}) }}
                />

                {/* Priority */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 10 }}>Mức độ ưu tiên</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
                  {(['high', 'medium', 'low'] as Priority[]).map(p => {
                    const cfg = PRIORITY_CONFIG[p];
                    const selected = form.priority === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        onPress={() => setForm(f => ({ ...f, priority: p }))}
                        style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: selected ? cfg.color : '#f8fafc', borderWidth: 1.5, borderColor: selected ? cfg.color : '#e2e8f0' }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: selected ? 'white' : '#64748b' }}>{cfg.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Submit */}
                <TouchableOpacity
                  onPress={handleSaveGoal}
                  disabled={saving}
                  style={{ backgroundColor: '#6366f1', borderRadius: 16, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                >
                  {saving ? <ActivityIndicator size="small" color="white" /> : <Feather name={editingGoal ? 'check' : 'plus'} size={18} color="white" />}
                  <Text style={{ color: 'white', fontWeight: '800', fontSize: 15 }}>{editingGoal ? 'Lưu thay đổi' : 'Tạo mục tiêu'}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Contribute Modal */}
      <Modal visible={!!contributeGoal} animationType="slide" transparent onRequestClose={() => setContributeGoal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>Thêm tiết kiệm</Text>
                  <Text style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>{contributeGoal?.name}</Text>
                </View>
                <TouchableOpacity onPress={() => setContributeGoal(null)} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="x" size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              {contributeGoal && (
                <View style={{ backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 13, color: '#64748b' }}>Hiện tại:</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>{contributeGoal.currentAmount.toLocaleString('vi-VN')}đ / {contributeGoal.targetAmount.toLocaleString('vi-VN')}đ</Text>
                  </View>
                  <ProgressBar percentage={contributeGoal.percentage} isCompleted={contributeGoal.isCompleted} isOverdue={contributeGoal.isOverdue} />
                  <Text style={{ textAlign: 'right', fontSize: 13, fontWeight: '700', color: '#6366f1' }}>{contributeGoal.percentage}%</Text>
                </View>
              )}

              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8 }}>Số tiền đóng góp</Text>
              <View style={{ backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#6366f1', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <TextInput
                  value={contributeAmount ? Number(contributeAmount.replace(/\D/g, '')).toLocaleString('vi-VN') : ''}
                  onChangeText={v => setContributeAmount(v.replace(/\D/g, ''))}
                  placeholder="0"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  autoFocus
                  style={{ flex: 1, fontSize: 20, fontWeight: '800', color: '#0f172a', ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}) }}
                />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#6366f1' }}>đ</Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity onPress={() => setContributeGoal(null)} style={{ flex: 1, backgroundColor: '#f1f5f9', borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}>
                  <Text style={{ color: '#64748b', fontWeight: '700' }}>Huỷ</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleContribute}
                  disabled={contributing || !contributeAmount}
                  style={{ flex: 2, backgroundColor: '#6366f1', borderRadius: 14, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, opacity: contributing || !contributeAmount ? 0.6 : 1 }}
                >
                  {contributing ? <ActivityIndicator size="small" color="white" /> : <Feather name="check" size={18} color="white" />}
                  <Text style={{ color: 'white', fontWeight: '800', fontSize: 15 }}>Xác nhận</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// Refactored: chore(goals): add tests for savings goals progress calculations

// Refactored: chore(goals): add tests for savings goals progress calculations

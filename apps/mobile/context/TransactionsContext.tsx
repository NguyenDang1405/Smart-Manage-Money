import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient, getAuthToken, setAuthToken, setOnUnauthorizedCallback, setGetTokenFunction } from '../lib/http';
import { useAuth } from '@clerk/clerk-expo';

export type Transaction = {
  id: string;
  type: 'expense' | 'income' | 'savings';
  amount: number;
  category: string;
  date: string;
  note: string;
  time?: string;
  receiptUrl?: string | null;
};

type TransactionsContextType = {
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>, formData?: any) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  fetchMoreTransactions: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  activeTab: 'all' | 'income' | 'expense' | 'savings';
  setActiveTab: (val: 'all' | 'income' | 'expense' | 'savings') => void;
  startDate: string | null;
  setStartDate: (val: string | null) => void;
  endDate: string | null;
  setEndDate: (val: string | null) => void;
  selectedCategories: string[];
  setSelectedCategories: (cats: string[]) => void;
  stats: { totalIncome: number; totalExpense: number; currentBalance: number };
  login: (newToken: string) => Promise<void>;
  logout: () => Promise<void>;
  userProfile: any | null;
  setUserProfile: React.Dispatch<React.SetStateAction<any | null>>;
  fetchUserProfile: () => Promise<void>;
  localAvatarOverride: string | null;
  setLocalAvatarOverride: (url: string | null) => void;
};

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export const TransactionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const { isLoaded, userId, getToken, signOut } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expense' | 'savings'>('all');
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [stats, setStats] = useState({ totalIncome: 0, totalExpense: 0, currentBalance: 0 });

  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [localAvatarOverride, setLocalAvatarOverride] = useState<string | null>(null);

  const fetchUserProfile = async () => {
    try {
      const response = await apiClient.get('/users/profile');
      const data = response.data?.data || response.data;
      if (data) {
        setUserProfile(data);
      }
    } catch (error) {
      console.warn("Lỗi fetch user profile ở Context:", error);
    }
  };

  const login = async (newToken: string) => {
    await setAuthToken(newToken);
    setToken(newToken);
    // Reset previous lists and stats to avoid data leaks
    setTransactions([]);
    setStats({ totalIncome: 0, totalExpense: 0, currentBalance: 0 });
    // Let the useEffect handle the automatic refresh or execute it immediately
    await refreshTransactions();
  };

  const logout = async () => {
    try {
      await signOut();
    } catch (e) {
      console.warn("SignOut error", e);
    }
    await setAuthToken(null);
    setToken(null);
    setUserProfile(null);
    setLocalAvatarOverride(null);
    setTransactions([]);
    setStats({ totalIncome: 0, totalExpense: 0, currentBalance: 0 });
    router.replace('/auth');
  };

  const buildQueryParams = (targetPage: number) => {
    let url = `/transactions?page=${targetPage}&limit=10`;
    if (activeTab !== 'all') {
      url += `&type=${activeTab}`;
    }
    if (searchQuery.trim()) {
      url += `&search=${encodeURIComponent(searchQuery.trim())}`;
    }
    if (startDate) {
      url += `&startDate=${encodeURIComponent(startDate)}`;
    }
    if (endDate) {
      url += `&endDate=${encodeURIComponent(endDate)}`;
    }
    if (selectedCategories.length > 0) {
      url += `&categories=${encodeURIComponent(selectedCategories.join(','))}`;
    }
    return url;
  };

  const refreshTransactions = async () => {
    // Only query if authenticated
    const currentToken = token || (await getAuthToken());
    if (!currentToken) {
      return;
    }

    setIsLoading(true);
    try {
      const url = buildQueryParams(1);
      const listRes = await apiClient.get(url);
      const listData = listRes.data?.data || listRes.data;
      const meta = listRes.data?.meta;

      if (Array.isArray(listData)) {
        const mapped: Transaction[] = listData.map((item: any) => {
          const dateObj = new Date(item.transactionDate || item.createdAt);
          const isToday = dateObj.toDateString() === new Date().toDateString();
          const dateText = isToday 
            ? 'Hôm nay'
            : dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

          return {
            id: item.id.toString(),
            type: item.type === 'saving' ? 'savings' : item.type,
            amount: Number(item.amount),
            category: item.category?.nameVi || item.category?.name || 'Khác',
            date: dateText,
            note: item.note || item.description || 'Giao dịch',
            time: dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            receiptUrl: item.receiptUrl || null,
          };
        });
        setTransactions(mapped);
        setPage(1);
        if (meta) {
          setStats({
            totalIncome: Number(meta.totalIncome) || 0,
            totalExpense: Number(meta.totalExpense) || 0,
            currentBalance: Number(meta.currentBalance) || 0,
          });
        }
        if (meta && !meta.hasNextPage) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      }
    } catch (err) {
      console.warn('Lỗi refresh server data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger refresh when filters change or token changes (with debounce for search)
  useEffect(() => {
    const timer = setTimeout(() => {
      refreshTransactions();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, startDate, endDate, selectedCategories, token]);

  // Khởi tạo phiên làm việc với Backend API
  useEffect(() => {
    // Đăng ký callback khi token hết hạn
    setOnUnauthorizedCallback(() => {
      logout();
      Alert.alert('Phiên hết hạn', 'Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại.');
    });
  }, []);

  // Đăng ký hàm lấy token động để tự động làm mới JWT trước mỗi API request
  useEffect(() => {
    if (isLoaded && userId) {
      setGetTokenFunction(getToken);
    } else {
      setGetTokenFunction(null);
    }
  }, [isLoaded, userId, getToken]);

  // Đồng bộ trạng thái Auth của Clerk với Backend
  useEffect(() => {
    async function syncClerkAuth() {
      if (!isLoaded) return;

      if (userId) {
        setIsLoading(true);
        try {
          const clerkToken = await getToken();
          if (clerkToken) {
            await setAuthToken(clerkToken);
            setToken(clerkToken);
            await fetchUserProfile();
            await refreshTransactions();
          }
        } catch (err) {
          console.warn('Lỗi đồng bộ Clerk token:', err);
        } finally {
          setIsLoading(false);
        }
      } else {
        await setAuthToken(null);
        setToken(null);
        setUserProfile(null);
        setLocalAvatarOverride(null);
        setTransactions([]);
        setStats({ totalIncome: 0, totalExpense: 0, currentBalance: 0 });
        router.replace('/auth');
      }
    }

    syncClerkAuth();
  }, [isLoaded, userId]);

  const fetchMoreTransactions = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const url = buildQueryParams(nextPage);
      const listRes = await apiClient.get(url);
      const listData = listRes.data?.data || listRes.data;
      const meta = listRes.data?.meta;

      if (Array.isArray(listData) && listData.length > 0) {
        const mapped: Transaction[] = listData.map((item: any) => {
          const dateObj = new Date(item.transactionDate || item.createdAt);
          const isToday = dateObj.toDateString() === new Date().toDateString();
          const dateText = isToday 
            ? 'Hôm nay'
            : dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

          return {
            id: item.id.toString(),
            type: item.type === 'saving' ? 'savings' : item.type,
            amount: Number(item.amount),
            category: item.category?.nameVi || item.category?.name || 'Khác',
            date: dateText,
            note: item.note || item.description || 'Giao dịch',
            time: dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            receiptUrl: item.receiptUrl || null,
          };
        });
        setTransactions((prev) => [...prev, ...mapped]);
        setPage(nextPage);
        if (meta && !meta.hasNextPage) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.warn('Lỗi fetch more:', err);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const addTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const txWithId: Transaction = {
      ...newTx,
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      date: 'Hôm nay',
    };
    setTransactions((prev) => [txWithId, ...prev]);
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>, formData?: any) => {
    // Optimistic UI Update
    const previousTransactions = [...transactions];
    setTransactions((prev) => 
      prev.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx))
    );

    try {
      if (formData) {
        // FormData: phải xóa Content-Type mặc định để browser tự set multipart/form-data + boundary
        await apiClient.patch(`/transactions/${id}`, formData, {
          headers: { 'Content-Type': undefined },
        });
      } else {
        await apiClient.patch(`/transactions/${id}`, updates);
      }
      // Refresh từ server để lấy data mới nhất (bao gồm receiptUrl)
      await refreshTransactions();
    } catch (error) {
      console.error('Lỗi khi cập nhật giao dịch:', error);
      // Rollback on failure
      setTransactions(previousTransactions);
      Alert.alert("Lỗi", "Không thể cập nhật giao dịch lúc này. Vui lòng thử lại sau.");
      throw error;
    }
  };

  const deleteTransaction = async (id: string) => {
    // Optimistic UI Update
    const previousTransactions = [...transactions];
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
    
    try {
      await apiClient.delete(`/transactions/${id}`);
      // Đồng bộ lại danh sách từ database sau khi xóa thành công
      await refreshTransactions();
    } catch (error) {
      console.error('Lỗi khi xoá giao dịch:', error);
      // Rollback on failure
      setTransactions(previousTransactions);
      Alert.alert("Lỗi", "Không thể xoá giao dịch lúc này. Vui lòng thử lại sau.");
      throw error;
    }
  };

  return (
    <TransactionsContext.Provider 
      value={{ 
        transactions, 
        addTransaction,
        updateTransaction,
        deleteTransaction, 
        isLoading, 
        isLoadingMore, 
        hasMore, 
        fetchMoreTransactions,
        refreshTransactions,
        searchQuery,
        setSearchQuery,
        activeTab,
        setActiveTab,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        selectedCategories,
        setSelectedCategories,
        stats,
        login,
        logout,
        userProfile,
        setUserProfile,
        fetchUserProfile,
        localAvatarOverride,
        setLocalAvatarOverride,
      }}
    >
      {children}
    </TransactionsContext.Provider>
  );
};

export const useTransactions = () => {
  const context = useContext(TransactionsContext);
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionsProvider');
  }
  return context;
};

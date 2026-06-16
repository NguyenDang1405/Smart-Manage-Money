import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Alert, 
  RefreshControl,
  Modal,
  TextInput,
  Linking,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Text } from '@/components/ui/text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTransactions } from '../context/TransactionsContext';
import AppBottomTab from '../components/AppBottomTab';
import { apiClient } from '../lib/http';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ----------------------------------------------------
// Translations object for high-fidelity bilingual support
// ----------------------------------------------------
const translations = {
  vi: {
    greeting: "Xin chào",
    memberSince: "Thành viên từ",
    statsTransactions: "Số giao dịch",
    statsSavings: "Tổng tiết kiệm",
    statsStreak: "Streak",
    
    sectionAccount: "Tài khoản",
    personalInfo: "Thông tin cá nhân",
    changePassword: "Đổi mật khẩu",
    notifications: "Thông báo",
    
    sectionData: "Dữ liệu",
    exportPdf: "Export báo cáo PDF/Excel",
    importCsv: "Import CSV",
    deleteData: "Xóa dữ liệu",
    
    sectionAiApp: "AI & Ứng dụng",
    language: "Ngôn ngữ",
    customCategories: "Danh mục tùy chỉnh",
    apiSettings: "API Settings",
    
    sectionInfo: "Thông tin",
    appVersion: "Phiên bản app",
    termsPolicies: "Điều khoản & Chính sách",
    contactSupport: "Liên hệ hỗ trợ",
    logout: "Đăng xuất",
    
    // Change Password Modal
    changePwTitle: "Đổi mật khẩu",
    currentPwLabel: "Mật khẩu hiện tại",
    newPwLabel: "Mật khẩu mới",
    newPwPlaceholder: "Ít nhất 6 ký tự",
    confirmPwLabel: "Xác nhận mật khẩu mới",
    btnCancel: "Hủy",
    btnSave: "Lưu lại",
    btnSaving: "Đang lưu...",
    errEmptyPw: "Vui lòng điền đầy đủ các trường thông tin.",
    errShortPw: "Mật khẩu mới phải có ít nhất 6 ký tự.",
    errMismatchPw: "Mật khẩu xác nhận không khớp.",
    successPw: "Đổi mật khẩu thành công!",
    failPw: "Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.",
    
    // Category Modal
    catTitle: "Quản lý danh mục",
    catCreateTitle: "Tạo danh mục tùy chỉnh",
    catNamePlaceholder: "Tên danh mục...",
    catIconSelect: "Chọn biểu tượng",
    catColorSelect: "Chọn màu sắc",
    catBtnAdd: "Thêm mới",
    catEmptyName: "Vui lòng nhập tên danh mục",
    catSuccessCreate: "Đã tạo danh mục thành công!",
    catFailCreate: "Không thể tạo danh mục tùy chỉnh.",
    catListTitle: "Danh mục hiện có",
    catSystemTag: "Mặc định",
    catCustomTag: "Tùy chỉnh",
    
    // API Modal
    apiTitle: "Cấu hình API & AI",
    apiServerLabel: "Đường dẫn API Backend",
    apiModelLabel: "Model Trợ lý AI",
    apiTempLabel: "Độ sáng tạo (Temperature)",
    apiSuccessSave: "Đã lưu cấu hình API thành công!",
    apiFailSave: "Không thể lưu cấu hình API.",
    
    // Support Modal
    supportTitle: "Liên hệ hỗ trợ",
    supportAiTitle: "Trợ lý AI Trực tuyến",
    supportAiDesc: "Chat với AI giải đáp mọi thắc mắc 24/7",
    supportEmailTitle: "Gửi Email Hỗ trợ",
    supportEmailDesc: "support@smartmoney.com (Phản hồi nhanh)",
    supportHotlineTitle: "Hotline Khách hàng",
    supportHotlineDesc: "1900 1234 (Cước phí 1,000đ/phút)",

    // Language Modal
    langTitle: "Chọn ngôn ngữ",
    langDesc: "Vui lòng lựa chọn ngôn ngữ bạn muốn sử dụng:",
    langVi: "Tiếng Việt 🇻🇳",
    langEn: "English 🇺🇸",
    
    // PDF Export
    pdfEmptyTx: "Bạn chưa có giao dịch nào để xuất báo cáo.",
    pdfSuccess: "Báo cáo tài chính đã sẵn sàng!",
    pdfFail: "Không thể tạo báo cáo PDF. Vui lòng thử lại.",
    pdfDocTitle: "BÁO CÁO TÀI CHÍNH",
    pdfExportDate: "Xuất ngày",
    pdfUser: "Người sử dụng",
    pdfTxCount: "Số giao dịch",
    pdfTotalSaved: "Tổng tiết kiệm",
    pdfColDate: "Ngày",
    pdfColCategory: "Hạng mục",
    pdfColDesc: "Ghi chú",
    pdfColType: "Loại",
    pdfColAmount: "Số tiền",
    pdfIncome: "Thu nhập",
    pdfExpense: "Chi tiêu",
    pdfSaving: "Tiết kiệm",
    pdfFooter: "Báo cáo này được tạo tự động bởi ứng dụng Smart Money Manager.",
    pdfSaveTitle: "Lưu báo cáo tài chính PDF",
    exportPdfTitle: "Xuất báo cáo PDF",
    exportPdfDesc: "Vui lòng chọn loại báo cáo bạn muốn xuất:",
    exportPdfTransactions: "Báo cáo giao dịch",
    exportPdfTransactionsDesc: "Danh sách chi tiết tất cả giao dịch gần đây.",
    exportPdfAi: "Phân tích tài chính AI",
    exportPdfAiDesc: "Tóm tắt thu chi, tích lũy, chi tiêu theo hạng mục.",
    exportPdfFull: "Báo cáo đầy đủ",
    exportPdfFullDesc: "Bao gồm cả phân tích AI và nhật ký giao dịch.",
    
    // Alerts
    alertLogoutTitle: "Đăng xuất",
    alertLogoutConfirm: "Bạn có chắc chắn muốn đăng xuất?",
    alertDeleteDataTitle: "Xóa dữ liệu",
    alertDeleteDataConfirm: "Bạn có chắc chắn muốn xóa toàn bộ dữ liệu giao dịch? Hành động này không thể hoàn tác.",
    alertDeleteDataSuccess: "Đã xóa dữ liệu giao dịch thành công. (Demo)",
    alertNotificationTitle: "Cài đặt thông báo",
    alertNotificationSuccess: "Đăng ký nhận thông báo đẩy phân tích tài chính hàng ngày thành công!",
    alertUpdateTitle: "Cập nhật phiên bản",
    alertUpdateSuccess: "Ứng dụng của bạn đang ở phiên bản mới nhất (v2.4.0).",
    
    // Common
    cancel: "Hủy",
    ok: "Đồng ý",
  },
  en: {
    greeting: "Hello",
    memberSince: "Member since",
    statsTransactions: "Transactions",
    statsSavings: "Total Saved",
    statsStreak: "Streak",
    
    sectionAccount: "Account",
    personalInfo: "Personal Profile",
    changePassword: "Change Password",
    notifications: "Notifications",
    
    sectionData: "Data",
    exportPdf: "Export PDF/Excel report",
    importCsv: "Import CSV",
    deleteData: "Delete data",
    
    sectionAiApp: "AI & Application",
    language: "Language",
    customCategories: "Custom Categories",
    apiSettings: "API Settings",
    
    sectionInfo: "Information",
    appVersion: "App version",
    termsPolicies: "Terms & Policies",
    contactSupport: "Contact Support",
    logout: "Logout",
    
    // Change Password Modal
    changePwTitle: "Change Password",
    currentPwLabel: "Current Password",
    newPwLabel: "New Password",
    newPwPlaceholder: "Min 6 characters",
    confirmPwLabel: "Confirm New Password",
    btnCancel: "Cancel",
    btnSave: "Save Change",
    btnSaving: "Saving...",
    errEmptyPw: "Please fill in all fields.",
    errShortPw: "New password must be at least 6 characters.",
    errMismatchPw: "Confirm password does not match.",
    successPw: "Password changed successfully!",
    failPw: "Failed to change password. Please check your current password.",
    
    // Category Modal
    catTitle: "Category Management",
    catCreateTitle: "Create Custom Category",
    catNamePlaceholder: "Category name...",
    catIconSelect: "Select Icon",
    catColorSelect: "Select Color",
    catBtnAdd: "Add Category",
    catEmptyName: "Please enter category name",
    catSuccessCreate: "Category created successfully!",
    catFailCreate: "Could not create custom category.",
    catListTitle: "Existing Categories",
    catSystemTag: "System",
    catCustomTag: "Custom",
    
    // API Modal
    apiTitle: "API & AI Settings",
    apiServerLabel: "Backend API URL",
    apiModelLabel: "AI Assistant Model",
    apiTempLabel: "Creativity (Temperature)",
    apiSuccessSave: "API settings saved successfully!",
    apiFailSave: "Failed to save API settings.",
    
    // Support Modal
    supportTitle: "Contact Support",
    supportAiTitle: "Online AI Assistant",
    supportAiDesc: "Chat with AI to answer all questions 24/7",
    supportEmailTitle: "Send Support Email",
    supportEmailDesc: "support@smartmoney.com (Quick response)",
    supportHotlineTitle: "Customer Hotline",
    supportHotlineDesc: "1900 1234 (1,000 VND/min fee)",

    // Language Modal
    langTitle: "Select Language",
    langDesc: "Please choose your preferred language:",
    langVi: "Tiếng Việt 🇻🇳",
    langEn: "English 🇺🇸",
    
    // PDF Export
    pdfEmptyTx: "You don't have any transactions to export.",
    pdfSuccess: "Financial report is ready!",
    pdfFail: "Could not create PDF report. Please try again.",
    pdfDocTitle: "FINANCIAL REPORT",
    pdfExportDate: "Export Date",
    pdfUser: "User",
    pdfTxCount: "Transactions",
    pdfTotalSaved: "Total Saved",
    pdfColDate: "Date",
    pdfColCategory: "Category",
    pdfColDesc: "Note/Desc",
    pdfColType: "Type",
    pdfColAmount: "Amount",
    pdfIncome: "Income",
    pdfExpense: "Expense",
    pdfSaving: "Saving",
    pdfFooter: "This report is generated automatically by Smart Money Manager.",
    pdfSaveTitle: "Save Financial PDF Report",
    exportPdfTitle: "Export PDF Report",
    exportPdfDesc: "Please choose the report type you want to export:",
    exportPdfTransactions: "Transactions Report",
    exportPdfTransactionsDesc: "Detailed list of all your recent transactions.",
    exportPdfAi: "AI Financial Report",
    exportPdfAiDesc: "Summary of income, expenses, and category spending.",
    exportPdfFull: "Combined Full Report",
    exportPdfFullDesc: "Includes both AI summary and detailed transactions.",
    
    // Alerts
    alertLogoutTitle: "Logout",
    alertLogoutConfirm: "Are you sure you want to log out?",
    alertDeleteDataTitle: "Delete Data",
    alertDeleteDataConfirm: "Are you sure you want to delete all transaction data? This action cannot be undone.",
    alertDeleteDataSuccess: "Transaction data deleted successfully. (Demo)",
    alertNotificationTitle: "Notification Settings",
    alertNotificationSuccess: "Successfully registered for daily AI financial analysis push notifications!",
    alertUpdateTitle: "App Update",
    alertUpdateSuccess: "Your app is up to date (v2.4.0).",
    
    // Common
    cancel: "Cancel",
    ok: "Confirm",
  }
};

export default function ProfileScreen() {
  const router = useRouter();
  const { logout } = useTransactions();
  const [userProfile, setUserProfile] = useState<any>(null);
  const baseUrl = Platform.OS === 'web' ? 'http://localhost:4000' : (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000');
  const [refreshing, setRefreshing] = useState(false);

  // Language state (default to Vietnamese)
  const [langCode, setLangCode] = useState<'vi' | 'en'>('vi');
  const t = translations[langCode];

  // Modals visibility states
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  
  // API settings state
  const [apiServer, setApiServer] = useState('http://localhost:4000');
  const [aiModel, setAiModel] = useState('gemini-1.5-flash');
  const [temperature, setTemperature] = useState('0.7');

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Custom categories state
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#0d9488');
  const [newCatIcon, setNewCatIcon] = useState('grid');

  // Category filter state
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'custom'>('all');

  const fetchProfile = async () => {
    try {
      const res = await apiClient.get('/users/profile');
      const data = res.data?.data || res.data;
      setUserProfile(data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/categories');
      const data = res.data?.data || res.data || [];
      setCategoriesList(data);
    } catch (e) {
      console.error('Failed to fetch categories:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      fetchCategories();
    }, [])
  );

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedLang = await AsyncStorage.getItem('APP_LANGUAGE');
        if (storedLang === 'en' || storedLang === 'vi') {
          setLangCode(storedLang as 'vi' | 'en');
        }

        const storedServer = await AsyncStorage.getItem('API_SERVER');
        const storedModel = await AsyncStorage.getItem('AI_MODEL');
        const storedTemp = await AsyncStorage.getItem('AI_TEMPERATURE');
        if (storedServer) setApiServer(storedServer);
        if (storedModel) setAiModel(storedModel);
        if (storedTemp) setTemperature(storedTemp);
      } catch (e) {
        console.error('Failed to load settings from storage:', e);
      }
    };
    loadSettings();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    await fetchCategories();
    setRefreshing(false);
  };

  // Cross-platform custom showToast/showAlert/confirmDialog utility
  const showToast = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    if (Platform.OS === 'web') {
      const isConfirmed = window.confirm(`${title}\n\n${message}`);
      if (isConfirmed) {
        onConfirm();
      }
    } else {
      Alert.alert(
        title,
        message,
        [
          { text: t.cancel, style: "cancel" },
          { text: t.ok, style: "destructive", onPress: onConfirm }
        ]
      );
    }
  };

  const handleLogout = () => {
    confirmAction(
      t.alertLogoutTitle,
      t.alertLogoutConfirm,
      logout
    );
  };

  const navigateToEdit = () => {
    router.push('/edit-profile');
  };

  const navigateToImport = () => {
    router.push('/import-data');
  };

  const handleToggleNotifications = () => {
    showToast(t.alertNotificationTitle, t.alertNotificationSuccess);
  };

  const handleCheckVersion = () => {
    showToast(t.alertUpdateTitle, t.alertUpdateSuccess);
  };

  const handleSaveApiSettings = async () => {
    try {
      await AsyncStorage.setItem('API_SERVER', apiServer);
      await AsyncStorage.setItem('AI_MODEL', aiModel);
      await AsyncStorage.setItem('AI_TEMPERATURE', temperature);
      setShowApiModal(false);
      showToast('✅ ' + t.ok, t.apiSuccessSave);
    } catch (e) {
      showToast('Lỗi / Error', t.apiFailSave);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) {
      showToast('Lỗi / Error', t.catEmptyName);
      return;
    }
    try {
      setRefreshing(true);
      await apiClient.post('/categories', {
        name: newCatName,
        nameVi: newCatName,
        icon: newCatIcon,
        color: newCatColor,
      });
      setNewCatName('');
      await fetchCategories();
      setRefreshing(false);
      showToast('✅ ' + t.ok, `${t.catSuccessCreate} "${newCatName}"`);
    } catch (e) {
      setRefreshing(false);
      showToast('Lỗi / Error', t.catFailCreate);
    }
  };

  const handleSavePasswordChange = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      showToast('Lỗi / Error', t.errEmptyPw);
      return;
    }
    if (newPassword.length < 6) {
      showToast('Lỗi / Error', t.errShortPw);
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Lỗi / Error', t.errMismatchPw);
      return;
    }

    setSavingPassword(true);
    try {
      await apiClient.patch('/users/change-password', {
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });
      setSavingPassword(false);
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('✅ ' + t.ok, t.successPw);
    } catch (pwErr: any) {
      setSavingPassword(false);
      const msg = pwErr?.response?.data?.message || '';
      const friendlyMsg = msg === 'Current password is incorrect'
        ? t.failPw
        : msg || t.failPw;
      showToast('❌ ' + t.changePwTitle, friendlyMsg);
    }
  };

  const handleExportPDF = async (type: 'transactions' | 'ai' | 'full') => {
    try {
      setShowExportModal(false);
      setRefreshing(true);

      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      const monthStr = `${currentMonth}/${currentYear}`;

      let txs: any[] = [];
      let aiReport: any = null;

      // 1. Fetch necessary data depending on type
      if (type === 'transactions' || type === 'full') {
        try {
          const res = await apiClient.get('/transactions');
          txs = res.data?.data || res.data || [];
        } catch (txErr) {
          console.error("Failed to fetch transactions for PDF:", txErr);
        }
      }

      if (type === 'ai' || type === 'full') {
        try {
          const res = await apiClient.get(`/reports/monthly?month=${monthStr}`);
          aiReport = res.data?.data || res.data;
        } catch (e) {
          console.error("Failed to fetch monthly report for PDF:", e);
        }
      }

      // Check empty state
      if (type === 'transactions' && txs.length === 0) {
        showToast("Smart Money Manager", t.pdfEmptyTx);
        setRefreshing(false);
        return;
      }

      if (type === 'ai' && (!aiReport || !aiReport.categorySpending || aiReport.categorySpending.length === 0)) {
        showToast("Smart Money Manager", langCode === 'vi' ? 'Không có dữ liệu báo cáo tháng này để xuất.' : 'No report data for this month to export.');
        setRefreshing(false);
        return;
      }

      // Compute total saving for transactions
      const totalSavingVal = userProfile?.stats?.totalSaved || 0;

      // Define CSS styles
      const htmlStyle = `
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              padding: 30px;
              color: #334155;
              background-color: #ffffff;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 3px solid #0d9488;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: 800;
              color: #0d9488;
              letter-spacing: -0.5px;
            }
            .title {
              text-align: right;
            }
            .title h1 {
              margin: 0;
              font-size: 22px;
              color: #1e293b;
              font-weight: 700;
            }
            .title p {
              margin: 5px 0 0 0;
              font-size: 12px;
              color: #64748b;
              font-weight: 500;
            }
            .section-title {
              font-size: 14px;
              font-weight: 700;
              color: #0f172a;
              margin-top: 30px;
              margin-bottom: 15px;
              padding-bottom: 5px;
              border-bottom: 1.5px solid #e2e8f0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .summary-box {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 20px;
              margin-bottom: 25px;
              display: flex;
              justify-content: space-around;
            }
            .summary-item {
              text-align: center;
              flex: 1;
            }
            .summary-item:not(:last-child) {
              border-right: 1px solid #e2e8f0;
            }
            .summary-item h3 {
              margin: 0 0 5px 0;
              font-size: 10px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-weight: 700;
            }
            .summary-item p {
              margin: 0;
              font-size: 18px;
              font-weight: 800;
            }
            .summary-item p.val-teal {
              color: #0d9488;
            }
            .summary-item p.val-red {
              color: #ef4444;
            }
            .summary-item p.val-slate {
              color: #334155;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 25px;
            }
            th, td {
              padding: 10px 12px;
              text-align: left;
              border-bottom: 1px solid #e2e8f0;
            }
            th {
              background-color: #f1f5f9;
              font-weight: 700;
              color: #475569;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            td {
              font-size: 13px;
              color: #334155;
            }
            .amount {
              text-align: right;
              font-weight: 700;
            }
            .amount.income {
              color: #10b981;
            }
            .amount.expense {
              color: #ef4444;
            }
            .amount.saving {
              color: #3b82f6;
            }
            .footer {
              text-align: center;
              font-size: 11px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 20px;
              margin-top: 50px;
            }
            .badge-custom {
              background-color: #f0fdfa;
              color: #0d9488;
              border: 1px solid #ccfbf1;
              padding: 3px 8px;
              border-radius: 9999px;
              font-size: 11px;
              font-weight: 700;
              display: inline-block;
            }
          </style>
        </head>
      `;

      // Helper function to format currency
      const formatCurrency = (val: number) => {
        return Number(val).toLocaleString(langCode === 'vi' ? 'vi-VN' : 'en-US') + ' đ';
      };

      let htmlBody = '';

      // Add Header
      const formattedDate = new Date().toLocaleDateString(langCode === 'vi' ? 'vi-VN' : 'en-US');
      const docTitle = type === 'transactions' 
        ? (langCode === 'vi' ? 'BÁO CÁO GIAO DỊCH CHI TIẾT' : 'DETAILED TRANSACTIONS REPORT')
        : type === 'ai'
        ? (langCode === 'vi' ? 'BÁO CÁO PHÂN TÍCH TÀI CHÍNH AI' : 'AI FINANCIAL ANALYSIS REPORT')
        : (langCode === 'vi' ? 'BÁO CÁO TÀI CHÍNH TỔNG HỢP' : 'COMBINED FINANCIAL REPORT');

      htmlBody += `
        <div class="header">
          <div class="logo">Smart Money Manager</div>
          <div class="title">
            <h1>${docTitle}</h1>
            <p>${t.pdfExportDate}: ${formattedDate}</p>
          </div>
        </div>
      `;

      // 2. Build Dynamic Blocks based on requested type
      if (type === 'ai' || type === 'full') {
        const periodText = aiReport?.period || monthStr;
        const totalIncomeStr = formatCurrency(aiReport?.totalIncome || 0);
        const totalExpenseStr = formatCurrency(aiReport?.totalExpense || 0);
        const netSavingStr = formatCurrency(aiReport?.netSaving || 0);

        htmlBody += `
          <div class="section-title">${langCode === 'vi' ? `TÓM TẮT TÀI CHÍNH THÁNG ${periodText}` : `FINANCIAL SUMMARY FOR MONTH ${periodText}`}</div>
          
          <div class="summary-box">
            <div class="summary-item">
              <h3>${langCode === 'vi' ? 'TỔNG THU NHẬP' : 'TOTAL INCOME'}</h3>
              <p class="val-teal">${totalIncomeStr}</p>
            </div>
            <div class="summary-item">
              <h3>${langCode === 'vi' ? 'TỔNG CHI TIÊU' : 'TOTAL EXPENSE'}</h3>
              <p class="val-red">${totalExpenseStr}</p>
            </div>
            <div class="summary-item">
              <h3>${langCode === 'vi' ? 'TÍCH LŨY RÒNG' : 'NET SAVINGS'}</h3>
              <p class="val-slate">${netSavingStr}</p>
            </div>
          </div>
        `;

        // Render category breakdown
        const categorySpending = aiReport?.categorySpending || [];
        const categoryRows = categorySpending.length > 0
          ? categorySpending.map((c: any) => `
              <tr>
                <td><strong>${c.name}</strong></td>
                <td class="amount expense">${formatCurrency(c.amount)}</td>
              </tr>
            `).join('')
          : `<tr><td colspan="2" style="text-align: center; color: #94a3b8;">${langCode === 'vi' ? 'Không có dữ liệu chi tiêu' : 'No spending data'}</td></tr>`;

        htmlBody += `
          <div class="section-title">${langCode === 'vi' ? 'CHI TIÊU THEO HẠNG MỤC' : 'SPENDING BY CATEGORY'}</div>
          <table>
            <thead>
              <tr>
                <th>${langCode === 'vi' ? 'Hạng mục' : 'Category'}</th>
                <th style="text-align: right">${langCode === 'vi' ? 'Số tiền' : 'Amount'}</th>
              </tr>
            </thead>
            <tbody>
              ${categoryRows}
            </tbody>
          </table>
        `;
      }

      if (type === 'transactions' || type === 'full') {
        const titleText = type === 'full' 
          ? (langCode === 'vi' ? 'NHẬT KÝ GIAO DỊCH CHI TIẾT' : 'DETAILED TRANSACTION LOG')
          : (langCode === 'vi' ? 'DANH SÁCH GIAO DỊCH' : 'TRANSACTION LIST');

        htmlBody += `
          <div class="section-title">${titleText}</div>
        `;

        if (type === 'transactions') {
          // If only transactions, render a neat overview first
          htmlBody += `
            <div class="summary-box">
              <div class="summary-item">
                <h3>${t.pdfUser}</h3>
                <p class="val-slate" style="font-size: 16px; font-weight: 700; margin-top: 4px;">${userProfile?.fullName || 'User'}</p>
              </div>
              <div class="summary-item">
                <h3>${t.pdfTxCount}</h3>
                <p class="val-teal" style="font-size: 16px; font-weight: 700; margin-top: 4px;">${txs.length}</p>
              </div>
              <div class="summary-item">
                <h3>${t.pdfTotalSaved}</h3>
                <p class="val-slate" style="font-size: 16px; font-weight: 700; margin-top: 4px;">${formatCurrency(totalSavingVal)}</p>
              </div>
            </div>
          `;
        }

        const transactionRows = txs.map((tItem: any) => {
          const dateStr = new Date(tItem.transactionDate).toLocaleDateString(langCode === 'vi' ? 'vi-VN' : 'en-US');
          const amountVal = formatCurrency(tItem.amount);
          
          let typeLabel = t.pdfSaving;
          if (tItem.type === 'income') typeLabel = t.pdfIncome;
          else if (tItem.type === 'expense') typeLabel = t.pdfExpense;

          const catName = langCode === 'vi' 
            ? (tItem.category?.nameVi || tItem.category?.name) 
            : (tItem.category?.name || tItem.category?.nameVi);

          return `
            <tr>
              <td>${dateStr}</td>
              <td><span class="badge-custom">${catName || ''}</span></td>
              <td>${tItem.description || tItem.note || ''}</td>
              <td>${typeLabel}</td>
              <td class="amount ${tItem.type}">${tItem.type === 'expense' ? '-' : '+'}${amountVal}</td>
            </tr>
          `;
        }).join('');

        htmlBody += `
          <table>
            <thead>
              <tr>
                <th>${t.pdfColDate}</th>
                <th>${t.pdfColCategory}</th>
                <th>${t.pdfColDesc}</th>
                <th>${t.pdfColType}</th>
                <th style="text-align: right">${t.pdfColAmount}</th>
              </tr>
            </thead>
            <tbody>
              ${transactionRows}
            </tbody>
          </table>
        `;
      }

      // Add Footer
      htmlBody += `
        <div class="footer">
          <p>${t.pdfFooter}</p>
        </div>
      `;

      const htmlContent = `
        <html>
          ${htmlStyle}
          <body>
            ${htmlBody}
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      setRefreshing(false);
      
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: t.pdfSaveTitle });
    } catch (error) {
      console.error(error);
      setRefreshing(false);
      showToast("Lỗi / Error", t.pdfFail);
    }
  };

  const handleDeleteData = () => {
    confirmAction(
      t.alertDeleteDataTitle,
      t.alertDeleteDataConfirm,
      () => showToast("Success", t.alertDeleteDataSuccess)
    );
  };

  const name = userProfile?.alias || userProfile?.fullName || (langCode === 'vi' ? 'Người dùng' : 'User');
  const firstName = name.split(' ').pop() || name;

  const formatCurrencyShort = (amount: number) => {
    if (!amount) return '0';
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}m`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k`;
    return amount.toString();
  };

  // Filter category list based on tab
  const filteredCategories = categoriesList.filter(c => {
    if (categoryFilter === 'custom') return !c.isSystem;
    return true;
  });

  return (
    <SafeAreaView className="flex-1 bg-[#F4F7F6]" edges={['top']}>
      {/* Top Greeting bar */}
      <View className="flex-row justify-between items-center px-5 pt-4 pb-2">
        <Text className="text-xl font-bold text-teal-700" style={{ fontFamily: 'Manrope-Bold' }}>
          {t.greeting}, {firstName} 👋
        </Text>
        <View className="flex-row items-center gap-4">
          <Feather name="calendar" size={22} color="#0D9488" />
          <View className="w-8 h-8 rounded-full bg-teal-100 items-center justify-center overflow-hidden">
            {userProfile?.avatarUrl ? (
              <Image source={{ uri: `${baseUrl}${userProfile.avatarUrl}` }} className="w-full h-full" />
            ) : (
              <Feather name="user" size={16} color="#0D9488" />
            )}
          </View>
        </View>
      </View>

      <ScrollView 
        className="flex-1 px-5" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* User Card */}
        <View className="items-center mt-6 mb-6">
          <TouchableOpacity onPress={navigateToEdit} className="relative mb-3">
            <View className="w-20 h-20 rounded-full border-2 border-teal-500 items-center justify-center overflow-hidden bg-white shadow-sm">
              {userProfile?.avatarUrl ? (
                <Image source={{ uri: `${baseUrl}${userProfile.avatarUrl}` }} className="w-full h-full" />
              ) : (
                <Feather name="user" size={40} color="#0D9488" />
              )}
              <View className="absolute bottom-0 right-0 bg-teal-500 w-6 h-6 rounded-full items-center justify-center border-2 border-white">
                <Feather name="edit-2" size={10} color="white" />
              </View>
            </View>
          </TouchableOpacity>
          <Text className="text-lg font-bold text-slate-800" style={{ fontFamily: 'Manrope-Bold' }}>
            {userProfile?.fullName || 'Nguyễn Văn Minh'}
          </Text>
          <Text className="text-xs text-slate-500 mt-1" style={{ fontFamily: 'Manrope-Medium' }}>
            {userProfile?.email || 'minh.nguyen@example.com'}
          </Text>
          <Text className="text-[10px] text-slate-400 mt-1">
            {t.memberSince}: {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString(langCode === 'vi' ? 'vi-VN' : 'en-US', {month: '2-digit', year: 'numeric'}) : '05/2026'}
          </Text>
        </View>

        {/* Financial metrics row */}
        <View className="flex-row justify-between mb-6">
          <View className="bg-white py-3 px-4 rounded-xl items-center shadow-sm flex-1 mr-2 border border-slate-100">
            <Text className="text-teal-600 font-bold text-base" style={{ fontFamily: 'HankenGrotesk-Bold' }}>
              {userProfile?.stats?.transactionCount || 0}
            </Text>
            <Text className="text-[10px] text-slate-500">{t.statsTransactions}</Text>
          </View>
          <View className="bg-white py-3 px-4 rounded-xl items-center shadow-sm flex-1 mx-1 border border-slate-100">
            <Text className="text-teal-600 font-bold text-base" style={{ fontFamily: 'HankenGrotesk-Bold' }}>
              {formatCurrencyShort(userProfile?.stats?.totalSaved || 0)}
            </Text>
            <Text className="text-[10px] text-slate-500 text-center">{t.statsSavings}</Text>
          </View>
          <View className="bg-white py-3 px-4 rounded-xl items-center shadow-sm flex-1 ml-2 border border-slate-100">
            <Text className="text-teal-600 font-bold text-base" style={{ fontFamily: 'HankenGrotesk-Bold' }}>
              {userProfile?.stats?.streak || 0}🔥
            </Text>
            <Text className="text-[10px] text-slate-500">{t.statsStreak}</Text>
          </View>
        </View>

        {/* TÀI KHOẢN (ACCOUNT SECTION) */}
        <Text className="text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1" style={{ fontFamily: 'Manrope-Bold' }}>
          {t.sectionAccount}
        </Text>
        <View className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6">
          <TouchableOpacity onPress={navigateToEdit} className="flex-row items-center py-4 px-4 border-b border-slate-100">
            <Feather name="user" size={18} color="#0D9488" className="mr-3" />
            <Text className="flex-1 text-sm text-slate-700 font-medium" style={{ fontFamily: 'Manrope-Medium' }}>
              {t.personalInfo}
            </Text>
            <Feather name="chevron-right" size={18} color="#CBD5E1" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowPasswordModal(true)} className="flex-row items-center py-4 px-4 border-b border-slate-100">
            <Feather name="lock" size={18} color="#0D9488" className="mr-3" />
            <Text className="flex-1 text-sm text-slate-700 font-medium" style={{ fontFamily: 'Manrope-Medium' }}>
              {t.changePassword}
            </Text>
            <Feather name="chevron-right" size={18} color="#CBD5E1" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleToggleNotifications} className="flex-row items-center py-4 px-4">
            <Feather name="bell" size={18} color="#0D9488" className="mr-3" />
            <Text className="flex-1 text-sm text-slate-700 font-medium" style={{ fontFamily: 'Manrope-Medium' }}>
              {t.notifications}
            </Text>
            <Feather name="chevron-right" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        {/* DỮ LIỆU (DATA SECTION) */}
        <Text className="text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1" style={{ fontFamily: 'Manrope-Bold' }}>
          {t.sectionData}
        </Text>
        <View className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6">
          <TouchableOpacity onPress={() => setShowExportModal(true)} className="flex-row items-center py-4 px-4 border-b border-slate-100">
            <MaterialCommunityIcons name="file-pdf-box" size={20} color="#0D9488" className="mr-3" />
            <Text className="flex-1 text-sm text-slate-700 font-medium" style={{ fontFamily: 'Manrope-Medium' }}>
              {t.exportPdf}
            </Text>
            <Feather name="chevron-right" size={18} color="#CBD5E1" />
          </TouchableOpacity>
          <TouchableOpacity onPress={navigateToImport} className="flex-row items-center py-4 px-4 border-b border-slate-100">
            <Feather name="upload" size={18} color="#0D9488" className="mr-3" />
            <Text className="flex-1 text-sm text-slate-700 font-medium" style={{ fontFamily: 'Manrope-Medium' }}>
              {t.importCsv}
            </Text>
            <Feather name="chevron-right" size={18} color="#CBD5E1" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteData} className="flex-row items-center py-4 px-4">
            <Feather name="trash-2" size={18} color="#D63031" className="mr-3" />
            <Text className="flex-1 text-sm text-[#D63031] font-medium" style={{ fontFamily: 'Manrope-Medium' }}>
              {t.deleteData}
            </Text>
            <Feather name="chevron-right" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        {/* AI & ỨNG DỤNG (AI & APP SECTION) */}
        <Text className="text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1" style={{ fontFamily: 'Manrope-Bold' }}>
          {t.sectionAiApp}
        </Text>
        <View className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6">
          <TouchableOpacity onPress={() => setShowLanguageModal(true)} className="flex-row items-center py-4 px-4 border-b border-slate-100">
            <Ionicons name="globe-outline" size={20} color="#0D9488" className="mr-3" />
            <Text className="flex-1 text-sm text-slate-700 font-medium" style={{ fontFamily: 'Manrope-Medium' }}>
              {t.language}: {langCode === 'vi' ? 'Tiếng Việt 🇻🇳' : 'English 🇺🇸'}
            </Text>
            <Feather name="chevron-right" size={18} color="#CBD5E1" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowCategoryModal(true)} className="flex-row items-center py-4 px-4 border-b border-slate-100">
            <Feather name="grid" size={18} color="#0D9488" className="mr-3" />
            <Text className="flex-1 text-sm text-slate-700 font-medium" style={{ fontFamily: 'Manrope-Medium' }}>
              {t.customCategories}
            </Text>
            <Feather name="chevron-right" size={18} color="#CBD5E1" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowApiModal(true)} className="flex-row items-center py-4 px-4">
            <Feather name="code" size={18} color="#0D9488" className="mr-3" />
            <Text className="flex-1 text-sm text-slate-700 font-medium" style={{ fontFamily: 'Manrope-Medium' }}>
              {t.apiSettings}
            </Text>
            <Feather name="chevron-right" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        {/* THÔNG TIN (INFO SECTION) */}
        <Text className="text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1" style={{ fontFamily: 'Manrope-Bold' }}>
          {t.sectionInfo}
        </Text>
        <View className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6">
          <TouchableOpacity onPress={handleCheckVersion} className="flex-row items-center py-4 px-4 border-b border-slate-100">
            <Feather name="info" size={18} color="#0D9488" className="mr-3" />
            <Text className="flex-1 text-sm text-slate-700 font-medium" style={{ fontFamily: 'Manrope-Medium' }}>
              {t.appVersion} 2.4.0
            </Text>
            <Feather name="chevron-right" size={18} color="#CBD5E1" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowTermsModal(true)} className="flex-row items-center py-4 px-4 border-b border-slate-100">
            <Feather name="shield" size={18} color="#0D9488" className="mr-3" />
            <Text className="flex-1 text-sm text-slate-700 font-medium" style={{ fontFamily: 'Manrope-Medium' }}>
              {t.termsPolicies}
            </Text>
            <Feather name="chevron-right" size={18} color="#CBD5E1" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSupportModal(true)} className="flex-row items-center py-4 px-4">
            <Feather name="help-circle" size={18} color="#0D9488" className="mr-3" />
            <Text className="flex-1 text-sm text-slate-700 font-medium" style={{ fontFamily: 'Manrope-Medium' }}>
              {t.contactSupport}
            </Text>
            <Feather name="chevron-right" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        {/* Đăng xuất */}
        <TouchableOpacity onPress={handleLogout} className="bg-white rounded-2xl shadow-sm border border-slate-100 py-4 items-center mb-4">
          <Text className="text-[#D63031] font-bold" style={{ fontFamily: 'Manrope-Bold' }}>
            {t.logout}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <AppBottomTab activeTab="profile" />

      {/* ---------------------------------------------------- */}
      {/* 1. Change Password Modal                             */}
      {/* ---------------------------------------------------- */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center p-5">
          {/* Lớp nền click để đóng */}
          <TouchableOpacity 
            className="absolute inset-0"
            activeOpacity={1}
            onPress={() => setShowPasswordModal(false)}
          />

          {/* Form container thực sự độc lập, ko trượt focus */}
          <View className="bg-white rounded-3xl p-5 shadow-2xl w-full">
            <View className="flex-row justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <Text className="text-lg font-bold text-slate-800" style={{ fontFamily: 'Manrope-Bold' }}>
                {t.changePwTitle}
              </Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)} className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center">
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View className="mb-3">
              <Text className="text-xs text-slate-500 mb-1 font-medium">{t.currentPwLabel}</Text>
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm font-semibold text-slate-800"
                placeholder="******"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View className="mb-3">
              <Text className="text-xs text-slate-500 mb-1 font-medium">{t.newPwLabel}</Text>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm font-semibold text-slate-800"
                placeholder={t.newPwPlaceholder}
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View className="mb-5">
              <Text className="text-xs text-slate-500 mb-1 font-medium">{t.confirmPwLabel}</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm font-semibold text-slate-800"
                placeholder={t.newPwPlaceholder}
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowPasswordModal(false)}
                className="flex-1 py-3 bg-slate-100 rounded-xl items-center"
                disabled={savingPassword}
              >
                <Text className="text-slate-600 font-bold text-sm">{t.btnCancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSavePasswordChange}
                className="flex-1 py-3 bg-teal-600 rounded-xl items-center flex-row justify-center gap-1.5"
                disabled={savingPassword}
              >
                {savingPassword && <ActivityIndicator size="small" color="white" />}
                <Text className="text-white font-bold text-sm">
                  {savingPassword ? t.btnSaving : t.btnSave}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------------------------------------------------- */}
      {/* 2. API Settings Modal                                */}
      {/* ---------------------------------------------------- */}
      <Modal
        visible={showApiModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowApiModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center p-5">
          {/* Lớp nền click để đóng */}
          <TouchableOpacity 
            className="absolute inset-0"
            activeOpacity={1}
            onPress={() => setShowApiModal(false)}
          />

          <View className="bg-white rounded-3xl p-5 shadow-2xl w-full">
            <View className="flex-row justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <Text className="text-lg font-bold text-slate-800" style={{ fontFamily: 'Manrope-Bold' }}>
                {t.apiTitle}
              </Text>
              <TouchableOpacity onPress={() => setShowApiModal(false)} className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center">
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <View className="mb-4">
              <Text className="text-xs text-slate-500 mb-1 font-medium">{t.apiServerLabel}</Text>
              <TextInput
                value={apiServer}
                onChangeText={setApiServer}
                className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm font-semibold text-slate-800"
              />
            </View>

            <View className="mb-4">
              <Text className="text-xs text-slate-500 mb-1 font-medium">{t.apiModelLabel}</Text>
              <View className="flex-row gap-2">
                {['gemini-1.5-flash', 'gemini-1.5-pro'].map((m) => {
                  const isSel = aiModel === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setAiModel(m)}
                      className={`flex-1 py-2.5 rounded-lg items-center border ${isSel ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-slate-100'}`}
                    >
                      <Text className={`text-xs font-bold ${isSel ? 'text-teal-700' : 'text-slate-600'}`}>
                        {m}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-xs text-slate-500 mb-1 font-medium">{t.apiTempLabel}: {temperature}</Text>
              <View className="flex-row gap-2">
                {['0.2', '0.7', '1.0'].map((tVal) => {
                  const isSel = temperature === tVal;
                  return (
                    <TouchableOpacity
                      key={tVal}
                      onPress={() => setTemperature(tVal)}
                      className={`flex-1 py-2 rounded-lg items-center border ${isSel ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-slate-100'}`}
                    >
                      <Text className={`text-xs font-bold ${isSel ? 'text-teal-700' : 'text-slate-600'}`}>
                        {tVal}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowApiModal(false)}
                className="flex-1 py-3 bg-slate-100 rounded-xl items-center"
              >
                <Text className="text-slate-600 font-bold text-sm">{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveApiSettings}
                className="flex-1 py-3 bg-teal-600 rounded-xl items-center"
              >
                <Text className="text-white font-bold text-sm">{t.btnSave}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------------------------------------------------- */}
      {/* 3. Category Management Modal                         */}
      {/* ---------------------------------------------------- */}
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          {/* Lớp nền click để đóng */}
          <TouchableOpacity 
            className="absolute inset-0"
            activeOpacity={1}
            onPress={() => setShowCategoryModal(false)}
          />

          <View className="bg-white rounded-t-3xl p-5 pb-8 max-h-[85%] shadow-xl w-full">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <Text className="text-base font-bold text-slate-800" style={{ fontFamily: 'Manrope-Bold' }}>
                {t.catTitle}
              </Text>
              <TouchableOpacity 
                onPress={() => setShowCategoryModal(false)} 
                className="w-7 h-7 rounded-full bg-slate-100 items-center justify-center"
              >
                <Ionicons name="close" size={14} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Create Category form */}
            <View className="bg-slate-50 rounded-2xl p-3 border border-slate-100 mb-4 gap-2">
              <Text className="text-xs font-bold text-teal-800 uppercase tracking-wider">{t.catCreateTitle}</Text>
              <View className="flex-row gap-2">
                <TextInput
                  value={newCatName}
                  onChangeText={setNewCatName}
                  placeholder={t.catNamePlaceholder}
                  placeholderTextColor="#94a3b8"
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-semibold h-9"
                />
                <TouchableOpacity
                  onPress={handleCreateCategory}
                  className="bg-teal-600 px-4 py-1.5 rounded-lg justify-center items-center h-9"
                >
                  <Text className="text-white text-xs font-bold">{t.catBtnAdd}</Text>
                </TouchableOpacity>
              </View>

              {/* Icon selector */}
              <View className="mt-1">
                <Text className="text-[10px] text-slate-400 font-medium mb-1">{t.catIconSelect}</Text>
                <View className="flex-row flex-wrap gap-2">
                  {[
                    'grid', 'gift', 'coffee', 'heart', 'book',
                    'shopping-bag', 'shopping-cart', 'home',
                    'activity', 'tool', 'film', 'music', 'trending-up'
                  ].map((iconName) => {
                    const isSel = newCatIcon === iconName;
                    return (
                      <TouchableOpacity
                        key={iconName}
                        onPress={() => setNewCatIcon(iconName)}
                        className={`w-7 h-7 rounded-full items-center justify-center border ${isSel ? 'bg-teal-100 border-teal-300' : 'bg-white border-slate-200'}`}
                      >
                        <Feather name={iconName as any} size={12} color={isSel ? '#0d9488' : '#64748b'} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Color selector */}
              <View className="mt-1">
                <Text className="text-[10px] text-slate-400 font-medium mb-1">{t.catColorSelect}</Text>
                <View className="flex-row gap-2.5">
                  {['#0d9488', '#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316'].map((c) => {
                    const isSel = newCatColor === c;
                    return (
                      <TouchableOpacity
                        key={c}
                        onPress={() => setNewCatColor(c)}
                        className={`w-6 h-6 rounded-full border-2 ${isSel ? 'border-teal-500 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    );
                  })}
                </View>
              </View>
            </View>

            {/* List tabs */}
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                {t.catListTitle}
              </Text>
              <View className="flex-row bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <TouchableOpacity 
                  onPress={() => setCategoryFilter('all')} 
                  className={`px-2.5 py-1 rounded-md ${categoryFilter === 'all' ? 'bg-white shadow-xs' : ''}`}
                >
                  <Text className={`text-[10px] font-bold ${categoryFilter === 'all' ? 'text-teal-700' : 'text-slate-500'}`}>
                    {langCode === 'vi' ? 'Tất cả' : 'All'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setCategoryFilter('custom')} 
                  className={`px-2.5 py-1 rounded-md ${categoryFilter === 'custom' ? 'bg-white shadow-xs' : ''}`}
                >
                  <Text className={`text-[10px] font-bold ${categoryFilter === 'custom' ? 'text-teal-700' : 'text-slate-500'}`}>
                    {t.catCustomTag}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Existing Categories List */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {filteredCategories.map((cat: any) => (
                <View
                  key={cat.id}
                  className="flex-row items-center p-2.5 rounded-xl border bg-slate-50 border-slate-100"
                >
                  <View 
                    className="w-8 h-8 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: cat.color ? `${cat.color}20` : '#0d948820' }}
                  >
                    <Feather 
                      name={(cat.icon || 'grid') as any} 
                      size={14} 
                      color={cat.color || '#0d9488'} 
                    />
                  </View>
                  <Text className="flex-1 text-xs font-semibold text-slate-700">
                    {langCode === 'vi' ? (cat.nameVi || cat.name) : (cat.name || cat.nameVi)}
                  </Text>
                  <View className={`px-2 py-0.5 rounded-full ${cat.isSystem ? 'bg-slate-200' : 'bg-teal-100'}`}>
                    <Text className={`text-[9px] font-bold ${cat.isSystem ? 'text-slate-500' : 'text-teal-700'}`}>
                      {cat.isSystem ? t.catSystemTag : t.catCustomTag}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ---------------------------------------------------- */}
      {/* 4. Terms & Conditions Modal                         */}
      {/* ---------------------------------------------------- */}
      <Modal
        visible={showTermsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          {/* Lớp nền click để đóng */}
          <TouchableOpacity 
            className="absolute inset-0"
            activeOpacity={1}
            onPress={() => setShowTermsModal(false)}
          />

          <View className="bg-white rounded-t-3xl p-5 pb-8 max-h-[85%] shadow-xl w-full">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <Text className="text-base font-bold text-slate-800" style={{ fontFamily: 'Manrope-Bold' }}>
                {t.termsPolicies}
              </Text>
              <TouchableOpacity 
                onPress={() => setShowTermsModal(false)} 
                className="w-7 h-7 rounded-full bg-slate-100 items-center justify-center"
              >
                <Ionicons name="close" size={14} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              <Text className="text-sm font-bold text-slate-800">
                {langCode === 'vi' ? '1. Quy định chung' : '1. General Terms'}
              </Text>
              <Text className="text-xs text-slate-600 leading-relaxed">
                {langCode === 'vi' 
                  ? 'Smart Money Manager cung cấp các công cụ trực quan để quản lý thu nhập, chi tiêu, đặt ngân sách và phân tích giao dịch tự động bằng trí tuệ nhân tạo AI. Bằng việc đăng ký tài khoản, bạn hoàn toàn đồng ý tuân thủ các điều khoản dịch vụ này.'
                  : 'Smart Money Manager provides visual tools for managing income, expense, budgeting and automated transactions analysis through AI. By registering an account, you strictly agree to comply with these terms of services.'}
              </Text>

              <Text className="text-sm font-bold text-slate-800">
                {langCode === 'vi' ? '2. Bảo mật dữ liệu người dùng' : '2. User Data Privacy'}
              </Text>
              <Text className="text-xs text-slate-600 leading-relaxed">
                {langCode === 'vi'
                  ? 'Tất cả dữ liệu về ví, giao dịch, số dư và ngân sách của bạn được mã hóa an toàn trên máy chủ. Chúng tôi cam kết tuyệt đối không bán hay chia sẻ thông tin tài chính cá nhân của bạn cho bất kỳ bên thứ ba nào.'
                  : 'All wallet data, transactions, balances and budgets are safely encrypted on our servers. We strongly commit not to sell or share your personal financial details with any third parties.'}
              </Text>

              <Text className="text-sm font-bold text-slate-800">
                {langCode === 'vi' ? '3. Sử dụng công nghệ AI' : '3. AI Technology Usage'}
              </Text>
              <Text className="text-xs text-slate-600 leading-relaxed">
                {langCode === 'vi'
                  ? 'Tính năng phân tích giao dịch thông qua AI chỉ mang tính chất tham khảo nhằm giúp phân loại giao dịch tiện lợi nhất. Người dùng chịu trách nhiệm kiểm tra tính chính xác của các giao dịch đã thêm.'
                  : 'Transaction analysis powered by AI is for reference only to help classify transactions efficiently. Users are fully responsible for verifying the accuracy of transaction records.'}
              </Text>

              <Text className="text-sm font-bold text-slate-800">
                {langCode === 'vi' ? '4. Bản quyền & Thương hiệu' : '4. Copyrights & Trademarks'}
              </Text>
              <Text className="text-xs text-slate-600 leading-relaxed">
                {langCode === 'vi'
                  ? 'Smart Money Manager giữ toàn bộ bản quyền đối với mã nguồn, đồ họa, thiết kế ứng dụng và tên thương hiệu liên quan. Nghiêm cấm sao chép hoặc phân phối trái phép dưới mọi hình thức.'
                  : 'Smart Money Manager reserves all rights regarding source code, graphic designs, application UX/UI and related brand names. Unauthorized distribution or copying is strictly prohibited.'}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ---------------------------------------------------- */}
      {/* 5. Contact Support Modal                            */}
      {/* ---------------------------------------------------- */}
      <Modal
        visible={showSupportModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSupportModal(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          {/* Lớp nền click để đóng */}
          <TouchableOpacity 
            className="absolute inset-0"
            activeOpacity={1}
            onPress={() => setShowSupportModal(false)}
          />

          <View className="bg-white rounded-t-3xl p-5 pb-8 shadow-xl w-full">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <Text className="text-base font-bold text-slate-800" style={{ fontFamily: 'Manrope-Bold' }}>
                {t.supportTitle}
              </Text>
              <TouchableOpacity 
                onPress={() => setShowSupportModal(false)} 
                className="w-7 h-7 rounded-full bg-slate-100 items-center justify-center"
              >
                <Ionicons name="close" size={14} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Options */}
            <View className="gap-3">
              <TouchableOpacity
                onPress={() => {
                  setShowSupportModal(false);
                  router.push('/chat');
                }}
                className="flex-row items-center p-4 bg-teal-50 border border-teal-100 rounded-2xl active:bg-teal-100"
              >
                <Ionicons name="chatbubble-ellipses-outline" size={22} color="#0d9488" className="mr-3" />
                <View className="flex-1">
                  <Text className="text-sm font-bold text-teal-800">{t.supportAiTitle}</Text>
                  <Text className="text-xs text-teal-600 mt-0.5">{t.supportAiDesc}</Text>
                </View>
                <Feather name="chevron-right" size={16} color="#0d9488" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Linking.openURL(`mailto:support@smartmoney.com?subject=${encodeURIComponent(langCode === 'vi' ? 'Hỗ trợ Smart Money' : 'Smart Money Support')}`);
                }}
                className="flex-row items-center p-4 bg-blue-50 border border-blue-100 rounded-2xl active:bg-blue-100"
              >
                <Feather name="mail" size={20} color="#2563eb" className="mr-3" />
                <View className="flex-1">
                  <Text className="text-sm font-bold text-blue-800">{t.supportEmailTitle}</Text>
                  <Text className="text-xs text-blue-600 mt-0.5">{t.supportEmailDesc}</Text>
                </View>
                <Feather name="chevron-right" size={16} color="#2563eb" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Linking.openURL('tel:19001234');
                }}
                className="flex-row items-center p-4 bg-slate-50 border border-slate-100 rounded-2xl active:bg-slate-100"
              >
                <Feather name="phone" size={20} color="#475569" className="mr-3" />
                <View className="flex-1">
                  <Text className="text-sm font-bold text-slate-800">{t.supportHotlineTitle}</Text>
                  <Text className="text-xs text-slate-500 mt-0.5">{t.supportHotlineDesc}</Text>
                </View>
                <Feather name="chevron-right" size={16} color="#475569" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------------------------------------------------- */}
      {/* 6. Language Selector Modal (Highly Compatible on Web)*/}
      {/* ---------------------------------------------------- */}
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center p-5">
          {/* Lớp nền click để đóng */}
          <TouchableOpacity 
            className="absolute inset-0"
            activeOpacity={1}
            onPress={() => setShowLanguageModal(false)}
          />

          <View className="bg-white rounded-3xl p-5 shadow-2xl w-full">
            <View className="flex-row justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <Text className="text-lg font-bold text-slate-800" style={{ fontFamily: 'Manrope-Bold' }}>
                {t.langTitle}
              </Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)} className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center">
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <Text className="text-xs text-slate-500 mb-4">{t.langDesc}</Text>

            <View className="gap-2.5 mb-2">
              <TouchableOpacity
                onPress={async () => {
                  setLangCode("vi");
                  await AsyncStorage.setItem('APP_LANGUAGE', 'vi');
                  setShowLanguageModal(false);
                  showToast("Thành công", "Đã đổi ngôn ngữ sang Tiếng Việt.");
                }}
                className={`flex-row items-center p-3.5 rounded-xl border ${langCode === 'vi' ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-slate-100'}`}
              >
                <Text className="text-2xl mr-3">🇻🇳</Text>
                <Text className={`text-sm font-bold flex-1 ${langCode === 'vi' ? 'text-teal-700' : 'text-slate-700'}`}>
                  {t.langVi}
                </Text>
                {langCode === 'vi' && <Feather name="check" size={16} color="#0d9488" />}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  setLangCode("en");
                  await AsyncStorage.setItem('APP_LANGUAGE', 'en');
                  setShowLanguageModal(false);
                  showToast("Success", "Language changed to English successfully.");
                }}
                className={`flex-row items-center p-3.5 rounded-xl border ${langCode === 'en' ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-slate-100'}`}
              >
                <Text className="text-2xl mr-3">🇺🇸</Text>
                <Text className={`text-sm font-bold flex-1 ${langCode === 'en' ? 'text-teal-700' : 'text-slate-700'}`}>
                  {t.langEn}
                </Text>
                {langCode === 'en' && <Feather name="check" size={16} color="#0d9488" />}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------------------------------------------------- */}
      {/* 7. PDF Export Selector Modal                         */}
      {/* ---------------------------------------------------- */}
      <Modal
        visible={showExportModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center p-5">
          {/* Lớp nền click để đóng */}
          <TouchableOpacity 
            className="absolute inset-0"
            activeOpacity={1}
            onPress={() => setShowExportModal(false)}
          />

          <View className="bg-white rounded-3xl p-5 shadow-2xl w-full">
            <View className="flex-row justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <Text className="text-lg font-bold text-slate-800" style={{ fontFamily: 'Manrope-Bold' }}>
                {t.exportPdfTitle}
              </Text>
              <TouchableOpacity onPress={() => setShowExportModal(false)} className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center">
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <Text className="text-xs text-slate-500 mb-4">{t.exportPdfDesc}</Text>

            <View className="gap-3 mb-2">
              {/* Option 1: Transactions Report */}
              <TouchableOpacity
                onPress={() => handleExportPDF('transactions')}
                className="flex-row items-center p-4 bg-slate-50 border border-slate-200 rounded-2xl active:bg-slate-150"
              >
                <View className="w-10 h-10 rounded-full bg-teal-50 items-center justify-center mr-3">
                  <Feather name="file-text" size={20} color="#0d9488" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-slate-800">{t.exportPdfTransactions}</Text>
                  <Text className="text-xs text-slate-500 mt-0.5 leading-relaxed">{t.exportPdfTransactionsDesc}</Text>
                </View>
                <Feather name="chevron-right" size={16} color="#94a3b8" />
              </TouchableOpacity>

              {/* Option 2: AI Insights Report */}
              <TouchableOpacity
                onPress={() => handleExportPDF('ai')}
                className="flex-row items-center p-4 bg-slate-50 border border-slate-200 rounded-2xl active:bg-slate-150"
              >
                <View className="w-10 h-10 rounded-full bg-teal-50 items-center justify-center mr-3">
                  <Feather name="cpu" size={20} color="#0d9488" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-slate-800">{t.exportPdfAi}</Text>
                  <Text className="text-xs text-slate-500 mt-0.5 leading-relaxed">{t.exportPdfAiDesc}</Text>
                </View>
                <Feather name="chevron-right" size={16} color="#94a3b8" />
              </TouchableOpacity>

              {/* Option 3: Full Combined Report */}
              <TouchableOpacity
                onPress={() => handleExportPDF('full')}
                className="flex-row items-center p-4 bg-teal-50/70 border border-teal-200 rounded-2xl active:bg-teal-100/70"
              >
                <View className="w-10 h-10 rounded-full bg-teal-500 items-center justify-center mr-3">
                  <Feather name="layers" size={20} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-sm font-bold text-teal-900">{t.exportPdfFull}</Text>
                    <View className="bg-teal-500 px-1.5 py-0.5 rounded-md ml-2">
                      <Text className="text-[8px] font-black text-white uppercase">{langCode === 'vi' ? 'KHUYÊN DÙNG' : 'RECOMMENDED'}</Text>
                    </View>
                  </View>
                  <Text className="text-xs text-teal-700 mt-0.5 leading-relaxed">{t.exportPdfFullDesc}</Text>
                </View>
                <Feather name="chevron-right" size={16} color="#0d9488" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Refactored: style(users): polish profile UI styling and spacing

// Refactored: style(users): polish profile UI styling and spacing

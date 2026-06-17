import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Feather } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { apiClient, getAuthToken } from '../lib/http';
import AppBottomTab from '../components/AppBottomTab';

export default function InsightsScreen() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

  const fetchReport = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await apiClient.get(`/reports/monthly?month=${month}/${year}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReportData(res.data?.data || res.data);
    } catch (e) {
      Alert.alert("Lỗi", "Không thể lấy dữ liệu báo cáo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [month, year]);

  const generateHtml = (data: any) => {
    const formatCurrency = (val: number) => val.toLocaleString('vi-VN') + ' đ';

    const categoriesHtml = data.categorySpending && data.categorySpending.length > 0 
      ? data.categorySpending.map((c: any) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #f1f5f9;">${c.name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #D63031; font-weight: bold;">${formatCurrency(c.amount)}</td>
        </tr>
      `).join('')
      : `<tr><td colspan="2" style="padding: 12px; text-align: center; color: #94a3b8;">Không có dữ liệu chi tiêu</td></tr>`;

    const transactionsHtml = data.transactions && data.transactions.length > 0
      ? data.transactions.map((t: any) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; color: #64748b;">${t.date}</td>
          <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-weight: 500;">${t.note || t.categoryName}</td>
          <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; color: #64748b;">${t.categoryName}</td>
          <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: bold; color: ${t.type === 'income' ? '#0D9488' : '#D63031'};">
            ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
          </td>
        </tr>
      `).join('')
      : `<tr><td colspan="4" style="padding: 12px; text-align: center; color: #94a3b8;">Không có giao dịch nào</td></tr>`;

    return `
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #334155; padding: 40px; margin: 0; background-color: #ffffff; }
            h1 { color: #0f172a; text-align: center; font-size: 28px; margin-bottom: 8px; }
            p.subtitle { text-align: center; color: #64748b; font-size: 16px; margin-top: 0; margin-bottom: 40px; }
            h2 { color: #0f172a; margin-top: 40px; margin-bottom: 16px; font-size: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
            th { background-color: #f8fafc; padding: 12px; text-align: left; font-weight: bold; color: #475569; border-bottom: 2px solid #e2e8f0; }
            .summary-box { display: flex; justify-content: space-between; background-color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; }
            .summary-item { text-align: center; flex: 1; }
            .summary-item:not(:last-child) { border-right: 1px solid #e2e8f0; }
            .summary-label { font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: bold; }
            .summary-value { font-size: 24px; font-weight: bold; margin-top: 8px; }
            .income { color: #0D9488; }
            .expense { color: #D63031; }
            .net { color: #0f172a; }
            .footer { margin-top: 60px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 20px; }
          </style>
        </head>
        <body>
          <h1>Báo Cáo Tài Chính</h1>
          <p class="subtitle">Tháng ${data.period}</p>
          
          <div class="summary-box">
            <div class="summary-item">
              <div class="summary-label">Tổng thu</div>
              <div class="summary-value income">${formatCurrency(data.totalIncome)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Tổng chi</div>
              <div class="summary-value expense">${formatCurrency(data.totalExpense)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Tích lũy</div>
              <div class="summary-value net">${formatCurrency(data.netSaving)}</div>
            </div>
          </div>

          <h2>Chi tiêu theo Hạng mục</h2>
          <table>
            <tr>
              <th>Hạng mục</th>
              <th style="text-align: right;">Số tiền</th>
            </tr>
            ${categoriesHtml}
          </table>

          <h2>Chi tiết Giao dịch</h2>
          <table>
            <tr>
              <th>Ngày</th>
              <th>Mô tả</th>
              <th>Hạng mục</th>
              <th style="text-align: right;">Số tiền</th>
            </tr>
            ${transactionsHtml}
          </table>
          
          <div class="footer">
            Báo cáo được tạo tự động bởi Smart Money Manager<br/>
            Ngày trích xuất: ${new Date().toLocaleDateString('vi-VN')}
          </div>
        </body>
      </html>
    `;
  };

  const sharePDF = async () => {
    if (!reportData) return;
    try {
      const html = generateHtml(reportData);
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Báo cáo tài chính Tháng ${month}/${year}`,
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert("Lỗi", "Thiết bị không hỗ trợ chia sẻ file");
      }
    } catch (e) {
      Alert.alert("Lỗi", "Có lỗi xảy ra khi tạo PDF");
    }
  };

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F4F7F6]" edges={['top']}>
      {/* Header */}
      <View className="px-5 py-4 bg-white border-b border-slate-100 flex-row items-center justify-between">
        <Text className="text-xl font-black text-slate-800" style={{ fontFamily: 'HankenGrotesk-Bold' }}>
          Báo Cáo PDF
        </Text>
        <TouchableOpacity 
          onPress={sharePDF}
          disabled={loading || !reportData}
          className={`flex-row items-center bg-teal-50 px-3 py-2 rounded-full ${loading || !reportData ? 'opacity-50' : ''}`}
        >
          <Feather name="share" size={14} color="#0D9488" />
          <Text className="text-xs font-bold text-teal-700 ml-1.5" style={{ fontFamily: 'Manrope-Bold' }}>Xuất PDF</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Month Selector */}
        <View className="flex-row items-center justify-between bg-white rounded-2xl p-2 my-5 shadow-sm border border-slate-100/50">
          <TouchableOpacity onPress={prevMonth} className="p-3 bg-slate-50 rounded-xl">
            <Feather name="chevron-left" size={20} color="#64748B" />
          </TouchableOpacity>
          <Text className="text-base font-bold text-slate-800" style={{ fontFamily: 'Manrope-Bold' }}>
            Tháng {month}/{year}
          </Text>
          <TouchableOpacity onPress={nextMonth} className="p-3 bg-slate-50 rounded-xl">
            <Feather name="chevron-right" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#0D9488" className="mt-10" />
        ) : reportData ? (
          <View>
            <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100/50 mb-5">
              <Text className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-4" style={{ fontFamily: 'Manrope-Bold' }}>
                Tóm tắt báo cáo
              </Text>
              
              <View className="flex-row justify-between mb-4">
                <View>
                  <Text className="text-xs text-slate-500 font-medium mb-1" style={{ fontFamily: 'Manrope-Medium' }}>Tổng thu</Text>
                  <Text className="text-base font-black text-teal-600" style={{ fontFamily: 'HankenGrotesk-Bold' }}>
                    {reportData.totalIncome.toLocaleString('vi-VN')} đ
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-xs text-slate-500 font-medium mb-1" style={{ fontFamily: 'Manrope-Medium' }}>Tổng chi</Text>
                  <Text className="text-base font-black text-red-600" style={{ fontFamily: 'HankenGrotesk-Bold' }}>
                    {reportData.totalExpense.toLocaleString('vi-VN')} đ
                  </Text>
                </View>
              </View>

              <View className="bg-slate-50 p-4 rounded-2xl flex-row justify-between items-center">
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#334155', fontFamily: 'Manrope-Bold' }}>Tích lũy</Text>
                <Text className="text-lg font-black text-slate-800" style={{ fontFamily: 'HankenGrotesk-Bold' }}>
                  {reportData.netSaving.toLocaleString('vi-VN')} đ
                </Text>
              </View>
            </View>

            <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100/50">
              <View className="flex-row items-center gap-2 mb-4">
                <Feather name="info" size={16} color="#94A3B8" />
                <Text className="text-xs text-slate-500 font-medium" style={{ fontFamily: 'Manrope-Medium' }}>
                  Báo cáo bao gồm {reportData.transactions.length} giao dịch và {reportData.categorySpending.length} hạng mục chi tiêu.
                </Text>
              </View>
              
              <Text className="text-xs text-slate-400 leading-5" style={{ fontFamily: 'Manrope-Medium' }}>
                Nhấn "Xuất PDF" ở góc trên bên phải để tạo file PDF tổng hợp chi tiết tất cả các giao dịch trong tháng, rất thuận tiện để lưu trữ hoặc gửi qua các ứng dụng khác.
              </Text>
            </View>
          </View>
        ) : (
          <Text className="text-center mt-10 text-slate-500 font-medium" style={{ fontFamily: 'Manrope-Medium' }}>
            Không có dữ liệu
          </Text>
        )}
      </ScrollView>

      {/* Bottom Tab */}
      <AppBottomTab activeTab="insights" />
    </SafeAreaView>
  );
}

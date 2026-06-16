import { GoogleGenAI } from "@google/genai";
import { prisma } from "../../shared/prisma";
import { AppError } from "../../shared/app-error";

function isApiKeyValid(key: string | undefined): boolean {
  if (!key) return false;
  const cleanKey = key.trim();
  if (cleanKey === "" || cleanKey === "your_gemini_api_key_here" || cleanKey.startsWith("your_")) {
    return false;
  }
  return true;
}

export interface ParsedTransaction {
  amount: number;
  description: string;
  categoryId: number | null;
  date: string; // ISO Date YYYY-MM-DD
  type: "expense" | "income";
}

export interface AISuggestionResult {
  categoryId: number | null;
  categoryName: string;
  confidence: number;
}

/**
 * Normalizes string by removing accents and converting to lowercase
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d");
}

async function suggestCategory(userId: string, description: string): Promise<AISuggestionResult[]> {
  const categories = await prisma.category.findMany({
    where: {
      OR: [{ isSystem: true }, { userId }]
    },
    select: { id: true, name: true, nameVi: true }
  });

  const categoryList = categories.map(c => `ID: ${c.id} - ${c.nameVi || c.name}`).join("\n");
  const fallbackCat = categories.find(c => c.name === "Khác")?.id || null;

  try {
    if (!isApiKeyValid(process.env.GEMINI_API_KEY)) {
      throw new Error("INVALID_API_KEY");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `Bạn là trợ lý tài chính thông minh. Người dùng nhập nội dung giao dịch: "${description}".
Nhiệm vụ: Phân tích ngữ nghĩa và gợi ý top 3 danh mục phù hợp nhất cho giao dịch này.
Danh sách các Danh mục (Category) có sẵn:
${categoryList}

Quy tắc:
1. categoryId: Lấy ID từ danh sách trên.
2. categoryName: Lấy tên tương ứng.
3. confidence: Độ tin cậy (0 đến 100). Số cao nhất đứng đầu.
4. LUÔN TRẢ VỀ CHÍNH XÁC 3 KẾT QUẢ. Nếu không chắc chắn, hãy chọn danh mục "Khác" với độ tin cậy thấp.

TRẢ VỀ DUY NHẤT 1 MẢNG JSON CÓ CẤU TRÚC SAU (không dùng markdown block, không giải thích ngoài):
[
  { "categoryId": 1, "categoryName": "Thực phẩm & Ăn uống", "confidence": 95 },
  { "categoryId": 2, "categoryName": "Giải trí & Mua sắm", "confidence": 20 },
  { "categoryId": 3, "categoryName": "Khác", "confidence": 5 }
]`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("Empty response from AI");

    let parsed: any;
    try {
      parsed = JSON.parse(resultText);
    } catch (e) {
      const cleanText = resultText.replace(/```json\n/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleanText);
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("Invalid AI response format");
    }

    return parsed.slice(0, 3) as AISuggestionResult[];
  } catch (error: any) {
    if (error.message !== "INVALID_API_KEY") {
      console.error("AI Error generating suggestions, falling back to regex:", error);
    }
    
    // NATIVE FALLBACK PARSER
    const desc = normalizeString(description);
    const keywordMap: Record<string, string[]> = {
      "Thực phẩm & Ăn uống": ["an", "uong", "pho", "com", "bun", "cafe", "coffee", "tra", "snack", "dinner", "lunch", "breakfast", "food", "drink", "nhau", "banh mi", "thuc pham"],
      "Di chuyển & Xe cộ": ["xe", "grab", "be", "xang", "bus", "taxi", "ve", "may bay", "train", "transport", "parking", "gui xe", "di chuyen"],
      "Giải trí & Mua sắm": ["shopee", "lazada", "tiki", "quan", "ao", "giay", "dep", "sieu thi", "shopping", "clothes", "mall", "phim", "movie", "netflix", "game", "nap the", "du lich", "travel", "concert", "karaoke"],
      "Nhà cửa & Hóa đơn": ["nha", "dien", "nuoc", "internet", "wifi", "bill", "hoa don", "thue", "rent"],
      "Lương & Thưởng": ["luong", "salary", "bonus", "thuong", "thu nhap", "income"],
    };

    let matchedCatName: string | null = null;
    let confidence = 0;

    for (const [standardName, keys] of Object.entries(keywordMap)) {
      if (keys.some(k => desc.includes(k))) {
        matchedCatName = standardName;
        confidence = 85;
        break;
      }
    }

    const suggestions: AISuggestionResult[] = [];
    
    if (matchedCatName) {
      const dbCat = categories.find(c => c.name === matchedCatName || c.nameVi === matchedCatName);
      suggestions.push({
        categoryId: dbCat?.id || null,
        categoryName: matchedCatName,
        confidence: confidence
      });
    }

    // Fill remaining with defaults
    suggestions.push({
      categoryId: fallbackCat,
      categoryName: "Khác",
      confidence: matchedCatName ? 10 : 30
    });
    
    // Return unique items up to 3
    return suggestions.filter((v, i, a) => a.findIndex(t => t.categoryName === v.categoryName) === i);
  }
}

async function parseQuickInput(userId: string, text: string): Promise<ParsedTransaction[]> {
  const categories = await prisma.category.findMany({
    where: {
      OR: [{ isSystem: true }, { userId }],
    },
    select: { id: true, name: true, nameVi: true, isSystem: true }
  });

  const categoryList = categories.map(c => `ID: ${c.id} - ${c.nameVi || c.name}`).join("\n");
  const today = new Date();
  
  try {
    if (!isApiKeyValid(process.env.GEMINI_API_KEY)) {
      throw new Error("INVALID_API_KEY");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `Bạn là một trợ lý tài chính thông minh giúp người dùng nhập liệu chi tiêu bằng ngôn ngữ tự nhiên.
Người dùng vừa nhập câu sau: "${text}"

Nhiệm vụ của bạn là bóc tách các giao dịch từ câu trên và trả về dưới dạng một mảng JSON array. Đảm bảo hỗ trợ nhập nhiều giao dịch cùng lúc (tách nhau bằng dấu phẩy, chữ "và", hoặc ngữ cảnh). Giới hạn tối đa 10 giao dịch.

Danh sách các Danh mục (Category) có sẵn:
${categoryList}

Quy tắc xử lý:
1. amount: Số tiền của giao dịch. Chuyển đổi "k" thành nghìn (vd 40k -> 40000), "tr" hoặc "củ" thành triệu (vd 2 củ -> 2000000). Luôn là số nguyên dương. Nếu không có số tiền cụ thể, cố gắng ước lượng hoặc bỏ qua.
2. description: Mô tả ngắn gọn về giao dịch (vd: "phở bò", "đổ xăng", "lương tháng 10").
3. categoryId: Chọn ID của danh mục phù hợp nhất từ danh sách trên. Nếu không chắc chắn, có thể trả về null hoặc chọn danh mục "Khác".
4. date: Ngày thực hiện giao dịch, định dạng "YYYY-MM-DD". Hôm nay là ${today.toISOString().split('T')[0]}. Hiểu các từ khóa như "hôm qua", "sáng nay", "tối qua" để tính toán ngày tương ứng. Nếu không có từ khóa thời gian, mặc định là ngày hôm nay.
5. type: "expense" (chi tiêu) hoặc "income" (thu nhập). Dựa vào context (ví dụ: "nhận lương", "được thưởng" -> income; "ăn phở", "đổ xăng", "mua đồ" -> expense) để quyết định.

KẾT QUẢ DUY NHẤT LÀ MỘT MẢNG JSON CÓ CẤU TRÚC SAU (không dùng markdown block hay text giải thích ngoài):
[
  {
    "amount": 40000,
    "description": "Phở",
    "categoryId": 1,
    "date": "2023-10-27",
    "type": "expense"
  }
]`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response from AI");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(resultText);
    } catch (e) {
      // Clean up markdown code block if present
      const cleanText = resultText.replace(/```json\\n/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleanText);
    }

    if (!Array.isArray(parsed)) {
      throw new Error("AI did not return an array");
    }

    // Limit to 10 items
    if (parsed.length > 10) {
      parsed = parsed.slice(0, 10);
    }

    return parsed as ParsedTransaction[];
  } catch (error: any) {
    if (error.message !== "INVALID_API_KEY") {
      console.error("AI Error generating content:", error);
    }
    
    // NATIVE FALLBACK PARSER (No API needed)
    console.log("Using native regex fallback parser...");
    const transactions = [];
    const parts = text.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
    
    // Prioritize user categories
    const userCats = categories.filter(c => !c.isSystem);
    const sysCats = categories.filter(c => c.isSystem);
    
    for (const p of parts) {
      const match = p.match(/(\d+(?:\.\d+)?)\s*(k|tr|triệu|củ|đ|ngàn|nghìn)(?:\s|$)/i) || p.match(/\b(\d{4,})\b/);
      if (!match) continue;
      
      let amount = parseFloat(match[1]);
      const unit = match[2]?.toLowerCase();
      if (unit === 'k' || unit === 'ngàn' || unit === 'nghìn') amount *= 1000;
      else if (unit === 'tr' || unit === 'triệu' || unit === 'củ') amount *= 1000000;
      
      const desc = p.replace(match[0], '').trim();
      const type = (desc.toLowerCase().includes('thưởng') || desc.toLowerCase().includes('lương') || desc.toLowerCase().includes('thu nhập') || desc.toLowerCase().includes('bán')) ? 'income' : 'expense';
      
      let categoryId = null;
      const lDesc = desc.toLowerCase();
      
      const findCat = (cats: any[]) => {
        if (lDesc.includes('xăng') || lDesc.includes('xe') || lDesc.includes('di chuyển') || lDesc.includes('gửi xe')) {
          return cats.find(c => c.nameVi?.toLowerCase().includes('di chuyển') || c.name.toLowerCase().includes('di chuyển') || c.name.toLowerCase().includes('transport'))?.id;
        } else if (lDesc.includes('ăn') || lDesc.includes('bún') || lDesc.includes('phở') || lDesc.includes('uống') || lDesc.includes('cà phê') || lDesc.includes('cafe') || lDesc.includes('thực phẩm')) {
          return cats.find(c => c.nameVi?.toLowerCase().includes('thực phẩm') || c.name.toLowerCase().includes('thực phẩm') || c.name.toLowerCase().includes('food'))?.id;
        } else if (type === 'income') {
          return cats.find(c => c.nameVi?.toLowerCase().includes('lương') || c.name.toLowerCase().includes('lương') || c.name.toLowerCase().includes('thưởng') || c.name.toLowerCase().includes('income'))?.id;
        }
        return null;
      };
      
      categoryId = findCat(userCats) || findCat(sysCats) || null;
      
      transactions.push({
        amount,
        description: desc.charAt(0).toUpperCase() + desc.slice(1),
        categoryId,
        date: today.toISOString().split('T')[0],
        type
      });
    }
    
    if (transactions.length > 0) {
      return transactions as ParsedTransaction[];
    }

    if (error.status === 429) {
      throw new AppError({
        message: "Hệ thống AI đang quá tải hoặc bạn đã hết lượt dùng miễn phí. Fallback thất bại.",
        status: 429,
        code: "INTERNAL_ERROR",
      });
    }

    throw new AppError({
      message: "Lỗi nội bộ AI",
      status: 500,
      code: "INTERNAL_ERROR",
    });
  }
}

async function chatWithFinancialContext(userId: string, messages: {role: "user" | "model", text: string}[]) {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      transactionDate: {
        gte: startOfMonth
      }
    },
    include: { category: true }
  });

  let totalIncome = 0;
  let totalExpense = 0;
  const categorySpent: Record<string, number> = {};

  transactions.forEach(tx => {
    if (tx.type === "income") {
      totalIncome += Number(tx.amount);
    } else if (tx.type === "expense") {
      totalExpense += Number(tx.amount);
      const catName = tx.category?.nameVi || tx.category?.name || "Khác";
      categorySpent[catName] = (categorySpent[catName] || 0) + Number(tx.amount);
    }
  });

  const sortedCategories = Object.entries(categorySpent)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, amount]) => `- ${name}: ${amount.toLocaleString('vi-VN')} đ`)
    .join("\n");

  const financialContext = `
Thông tin tài chính của người dùng (Tháng ${today.getMonth() + 1}/${today.getFullYear()}):
- Tổng thu: ${totalIncome.toLocaleString('vi-VN')} đ
- Tổng chi: ${totalExpense.toLocaleString('vi-VN')} đ
- Số dư tháng: ${(totalIncome - totalExpense).toLocaleString('vi-VN')} đ
- Top 3 danh mục chi tiêu cao nhất:
${sortedCategories || "Chưa có dữ liệu chi tiêu."}
`;

  const systemPrompt = `Bạn là trợ lý tài chính cá nhân thông minh của ứng dụng Smart Money Manager. 
Tên của bạn là "Trợ lý SMM". Bạn luôn giao tiếp bằng tiếng Việt, lịch sự, ngắn gọn và hữu ích.
Hãy sử dụng ngữ cảnh tài chính thực tế dưới đây để trả lời các câu hỏi của người dùng một cách cá nhân hóa. Nếu người dùng hỏi các vấn đề không liên quan đến tài chính, hãy khéo léo điều hướng về chủ đề tài chính.

${financialContext}`;

  try {
    if (!isApiKeyValid(process.env.GEMINI_API_KEY)) {
      throw new Error("INVALID_API_KEY");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const contents = [
      // System prompt injected as first user turn + model ack
      { role: "user" as const, parts: [{ text: `[SYSTEM]: ${systemPrompt}` }] },
      { role: "model" as const, parts: [{ text: "Tôi đã hiểu ngữ cảnh tài chính của bạn. Hãy hỏi tôi bất cứ điều gì!" }] },
      ...messages.map(m => ({
        role: m.role as "user" | "model",
        parts: [{ text: m.text }]
      }))
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        temperature: 0.7,
      }
    });

    return response.text;
  } catch (error: any) {
    if (error.message !== "INVALID_API_KEY") {
      console.error("AI Error generating chat content:", error);
    }
    
    return `Hiện tại hệ thống AI đang nghẽn mạng do quá tải, nhưng tôi đã kiểm tra sổ sách của bạn: \nTháng này bạn đã thu **${totalIncome.toLocaleString('vi-VN')} đ** và chi **${totalExpense.toLocaleString('vi-VN')} đ**. \n${sortedCategories ? `Bạn đang tiêu nhiều nhất vào:\n${sortedCategories}` : ""}\nHãy theo dõi kỹ chi tiêu để không vượt ngân sách nhé!`;
  }
}

// ─── Financial Health Score ───────────────────────────────────────────────────

export interface HealthScoreFactor {
  key: string;
  label: string;
  score: number;    // 0-100 within this factor
  weight: number;   // weight out of 100
  detail: string;
}

export interface HealthScoreResult {
  score: number;                  // 0-100 total
  label: "Yếu" | "Trung bình" | "Tốt" | "Xuất sắc";
  color: string;                  // hex
  factors: HealthScoreFactor[];
  suggestions: string[];
  generatedAt: string;
}

async function computeHealthScore(userId: string): Promise<HealthScoreResult> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // ── 1. Fetch data ───────────────────────────────────────────────────────────
  const [transactions, budgets] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, transactionDate: { gte: thirtyDaysAgo } },
      select: { type: true, amount: true, transactionDate: true, categoryId: true }
    }),
    prisma.budget.findMany({
      where: { userId, month: now.getMonth() + 1, year: now.getFullYear() },
      select: { categoryId: true, amount: true }
    })
  ]);

  // ── 2. Savings Rate factor (weight: 40) ───────────────────────────────────
  const totalIncome = transactions
    .filter(t => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions
    .filter(t => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalSaving = transactions
    .filter(t => t.type === "saving")
    .reduce((s, t) => s + Number(t.amount), 0);

  let savingsRateScore = 0;
  let savingsRateDetail = "Chưa có thu nhập ghi nhận trong 30 ngày.";
  if (totalIncome > 0) {
    const savingsRate = (totalIncome - totalExpense + totalSaving) / totalIncome;
    // >30% = 100, 20-30% = 80, 10-20% = 60, 0-10% = 30, <0 = 0
    if (savingsRate >= 0.3) savingsRateScore = 100;
    else if (savingsRate >= 0.2) savingsRateScore = 80;
    else if (savingsRate >= 0.1) savingsRateScore = 60;
    else if (savingsRate >= 0) savingsRateScore = 30;
    else savingsRateScore = 0;
    const pct = Math.round(savingsRate * 100);
    savingsRateDetail = `Tỉ lệ tiết kiệm: ${pct}% (Thu: ${totalIncome.toLocaleString('vi-VN')}đ / Chi: ${totalExpense.toLocaleString('vi-VN')}đ).`;
  }

  // ── 3. Budget Adherence factor (weight: 35) ────────────────────────────────
  let budgetScore = 70; // default if no budgets set
  let budgetDetail = "Bạn chưa thiết lập ngân sách tháng này.";
  if (budgets.length > 0) {
    const spentByCategory: Record<number, number> = {};
    transactions
      .filter(t => t.type === "expense" && t.categoryId && t.transactionDate >= startOfMonth)
      .forEach(t => {
        spentByCategory[t.categoryId!] = (spentByCategory[t.categoryId!] || 0) + Number(t.amount);
      });

    const overBudget = budgets.filter(b => (spentByCategory[b.categoryId] || 0) > Number(b.amount));
    const adherenceRate = 1 - overBudget.length / budgets.length;
    budgetScore = Math.round(adherenceRate * 100);
    budgetDetail = overBudget.length === 0
      ? `Tất cả ${budgets.length} hạng mục đều trong ngân sách. Xuất sắc!`
      : `${overBudget.length}/${budgets.length} hạng mục vượt ngân sách tháng này.`;
  }

  // ── 4. Logging Consistency factor (weight: 25) ────────────────────────────
  const uniqueDays = new Set(
    transactions.map(t => new Date(t.transactionDate).toDateString())
  ).size;
  const consistencyRate = Math.min(uniqueDays / 20, 1); // 20 active days = 100%
  const consistencyScore = Math.round(consistencyRate * 100);
  const consistencyDetail = `Ghi chép ${uniqueDays} ngày trong 30 ngày qua. ${uniqueDays >= 20 ? "Rất đều đặn!" : uniqueDays >= 10 ? "Khá tốt." : "Cần ghi chép thường xuyên hơn."}`;

  // ── 5. Aggregate score ────────────────────────────────────────────────────
  const score = Math.round(
    savingsRateScore * 0.40 +
    budgetScore * 0.35 +
    consistencyScore * 0.25
  );

  let label: HealthScoreResult["label"];
  let color: string;
  if (score >= 80) { label = "Xuất sắc"; color = "#16a34a"; }
  else if (score >= 60) { label = "Tốt"; color = "#0d9488"; }
  else if (score >= 40) { label = "Trung bình"; color = "#d97706"; }
  else { label = "Yếu"; color = "#dc2626"; }

  const factors: HealthScoreFactor[] = [
    { key: "savings", label: "Tỉ lệ tiết kiệm", score: savingsRateScore, weight: 40, detail: savingsRateDetail },
    { key: "budget", label: "Tuân thủ ngân sách", score: budgetScore, weight: 35, detail: budgetDetail },
    { key: "consistency", label: "Đều đặn ghi chép", score: consistencyScore, weight: 25, detail: consistencyDetail },
  ];

  // ── 6. AI tips (with fallback) ────────────────────────────────────────────
  const suggestions = await generateHealthTips(score, factors, totalIncome, totalExpense);

  return { score, label, color, factors, suggestions, generatedAt: now.toISOString() };
}

async function generateHealthTips(
  score: number,
  factors: HealthScoreFactor[],
  totalIncome: number,
  totalExpense: number
): Promise<string[]> {
  // Always have deterministic fallback tips ready
  const fallbackTips: string[] = [];
  const worstFactor = [...factors].sort((a, b) => a.score - b.score)[0];

  if (worstFactor.key === "savings") {
    fallbackTips.push("💡 Áp dụng quy tắc 50/30/20: 50% cho nhu cầu thiết yếu, 30% giải trí, 20% tiết kiệm.");
    fallbackTips.push(`📊 Nếu giảm chi tiêu ${Math.round(totalExpense * 0.1).toLocaleString('vi-VN')}đ (10%), bạn sẽ tiết kiệm thêm đáng kể mỗi tháng.`);
  } else if (worstFactor.key === "budget") {
    fallbackTips.push("🎯 Đặt ngân sách cho từng danh mục và kiểm tra tiến độ hàng tuần thay vì cuối tháng.");
    fallbackTips.push("🔔 Bật thông báo cảnh báo khi đạt 80% ngân sách danh mục để chủ động điều chỉnh.");
  } else {
    fallbackTips.push("📝 Ghi lại mọi giao dịch ngay khi phát sinh, kể cả những khoản nhỏ như cà phê, trà đá.");
    fallbackTips.push("⏰ Dành 5 phút mỗi tối để review và ghi chép chi tiêu trong ngày.");
  }
  if (score < 60) {
    fallbackTips.push("🚀 Bắt đầu với mục tiêu nhỏ: tiết kiệm 500k/tháng trong 3 tháng đầu để tạo thói quen.");
  }

  try {
    if (!isApiKeyValid(process.env.GEMINI_API_KEY)) {
      throw new Error("INVALID_API_KEY");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const factorSummary = factors.map(f => `- ${f.label}: ${f.score}/100 (${f.detail})`).join("\n");
    const prompt = `Người dùng ứng dụng tài chính có điểm sức khoẻ tài chính: ${score}/100 (${factors.find(f=>f.score===Math.min(...factors.map(x=>x.score)))?.label}).

Chi tiết các yếu tố:
${factorSummary}

Hãy đưa ra ĐÚNG 3 lời khuyên cụ thể, actionable bằng tiếng Việt để cải thiện điểm số. Mỗi lời khuyên một dòng, bắt đầu bằng emoji phù hợp. KHÔNG giải thích thêm, chỉ 3 dòng gợi ý.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.6 }
    });

    const raw = response.text || "";
    const tips = raw.split("\n").map(l => l.trim()).filter(l => l.length > 10).slice(0, 3);
    return tips.length >= 2 ? tips : fallbackTips;
  } catch (error: any) {
    if (error.message !== "INVALID_API_KEY") {
      console.error("AI Health Tips Error:", error);
    }
    return fallbackTips;
  }
}

// ─── Weekly Spending Insight ───────────────────────────────────────────────────

export interface WeeklyInsight {
  insight: string;
  action: string;
}

export interface WeeklyInsightResult {
  insights: WeeklyInsight[];
  generatedAt: string;
}

async function getWeeklyInsights(userId: string): Promise<WeeklyInsightResult> {
  const now = new Date();
  
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  // Get transactions for the last 30 days
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: "expense",
      transactionDate: { gte: thirtyDaysAgo }
    },
    include: { category: true }
  });

  const last7DaysTransactions = transactions.filter(t => t.transactionDate >= sevenDaysAgo);
  const previous23DaysTransactions = transactions.filter(t => t.transactionDate < sevenDaysAgo);

  const spentLast7Days = last7DaysTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
  
  // Group by category for last 7 days
  const categorySpent7Days: Record<string, number> = {};
  last7DaysTransactions.forEach(t => {
    const catName = t.category?.nameVi || t.category?.name || "Khác";
    categorySpent7Days[catName] = (categorySpent7Days[catName] || 0) + Number(t.amount);
  });

  // Calculate weekly average from the previous 23 days (approx 3.3 weeks)
  const previousWeeks = 23 / 7;
  const avgWeeklySpentByCategory: Record<string, number> = {};
  previous23DaysTransactions.forEach(t => {
    const catName = t.category?.nameVi || t.category?.name || "Khác";
    avgWeeklySpentByCategory[catName] = (avgWeeklySpentByCategory[catName] || 0) + Number(t.amount);
  });
  
  for (const cat in avgWeeklySpentByCategory) {
    avgWeeklySpentByCategory[cat] = Math.round(avgWeeklySpentByCategory[cat] / previousWeeks);
  }

  // Find anomalies
  const anomalies = [];
  for (const cat in categorySpent7Days) {
    const spentNow = categorySpent7Days[cat];
    const avgSpent = avgWeeklySpentByCategory[cat] || 0;
    
    if (spentNow > 50000 && (avgSpent === 0 || spentNow > avgSpent * 1.2)) {
      anomalies.push({
        category: cat,
        spent: spentNow,
        average: avgSpent,
        difference: spentNow - avgSpent,
        percentageIncrease: avgSpent === 0 ? 100 : Math.round(((spentNow - avgSpent) / avgSpent) * 100)
      });
    }
  }

  anomalies.sort((a, b) => b.difference - a.difference);

  const fallbackInsights: WeeklyInsight[] = [];
  
  if (anomalies.length > 0) {
    const topAnomaly = anomalies[0];
    fallbackInsights.push({
      insight: `Chi tiêu cho ${topAnomaly.category} tuần này (${topAnomaly.spent.toLocaleString('vi-VN')}đ) cao hơn mức trung bình.`,
      action: `Cố gắng giảm chi tiêu hạng mục này vào tuần tới để tiết kiệm ${topAnomaly.difference.toLocaleString('vi-VN')}đ.`
    });
  } else if (spentLast7Days > 0) {
     fallbackInsights.push({
      insight: `Bạn đã chi ${spentLast7Days.toLocaleString('vi-VN')}đ trong tuần qua. Chi tiêu của bạn đang ở mức ổn định.`,
      action: `Tiếp tục duy trì thói quen chi tiêu này.`
    });
  } else {
     fallbackInsights.push({
      insight: `Chưa có khoản chi nào được ghi nhận trong tuần qua.`,
      action: `Nhớ ghi chép các khoản chi tiêu hàng ngày nhé!`
    });
  }
  
  if (anomalies.length > 1) {
    const secondAnomaly = anomalies[1];
    fallbackInsights.push({
       insight: `Khoản chi cho ${secondAnomaly.category} cũng tăng ${secondAnomaly.percentageIncrease}% so với bình thường.`,
       action: `Kiểm tra lại xem đây là chi phí cần thiết hay có thể cắt giảm.`
    });
  }

  try {
    if (!isApiKeyValid(process.env.GEMINI_API_KEY)) {
      throw new Error("INVALID_API_KEY");
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const contextData = {
      totalSpentLast7Days: spentLast7Days,
      categorySpending: categorySpent7Days,
      averageWeeklySpending: avgWeeklySpentByCategory,
      anomaliesFound: anomalies.slice(0, 3)
    };

    const prompt = `Bạn là trợ lý tài chính thông minh. Hãy phân tích dữ liệu chi tiêu tuần qua của người dùng và đưa ra đúng 3 nhận xét hữu ích (insights).
    
Dữ liệu:
${JSON.stringify(contextData, null, 2)}

Yêu cầu:
- Tập trung vào các khoản chi bất thường (anomaliesFound) hoặc tổng chi tiêu so với trung bình.
- Mỗi insight phải đi kèm 1 "action" gợi ý cụ thể, có thể đo lường được (VD: "Giảm café 20% tiết kiệm 400k").
- Trả về CHÍNH XÁC cấu trúc JSON mảng như sau, không có text bao quanh, không markdown block:
[
  {
    "insight": "Tuần này bạn chi tiền ăn uống tăng 30% (tổng 1.200.000đ).",
    "action": "Tự nấu ăn 3 buổi tối tuần sau để tiết kiệm khoảng 300.000đ."
  }
]`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { 
        temperature: 0.7,
        responseMimeType: "application/json"
      }
    });

    const raw = response.text || "";
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch(e) {
      const cleanText = raw.replace(/```json/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleanText);
    }

    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].insight && parsed[0].action) {
      return {
        insights: parsed.slice(0, 3),
        generatedAt: now.toISOString()
      };
    }
    
    return { insights: fallbackInsights, generatedAt: now.toISOString() };
  } catch (error: any) {
    if (error.message !== "INVALID_API_KEY") {
      console.error("AI Insights Error:", error);
    }
    return { insights: fallbackInsights, generatedAt: now.toISOString() };
  }
}

// ─── Recurring Expense Detection ──────────────────────────────────────────────

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

async function getRecurringExpenses(userId: string): Promise<RecurringInsightsResult> {
  const now = new Date();
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(now.getDate() - 90);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: "expense",
      transactionDate: { gte: ninetyDaysAgo }
    },
    include: { category: true }
  });

  const groupMap: Record<string, { count: number, total: number, items: any[], name: string, category: string }> = {};

  transactions.forEach(t => {
    const desc = t.description ? t.description.toLowerCase().trim() : "Khác";
    const amount = Number(t.amount);
    const roundedAmount = Math.round(amount / 10000) * 10000;
    const key = `${desc.substring(0, 8)}_${roundedAmount}`;
    
    if (!groupMap[key]) {
      groupMap[key] = {
        count: 0,
        total: 0,
        items: [],
        name: t.description || "Giao dịch",
        category: t.category?.nameVi || t.category?.name || "Khác"
      };
    }
    
    groupMap[key].count++;
    groupMap[key].total += amount;
    groupMap[key].items.push(t);
  });

  const recurringCandidates = Object.values(groupMap)
    .filter(g => g.count >= 2)
    .map(g => ({
      description: g.name,
      amount: Math.round(g.total / g.count),
      count: g.count,
      category: g.category
    }));

  const fallbackResult: RecurringInsightsResult = {
    expenses: recurringCandidates.map((c, i) => ({
      id: `rec_${i}`,
      description: c.description,
      amount: c.amount,
      frequency: c.count >= 3 ? "Hàng tháng" : "Định kỳ",
      category: c.category,
      suggestion: "Giữ nguyên",
      reason: "Khoản chi định kỳ bình thường."
    })),
    totalPotentialSavings: 0,
    generatedAt: now.toISOString()
  };

  if (recurringCandidates.length === 0) {
    return fallbackResult;
  }

  try {
    if (!isApiKeyValid(process.env.GEMINI_API_KEY)) {
      throw new Error("INVALID_API_KEY");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `Bạn là chuyên gia tài chính. Hệ thống đã phát hiện các khoản chi lặp lại sau đây của người dùng trong 3 tháng qua:
${JSON.stringify(recurringCandidates, null, 2)}

Nhiệm vụ:
Với MỖI khoản chi, hãy gợi ý hành động tối ưu (Giữ nguyên / Cắt giảm / Huỷ bỏ) kèm theo lý do tiếng Việt ngắn gọn. Tính tổng số tiền tiết kiệm được NẾU người dùng thực hiện theo tất cả các gợi ý (Cắt giảm/Huỷ bỏ). Nếu "Giữ nguyên" thì tiền tiết kiệm là 0.

Trả về MỘT chuỗi JSON (không dùng markdown code block, không text bao quanh) đúng theo cấu trúc sau:
{
  "expenses": [
    {
      "description": "Tên khoản chi",
      "amount": 100000,
      "category": "Danh mục",
      "frequency": "Hàng tháng",
      "suggestion": "Giữ nguyên" | "Cắt giảm" | "Huỷ bỏ",
      "reason": "Giải thích tại sao..."
    }
  ],
  "totalPotentialSavings": 500000
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        temperature: 0.5,
        responseMimeType: "application/json"
      }
    });

    const raw = response.text || "";
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch(e) {
      const cleanText = raw.replace(/```json/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleanText);
    }
    
    if (parsed && Array.isArray(parsed.expenses)) {
      return {
        expenses: parsed.expenses.map((e: any, i: number) => ({
          id: `rec_ai_${i}`,
          description: e.description || "",
          amount: Number(e.amount) || 0,
          category: e.category || "",
          frequency: e.frequency || "Định kỳ",
          suggestion: ["Giữ nguyên", "Cắt giảm", "Huỷ bỏ"].includes(e.suggestion) ? e.suggestion : "Giữ nguyên",
          reason: e.reason || ""
        })),
        totalPotentialSavings: Number(parsed.totalPotentialSavings) || 0,
        generatedAt: now.toISOString()
      };
    }

    return fallbackResult;
  } catch (error: any) {
    if (error.message !== "INVALID_API_KEY") {
      console.error("AI Recurring Error:", error);
    }
    return fallbackResult;
  }
}

export const AIService = {
  suggestCategory,
  parseQuickInput,
  chatWithFinancialContext,
  computeHealthScore,
  getWeeklyInsights,
  getRecurringExpenses
};

// Refactored: chore(ai): update Gemini prompt parameters for better financial advice

// Refactored: chore(ai): update Gemini prompt parameters for better financial advice

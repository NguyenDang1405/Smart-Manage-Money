import { prisma } from "../src/shared/prisma";
import * as fs from "fs";
import * as path from "path";

interface ChatMLMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatMLSample {
  messages: ChatMLMessage[];
}

const DEFAULT_CATEGORIES = [
  { id: 1, name: "Food & Drinks", nameVi: "Thực phẩm & Ăn uống" },
  { id: 2, name: "Transportation", nameVi: "Di chuyển & Xe cộ" },
  { id: 3, name: "Shopping & Entertainment", nameVi: "Giải trí & Mua sắm" },
  { id: 4, name: "Home & Bills", nameVi: "Nhà cửa & Hóa đơn" },
  { id: 5, name: "Salary & Income", nameVi: "Lương & Thưởng" },
  { id: 6, name: "Others", nameVi: "Khác" }
];

async function generateDataset() {
  console.log("Preparing fine-tuning data...");
  const samples: ChatMLSample[] = [];

  // 1. Fetch categories
  let categories = DEFAULT_CATEGORIES;
  try {
    const dbCats = await prisma.category.findMany({
      where: { isSystem: true },
      select: { id: true, name: true, nameVi: true }
    });
    if (dbCats.length > 0) {
      categories = dbCats.map(c => ({
        id: c.id,
        name: c.name,
        nameVi: c.nameVi || c.name
      }));
      console.log(`Fetched ${categories.length} categories from Database.`);
    } else {
      console.log("Database contains no categories. Using defaults.");
    }
  } catch (err) {
    console.log("Could not connect to Database. Using fallback categories.");
  }

  const categoryList = categories.map(c => `ID: ${c.id} - ${c.nameVi || c.name}`).join("\n");
  const fallbackCat = categories.find(c => c.nameVi?.includes("Khác") || c.name.includes("Other"))?.id || 6;

  // Task A: Category Suggestion (suggestCategory)
  console.log("Generating Category Suggestion samples...");
  const suggestInputs = [
    { desc: "ăn phở bò ăn sáng", catId: 1, catName: "Thực phẩm & Ăn uống" },
    { desc: "mua cafe sữa đá", catId: 1, catName: "Thực phẩm & Ăn uống" },
    { desc: "tiền đi chợ nấu cơm tối", catId: 1, catName: "Thực phẩm & Ăn uống" },
    { desc: "uống trà sữa dingtea", catId: 1, catName: "Thực phẩm & Ăn uống" },
    { desc: "nạp xăng xe máy", catId: 2, catName: "Di chuyển & Xe cộ" },
    { desc: "bắt grab đi làm", catId: 2, catName: "Di chuyển & Xe cộ" },
    { desc: "đi taxi ra sân bay", catId: 2, catName: "Di chuyển & Xe cộ" },
    { desc: "mua quần jean áo thun shopee", catId: 3, catName: "Giải trí & Mua sắm" },
    { desc: "vé xem phim rạp cgv", catId: 3, catName: "Giải trí & Mua sắm" },
    { desc: "gia hạn netflix 1 tháng", catId: 3, catName: "Giải trí & Mua sắm" },
    { desc: "mua điện thoại mới tgdd", catId: 3, catName: "Giải trí & Mua sắm" },
    { desc: "đóng tiền điện nước tháng này", catId: 4, catName: "Nhà cửa & Hóa đơn" },
    { desc: "tiền thuê nhà tháng 6", catId: 4, catName: "Nhà cửa & Hóa đơn" },
    { desc: "đóng tiền mạng internet viettel", catId: 4, catName: "Nhà cửa & Hóa đơn" },
    { desc: "nhận lương tháng 5", catId: 5, catName: "Lương & Thưởng" },
    { desc: "tiền thưởng dự án xuất sắc", catId: 5, catName: "Lương & Thưởng" },
    { desc: "nhận lãi ngân hàng gửi tiết kiệm", catId: 5, catName: "Lương & Thưởng" },
    { desc: "mua vé số trúng 100k", catId: 6, catName: "Khác" },
    { desc: "quyên góp từ thiện", catId: 6, catName: "Khác" }
  ];

  for (const input of suggestInputs) {
    const prompt = `Bạn là trợ lý tài chính thông minh. Người dùng nhập nội dung giao dịch: "${input.desc}".
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

    // Create 3 suggestions mock output
    const confidence1 = 90 + Math.floor(Math.random() * 9);
    const confidence2 = 10 + Math.floor(Math.random() * 20);
    const confidence3 = 5 + Math.floor(Math.random() * 5);
    const mockOutput = [
      { categoryId: input.catId, categoryName: input.catName, confidence: confidence1 },
      { categoryId: input.catId === 1 ? 3 : 1, categoryName: input.catId === 1 ? "Giải trí & Mua sắm" : "Thực phẩm & Ăn uống", confidence: confidence2 },
      { categoryId: fallbackCat, categoryName: "Khác", confidence: confidence3 }
    ];

    samples.push({
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prompt },
        { role: "assistant", content: JSON.stringify(mockOutput, null, 2) }
      ]
    });
  }

  // Task B: Quick Input Parsing (parseQuickInput)
  console.log("Generating Quick Input Parsing samples...");
  const parseInputs = [
    {
      text: "ăn sáng 40k cơm tấm",
      expected: [{ amount: 40000, description: "Cơm tấm", categoryId: 1, type: "expense" }]
    },
    {
      text: "đổ xăng 50k ngày hôm qua",
      expected: [{ amount: 50000, description: "Xăng", categoryId: 2, type: "expense" }]
    },
    {
      text: "mua áo khoác shopee 250k",
      expected: [{ amount: 250000, description: "Áo khoác shopee", categoryId: 3, type: "expense" }]
    },
    {
      text: "thanh toán điện nước 1tr2",
      expected: [{ amount: 1200000, description: "Điện nước", categoryId: 4, type: "expense" }]
    },
    {
      text: "nhận lương 15 triệu",
      expected: [{ amount: 15000000, description: "Lương", categoryId: 5, type: "income" }]
    },
    {
      text: "ăn phở bò 50k và cafe 30k sáng nay",
      expected: [
        { amount: 50000, description: "Phở bò", categoryId: 1, type: "expense" },
        { amount: 30000, description: "Cafe", categoryId: 1, type: "expense" }
      ]
    },
    {
      text: "tiền nhà 3 củ và internet 300k",
      expected: [
        { amount: 3000000, description: "Nhà", categoryId: 4, type: "expense" },
        { amount: 300000, description: "Internet", categoryId: 4, type: "expense" }
      ]
    }
  ];

  const todayStr = new Date().toISOString().split('T')[0];

  for (const input of parseInputs) {
    const prompt = `Bạn là một trợ lý tài chính thông minh giúp người dùng nhập liệu chi tiêu bằng ngôn ngữ tự nhiên.
Người dùng vừa nhập câu sau: "${input.text}"

Nhiệm vụ của bạn là bóc tách các giao dịch từ câu trên và trả về dưới dạng một mảng JSON array. Đảm bảo hỗ trợ nhập nhiều giao dịch cùng lúc (tách nhau bằng dấu phẩy, chữ "và", hoặc ngữ cảnh). Giới hạn tối đa 10 giao dịch.

Danh sách các Danh mục (Category) có sẵn:
${categoryList}

Quy tắc xử lý:
1. amount: Số tiền của giao dịch. Chuyển đổi "k" thành nghìn (vd 40k -> 40000), "tr" hoặc "củ" thành triệu (vd 2 củ -> 2000000). Luôn là số nguyên dương. Nếu không có số tiền cụ thể, cố gắng ước lượng hoặc bỏ qua.
2. description: Mô tả ngắn gọn về giao dịch (vd: "phở bò", "đổ xăng", "lương tháng 10").
3. categoryId: Chọn ID của danh mục phù hợp nhất từ danh sách trên. Nếu không chắc chắn, có thể trả về null hoặc chọn danh mục "Khác".
4. date: Ngày thực hiện giao dịch, định dạng "YYYY-MM-DD". Hôm nay là ${todayStr}. Hiểu các từ khóa như "hôm qua", "sáng nay", "tối qua" để tính toán ngày tương ứng. Nếu không có từ khóa thời gian, mặc định là ngày hôm nay.
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

    const assistantOutput = input.expected.map(e => ({
      amount: e.amount,
      description: e.description,
      categoryId: e.categoryId,
      date: input.text.includes("hôm qua") 
        ? new Date(Date.now() - 86400000).toISOString().split('T')[0] 
        : todayStr,
      type: e.type
    }));

    samples.push({
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prompt },
        { role: "assistant", content: JSON.stringify(assistantOutput, null, 2) }
      ]
    });
  }

  // Task C: Chat & Insights (chatWithFinancialContext)
  console.log("Generating Chat Context samples...");
  const chatContexts = [
    {
      income: 20000000,
      expense: 12000000,
      categories: "- Giải trí & Mua sắm: 5.000.000 đ\n- Thực phẩm & Ăn uống: 4.500.000 đ\n- Di chuyển & Xe cộ: 1.500.000 đ",
      userMsg: "Tôi đã tiêu bao nhiêu tiền tháng này và phần lớn là vào việc gì?",
      reply: "Tháng này bạn đã chi tiêu tổng cộng 12.000.000 đ và nhận được 20.000.000 đ tiền thu nhập (Số dư hiện tại: +8.000.000 đ). Các khoản chi tiêu nhiều nhất của bạn là:\n1. Giải trí & Mua sắm: 5.000.000 đ\n2. Thực phẩm & Ăn uống: 4.500.000 đ\n3. Di chuyển & Xe cộ: 1.500.000 đ.\nHãy lưu ý kiểm soát phần mua sắm giải trí để duy trì dòng tiền tiết kiệm nhé!"
    },
    {
      income: 15000000,
      expense: 14500000,
      categories: "- Thực phẩm & Ăn uống: 6.000.000 đ\n- Nhà cửa & Hóa đơn: 5.000.000 đ\n- Giải trí & Mua sắm: 3.500.000 đ",
      userMsg: "Làm sao để tôi tiết kiệm nhiều hơn?",
      reply: "Nhìn vào chi tiêu tháng này, bạn đã tiêu gần hết thu nhập (14.500.000 đ trên 15.000.000 đ, tiết kiệm chỉ còn 500.000 đ). \nHai khoản chi lớn nhất của bạn là Ăn uống (6 triệu) và Nhà cửa/Hóa đơn (5 triệu). Để tiết kiệm tốt hơn:\n- Cắt giảm bớt mua sắm giải trí (hiện tại là 3.5 triệu).\n- Thử nấu ăn tại nhà nhiều hơn để giảm bớt chi tiêu ăn uống ngoài.\n- Đặt hạn mức chi tiêu cụ thể cho từng mục ngay từ đầu tháng."
    }
  ];

  for (const ctx of chatContexts) {
    const today = new Date();
    const financialContext = `
Thông tin tài chính của người dùng (Tháng ${today.getMonth() + 1}/${today.getFullYear()}):
- Tổng thu: ${ctx.income.toLocaleString('vi-VN')} đ
- Tổng chi: ${ctx.expense.toLocaleString('vi-VN')} đ
- Số dư tháng: ${(ctx.income - ctx.expense).toLocaleString('vi-VN')} đ
- Top 3 danh mục chi tiêu cao nhất:
${ctx.categories}
`;
    const systemPrompt = `Bạn là trợ lý tài chính cá nhân thông minh của ứng dụng Smart Money Manager. 
Tên của bạn là "Trợ lý SMM". Bạn luôn giao tiếp bằng tiếng Việt, lịch sự, ngắn gọn và hữu ích.
Hãy sử dụng ngữ cảnh tài chính thực tế dưới đây để trả lời các câu hỏi của người dùng một cách cá nhân hóa. Nếu người dùng hỏi các vấn đề không liên quan đến tài chính, hãy khéo léo điều hướng về chủ đề tài chính.

${financialContext}`;

    samples.push({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: ctx.userMsg },
        { role: "assistant", content: ctx.reply }
      ]
    });
  }

  // Task D: Financial Health tips
  console.log("Generating Health Tips samples...");
  const healthInputs = [
    {
      score: 55,
      factors: [
        { key: "savings", label: "Tỉ lệ tiết kiệm", score: 30, weight: 40, detail: "Tỉ lệ tiết kiệm: 5% (Thu: 10M / Chi: 9.5M)." },
        { key: "budget", label: "Tuân thủ ngân sách", score: 70, weight: 35, detail: "1/3 hạng mục vượt ngân sách tháng này." },
        { key: "consistency", label: "Đều đặn ghi chép", score: 80, weight: 25, detail: "Ghi chép 16 ngày trong 30 ngày qua." }
      ],
      reply: `💡 Áp dụng quy tắc 50/30/20: giảm chi tiêu không thiết yếu để nâng tỷ lệ tiết kiệm lên mức 20% thu nhập.
🎯 Đặt giới hạn ngân sách chặt chẽ hơn đối với danh mục Ăn uống/Mua sắm vì đây là nơi dễ làm bạn chi tiêu quá tay.
📝 Duy trì việc ghi chép chi tiêu đều đặn mỗi ngày để nhận thức rõ các khoản rò rỉ tài chính.`
    }
  ];

  for (const input of healthInputs) {
    const factorSummary = input.factors.map(f => `- ${f.label}: ${f.score}/100 (${f.detail})`).join("\n");
    const prompt = `Người dùng ứng dụng tài chính có điểm sức khoẻ tài chính: ${input.score}/100 (${input.factors.find(f=>f.score===Math.min(...input.factors.map(x=>x.score)))?.label}).

Chi tiết các yếu tố:
${factorSummary}

Hãy đưa ra ĐÚNG 3 lời khuyên cụ thể, actionable bằng tiếng Việt để cải thiện điểm số. Mỗi lời khuyên một dòng, bắt đầu bằng emoji phù hợp. KHÔNG giải thích thêm, chỉ 3 dòng gợi ý.`;

    samples.push({
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prompt },
        { role: "assistant", content: input.reply }
      ]
    });
  }

  // Write dataset
  const outputFilePath = path.join(__dirname, "../finetuning_dataset.jsonl");
  const stream = fs.createWriteStream(outputFilePath);
  
  for (const sample of samples) {
    stream.write(JSON.stringify(sample) + "\n");
  }
  stream.end();

  console.log(`Success! Dataset with ${samples.length} items written to: ${outputFilePath}`);
}

generateDataset().catch(console.error);

import { AIService } from './modules/ai/ai.service';
import { prisma } from './shared/prisma';
import dotenv from 'dotenv';
dotenv.config();

const dataset = [
  { text: "trả tiền điện", expected: "Nhà cửa & Hóa đơn" },
  { text: "đổ xăng 50k", expected: "Di chuyển & Xe cộ" },
  { text: "ăn bún bò huế", expected: "Thực phẩm & Ăn uống" },
  { text: "mua sắm shopee", expected: "Giải trí & Mua sắm" },
  { text: "lương tháng 5", expected: "Lương & Thưởng" },
  { text: "Grab bike to work", expected: "Di chuyển & Xe cộ" },
  { text: "đóng học phí", expected: "Khác" }, // Can be Education, but currently mapping to "Khác"
  { text: "đi siêu thị coopmart", expected: "Giải trí & Mua sắm" },
  { text: "coffee shop with friends", expected: "Thực phẩm & Ăn uống" },
  { text: "tiền nước sinh hoạt", expected: "Nhà cửa & Hóa đơn" }
];

async function runTest() {
  console.log("Running Categorization Accuracy Test...");
  const testUserId = "test-user-id"; // We can pass a dummy id if we rely on isSystem categories

  let correctCount = 0;

  for (const item of dataset) {
    try {
      const suggestions = await AIService.suggestCategory(testUserId, item.text);
      if (suggestions && suggestions.length > 0) {
        const topCat = suggestions[0].categoryName;
        const isMatch = topCat === item.expected || 
                        (item.expected === "Khác" && topCat !== "Thực phẩm & Ăn uống" && topCat !== "Di chuyển & Xe cộ" && topCat !== "Nhà cửa & Hóa đơn" && topCat !== "Lương & Thưởng" && topCat !== "Giải trí & Mua sắm");

        if (isMatch) {
          correctCount++;
          console.log(`[PASS] "${item.text}" -> ${topCat} (${suggestions[0].confidence}%)`);
        } else {
          console.log(`[FAIL] "${item.text}" -> Got: ${topCat}, Expected: ${item.expected}`);
        }
      } else {
        console.log(`[FAIL] "${item.text}" -> No suggestions returned.`);
      }
    } catch (err: any) {
      console.log(`[ERROR] "${item.text}" -> ${err.message}`);
    }
  }

  const accuracy = (correctCount / dataset.length) * 100;
  console.log(`\nAccuracy: ${accuracy}% (${correctCount}/${dataset.length})`);
  process.exit(0);
}

runTest();

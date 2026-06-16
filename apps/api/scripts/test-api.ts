import "dotenv/config";

async function runTest() {
  const baseUrl = "http://localhost:4000";
  console.log("🚀 Bắt đầu test luồng API E2E tới", baseUrl);

  // 1. Đăng ký / Đăng nhập để lấy token
  let token = "";
  const authPayload = {
    email: "demo_user_" + Date.now() + "@example.com",
    password: "Password123!",
    fullName: "Demo Tài chính",
  };

  try {
    console.log("\n1️⃣ Đăng ký tài khoản mới:", authPayload.email);
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authPayload),
    });
    const regData = await regRes.json();
    console.log("Kết quả đăng ký:", JSON.stringify(regData, null, 2));
    token = regData.token || regData.data?.token;
  } catch (err) {
    console.error("Lỗi đăng ký:", err);
  }

  if (!token) {
    console.error("❌ Không lấy được token, dừng test.");
    return;
  }

  console.log("\n🔑 Đã lấy được JWT Token:", token.substring(0, 30) + "...");

  // 2. Insert transaction mới
  console.log("\n2️⃣ Gửi POST /transactions tạo giao dịch mới...");
  const txPayload = {
    type: "expense",
    amount: "155000",
    category: "Thực phẩm & Ăn uống",
    note: "Ăn trưa nhà hàng hải sản E2E",
  };

  try {
    const txRes = await fetch(`${baseUrl}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(txPayload),
    });
    const txData = await txRes.json();
    console.log("Kết quả tạo giao dịch:", JSON.stringify(txData, null, 2));
  } catch (err) {
    console.error("Lỗi tạo giao dịch:", err);
  }

  // 3. Lấy danh sách giao dịch GET /transactions
  console.log("\n3️⃣ Gửi GET /transactions kiểm tra dữ liệu lưu trong Database...");
  try {
    const listRes = await fetch(`${baseUrl}/transactions?limit=5`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const listData = await listRes.json();
    console.log("Danh sách giao dịch trả về từ DB:", JSON.stringify(listData, null, 2));
  } catch (err) {
    console.error("Lỗi lấy danh sách giao dịch:", err);
  }
}

runTest();

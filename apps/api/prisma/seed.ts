import { prisma } from "../src/shared/prisma";

async function main() {
  console.log("🌱 Starting seeding...");

  // Mật khẩu đã băm sẵn của "password123"
  const mockedHash = "$2a$10$8K.q6J5Kz.6K.q6J5Kz.6K.q6J5Kz.6K.q6J5Kz.6K.q6J5Kz.6";

  const testUser = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      passwordHash: mockedHash,
      fullName: "Test User",
      monthlyIncome: 15000000,
      currency: "VND",
    },
  });

  console.log(`Created user: ${testUser.email}`);
  console.log("✅ Seeding finished successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

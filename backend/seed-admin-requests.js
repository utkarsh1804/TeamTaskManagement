const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const requests = [
    { name: "Priya Mehta", email: "priya.mehta@taskflow.io", password: "Priya@1234" },
    { name: "Ravi Kumar", email: "ravi.kumar@taskflow.io", password: "Ravi@1234" },
    { name: "Sneha Reddy", email: "sneha.reddy@taskflow.io", password: "Sneha@1234" },
    { name: "Arjun Nair", email: "arjun.nair@taskflow.io", password: "Arjun@1234" },
  ];

  for (const r of requests) {
    const existing = await prisma.adminRequest.findUnique({ where: { email: r.email } });
    if (existing) {
      console.log("Skipping existing:", r.email);
      continue;
    }
    const passwordHash = await bcrypt.hash(r.password, 12);
    await prisma.adminRequest.create({
      data: { name: r.name, email: r.email, passwordHash },
    });
    console.log("Created request:", r.email);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

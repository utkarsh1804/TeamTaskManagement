const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@teamtask.io";
const ADMIN_PASSWORD = "Admin@1234";

const memberNames = [
  "Aarav Sharma", "Vivaan Patel", "Aditya Kumar", "Vihaan Singh", "Arjun Reddy",
  "Sai Verma", "Reyansh Joshi", "Ayaan Gupta", "Krishna Nair", "Ishaan Mehta",
  "Shaurya Rao", "Ananya Desai", "Diya Iyer", "Myra Kapoor", "Sara Malhotra",
  "Aadhya Chauhan", "Isha Bhat", "Kiara Saxena", "Riya Pillai", "Priya Das",
  "Parth Agarwal", "Rohan Kulkarni", "Karan Menon", "Dev Thakur", "Nikhil Bhatia",
  "Amit Joshi", "Rahul Pandey", "Suresh Hegde", "Manish Tiwari", "Vikram Shetty",
  "Neha Rangan", "Pooja Acharya", "Anjali Mukherjee", "Meera Nair", "Kavita Shenoy",
  "Raj Khandelwal", "Arun Subramanian", "Siddharth Dutta", "Yash Phadke", "Om Raut",
  "Tanvi Khanna", "Nisha Bhatt", "Shruti Vaidya", "Divya Iyengar", "Preeti Srinivas",
  "Harsh Dalal", "Gaurav Parekh", "Rajesh Goyal", "Sanjay Luthra", "Mohan Chandra",
];

async function main() {
  const existingAdmin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await prisma.user.create({
      data: {
        name: "Admin",
        email: ADMIN_EMAIL,
        passwordHash,
        globalRole: "ADMIN",
      },
    });
    console.log(`Created admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  } else {
    console.log(`Admin already exists: ${ADMIN_EMAIL}`);
  }

  let created = 0;
  for (let i = 0; i < memberNames.length; i++) {
    const name = memberNames[i];
    const email = name.toLowerCase().replace(/\s+/g, ".") + "@taskflow.io";
    const password = `Member@${(i + 1).toString().padStart(3, "0")}`;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`Skipping existing: ${email}`);
      continue;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        globalRole: "MEMBER",
      },
    });
    created++;
    console.log(`Created: ${email} / ${password}`);
  }

  console.log(`\nDone. Created ${created} team members.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

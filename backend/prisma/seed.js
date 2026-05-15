const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@teamtask.io";
const ADMIN_PASSWORD = "Admin@1234";

const demoNames = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun",
  "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
  "Shaurya", "Ananya", "Diya", "Myra", "Sara",
  "Aadhya", "Isha", "Kiara", "Riya", "Priya",
  "Parth", "Rohan", "Karan", "Dev", "Nikhil",
  "Amit", "Rahul", "Suresh", "Manish", "Vikram",
  "Neha", "Pooja", "Anjali", "Meera", "Kavita",
  "Raj", "Arun", "Siddharth", "Yash", "Om",
  "Tanvi", "Nisha", "Shruti", "Divya", "Preeti",
  "Harsh", "Gaurav", "Rajesh", "Sanjay", "Mohan",
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
  for (let i = 0; i < demoNames.length; i++) {
    const name = demoNames[i];
    const email = `${name.toLowerCase()}@demouser.in`;
    const password = `demousernumber${i + 1}`;

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

  console.log(`\nDone. Created ${created} demo users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const users = [
    {
      name: "Demo Participant",
      email: "participant@dogfood.local",
      role: "PARTICIPANT" as const,
    },
    {
      name: "Demo Judge",
      email: "judge@dogfood.local",
      role: "JUDGE" as const,
    },
    {
      name: "Demo Organizer",
      email: "organizer@dogfood.local",
      role: "ORGANIZER" as const,
    },
    {
      name: "Demo Admin",
      email: "admin@dogfood.local",
      role: "ADMIN" as const,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: {
        email: user.email,
      },
      update: {
        name: user.name,
        role: user.role,
        passwordHash,
      },
      create: {
        name: user.name,
        email: user.email,
        role: user.role,
        passwordHash,
      },
    });
  }

  console.log("Demo users created successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
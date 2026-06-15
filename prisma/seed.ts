/**
 * CLI database seed for Verdant Organic Market.
 * Run with: npm run seed
 *
 * Delegates to the shared, idempotent seeding logic in src/lib/seed.ts so the
 * same data is used by the CLI and the guarded /api/setup endpoint.
 */
import { PrismaClient } from "@prisma/client";
import { runSeed } from "../src/lib/seed";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Verdant Organic Market...");
  const result = await runSeed(prisma);
  console.log(
    `✅ Seed complete — ${result.categories} categories, ${result.products} products, ${result.coupons} coupons.`,
  );
  console.log(`👤 Admin user: ${result.adminEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

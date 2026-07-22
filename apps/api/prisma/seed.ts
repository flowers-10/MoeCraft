import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function requireSeedPassword(): string {
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!password || password.length < 12 || password.startsWith("<")) {
    throw new Error("SEED_ADMIN_PASSWORD must contain at least 12 non-placeholder characters");
  }

  return password;
}

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(requireSeedPassword(), 12);

  await prisma.user.upsert({
    where: { username: "platform-admin" },
    update: { displayName: "MoeCraft Platform Admin", passwordHash, isActive: true },
    create: {
      username: "platform-admin",
      displayName: "MoeCraft Platform Admin",
      passwordHash,
      roles: { create: { role: "PLATFORM_ADMIN" } }
    }
  });

  const category = await prisma.category.upsert({
    where: { slug: "scale-figures" },
    update: { nameZhCn: "比例手办", nameEnUs: "Scale Figures" },
    create: { slug: "scale-figures", nameZhCn: "比例手办", nameEnUs: "Scale Figures" }
  });

  let store = await prisma.store.findUnique({ where: { slug: "moecraft-demo" } });

  if (!store) {
    const merchant = await prisma.merchant.create({ data: { name: "MoeCraft 演示商家" } });
    store = await prisma.store.create({
      data: { merchantId: merchant.id, name: "MoeCraft 演示店", slug: "moecraft-demo" }
    });
  }

  const existingSku = await prisma.sku.findUnique({ where: { code: "DEMO-FIGURE-001" } });

  if (!existingSku) {
    await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: category.id,
        titleZhCn: "MoeCraft 演示比例手办",
        titleEnUs: "MoeCraft Demo Scale Figure",
        status: "ACTIVE",
        skus: {
          create: {
            code: "DEMO-FIGURE-001",
            nameZhCn: "标准版",
            nameEnUs: "Standard Edition",
            priceAmount: 129_900,
            inventory: {
              create: {
                onHand: 20,
                ledgerEntries: { create: { type: "INITIAL_STOCK", onHandDelta: 20, reservedDelta: 0, onHandAfter: 20, reservedAfter: 0, reason: "演示商品初始库存" } }
              }
            }
          }
        }
      }
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { PrismaService } from "../prisma/prisma.service";
import { AddressService } from "./address.service";

type AddressRow = {
  id: string;
  userId: string;
  recipient: string;
  phone: string;
  country: string;
  province: string;
  city: string;
  district: string;
  addressLine: string;
  postalCode: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const addressInput = (recipient: string) => ({
  recipient,
  phone: "13800000000",
  country: "中国",
  province: "上海市",
  city: "上海市",
  district: "徐汇区",
  addressLine: "测试路 1 号",
  postalCode: "200000"
});

function createAddressPrisma() {
  const rows: AddressRow[] = [];
  const address = {
    count: async ({ where }: { where: { userId: string } }) => rows.filter((row) => row.userId === where.userId).length,
    create: async ({ data }: { data: Omit<AddressRow, "id" | "createdAt" | "updatedAt"> }) => {
      const row = { ...data, id: `address-${rows.length + 1}`, createdAt: new Date(), updatedAt: new Date() };
      rows.push(row);
      return row;
    },
    updateMany: async ({ where, data }: { where: { userId: string; isDefault?: boolean }; data: { isDefault: boolean } }) => {
      let count = 0;
      for (const row of rows) {
        if (row.userId === where.userId && (where.isDefault === undefined || row.isDefault === where.isDefault)) {
          row.isDefault = data.isDefault;
          count += 1;
        }
      }
      return { count };
    },
    findFirst: async ({ where }: { where: { id: string; userId: string } }) => rows.find((row) => row.id === where.id && row.userId === where.userId) ?? null,
    update: async ({ where, data }: { where: { id: string }; data: Partial<AddressRow> }) => {
      const row = rows.find((item) => item.id === where.id);
      if (!row) throw new Error("missing address");
      Object.assign(row, data, { updatedAt: new Date() });
      return row;
    }
  };
  const prisma = {
    address,
    $transaction: async <T>(operation: (tx: { address: typeof address }) => Promise<T>) => operation({ address })
  } as unknown as PrismaService;
  return { prisma, rows };
}

test("the first saved shipping address becomes the default", async () => {
  const { prisma, rows } = createAddressPrisma();
  const service = new AddressService(prisma);

  const created = await service.create("user-1", addressInput("小萌"));

  assert.equal(created.isDefault, true);
  assert.equal(rows[0]?.isDefault, true);
});

test("setting another shipping address as default clears the previous default", async () => {
  const { prisma, rows } = createAddressPrisma();
  const service = new AddressService(prisma);
  const first = await service.create("user-1", addressInput("小萌"));
  const second = await service.create("user-1", addressInput("小明"));

  await service.update("user-1", second.id, { isDefault: true });

  assert.equal(rows.find((row) => row.id === first.id)?.isDefault, false);
  assert.equal(rows.find((row) => row.id === second.id)?.isDefault, true);
});

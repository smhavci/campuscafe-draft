import { prisma } from '@/db/prisma';
import { num } from '@/shared/serialize';

export const walletService = {
  async getBalance(userId: number): Promise<{ balance: number }> {
    const wallet = await prisma.userWallet.upsert({
      where: { userId },
      create: { userId, balance: 0 },
      update: {},
      select: { balance: true },
    });
    return { balance: num(wallet.balance) };
  },

  async topUp(userId: number, amount: number): Promise<{ message: string; balance: number }> {
    const wallet = await prisma.userWallet.upsert({
      where: { userId },
      create: { userId, balance: amount },
      update: { balance: { increment: amount } },
      select: { balance: true },
    });
    return { message: 'Bakiye yüklendi!', balance: num(wallet.balance) };
  },
};

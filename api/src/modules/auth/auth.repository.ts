import type { Prisma, Role, User } from '@prisma/client';
import { prisma } from '@/db/prisma';

/** Data-access layer for users. No business rules here — just persistence. */
export const authRepository = {
  findByStudentNumber(studentNumber: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { studentNumber } });
  },

  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: number): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  findCafeOwner(cafeId: number): Promise<User | null> {
    return prisma.user.findFirst({ where: { cafeId, role: 'cafeOwner' } });
  },

  cafeExists(cafeId: number): Promise<{ id: number } | null> {
    return prisma.cafe.findUnique({ where: { id: cafeId }, select: { id: true } });
  },

  getCafeName(cafeId: number): Promise<{ name: string } | null> {
    return prisma.cafe.findUnique({ where: { id: cafeId }, select: { name: true } });
  },

  create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data });
  },

  update(id: number, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  },
};

export type { Role };

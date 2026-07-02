import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import { authRepository } from './auth.repository';
import type { LoginInput, RegisterInput, UpdateMeInput } from './auth.schema';
import { signToken } from '@/shared/jwt';
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '@/shared/errors';

/** Public-safe user shape (never leaks passwordHash). */
export interface PublicUser {
  id: number;
  firstName: string;
  lastName: string;
  studentNumber: string | null;
  email: string | null;
  role: User['role'];
  cafeId: number | null;
  stars: number;
  createdAt?: Date;
  cafeName?: string | null;
}

function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    studentNumber: u.studentNumber,
    email: u.email,
    role: u.role,
    cafeId: u.cafeId,
    stars: u.stars,
    createdAt: u.createdAt,
  };
}

function issueToken(u: User): string {
  return signToken({ id: u.id, role: u.role, firstName: u.firstName, cafeId: u.cafeId });
}

export const authService = {
  async register(input: RegisterInput): Promise<{ user: PublicUser; token: string }> {
    const { role, firstName, lastName, password, studentNumber, email, cafeId } = input;

    if (role === 'student' && studentNumber) {
      if (await authRepository.findByStudentNumber(studentNumber)) {
        throw new ConflictError('Bu öğrenci numarası zaten kayıtlı');
      }
    }

    if (role === 'cafeOwner' && cafeId) {
      if (!(await authRepository.cafeExists(cafeId))) {
        throw new BadRequestError('Geçersiz kafe seçimi');
      }
      if (await authRepository.findCafeOwner(cafeId)) {
        throw new ConflictError('Bu kafe için zaten bir sahip kayıtlı');
      }
    }

    if (email && (await authRepository.findByEmail(email))) {
      throw new ConflictError('Bu e-posta adresi zaten kayıtlı');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await authRepository.create({
      firstName,
      lastName,
      studentNumber: role === 'student' ? studentNumber : null,
      email: email ?? null,
      passwordHash,
      role,
      cafe: role === 'cafeOwner' && cafeId ? { connect: { id: cafeId } } : undefined,
    });

    return { user: toPublicUser(user), token: issueToken(user) };
  },

  async login(input: LoginInput): Promise<{ user: PublicUser; token: string }> {
    const { role, studentNumber, email, password } = input;

    const user =
      role === 'student'
        ? await authRepository.findByStudentNumber(studentNumber!)
        : await authRepository.findByEmail(email!);

    // Enforce that the account matches the requested role.
    if (!user || user.role !== role) {
      throw new UnauthorizedError('Kimlik bilgileri hatalı');
    }

    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedError('Kimlik bilgileri hatalı');
    }

    return { user: toPublicUser(user), token: issueToken(user) };
  },

  async getProfile(userId: number): Promise<PublicUser> {
    const user = await authRepository.findById(userId);
    if (!user) throw new NotFoundError('Kullanıcı bulunamadı');

    const publicUser = toPublicUser(user);
    if (user.role === 'cafeOwner' && user.cafeId) {
      const cafe = await authRepository.getCafeName(user.cafeId);
      publicUser.cafeName = cafe?.name ?? null;
    }
    return publicUser;
  },

  async updateProfile(userId: number, input: UpdateMeInput): Promise<PublicUser> {
    const data: { firstName?: string; lastName?: string; passwordHash?: string } = {};

    if (input.firstName !== undefined) data.firstName = input.firstName;
    if (input.lastName !== undefined) data.lastName = input.lastName;

    if (input.newPassword) {
      const user = await authRepository.findById(userId);
      if (!user) throw new NotFoundError('Kullanıcı bulunamadı');
      if (!(await bcrypt.compare(input.currentPassword!, user.passwordHash))) {
        throw new BadRequestError('Mevcut şifre hatalı');
      }
      data.passwordHash = await bcrypt.hash(input.newPassword, 10);
    }

    const updated = await authRepository.update(userId, data);
    return toPublicUser(updated);
  },
};

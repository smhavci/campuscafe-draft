import { z } from 'zod';

export const roleSchema = z.enum(['student', 'teacher', 'cafeOwner']);

export const registerSchema = z
  .object({
    role: roleSchema.default('student'),
    firstName: z.string().trim().min(1, 'Ad zorunludur'),
    lastName: z.string().trim().min(1, 'Soyad zorunludur'),
    password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
    studentNumber: z.string().optional(),
    email: z.string().email('Geçersiz e-posta').optional(),
    cafeId: z.number().int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'student') {
      if (!data.studentNumber || !/^\d{11}$/.test(data.studentNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['studentNumber'],
          message: 'Öğrenci numarası 11 haneli olmalıdır',
        });
      }
    }
    if ((data.role === 'teacher' || data.role === 'cafeOwner') && !data.email) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: 'E-posta zorunludur' });
    }
    if (data.role === 'cafeOwner' && !data.cafeId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cafeId'], message: 'Kafe seçimi zorunludur' });
    }
  });

export const loginSchema = z
  .object({
    role: roleSchema.default('student'),
    password: z.string().min(1, 'Şifre zorunludur'),
    studentNumber: z.string().optional(),
    email: z.string().email().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'student' && !data.studentNumber) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['studentNumber'], message: 'Öğrenci numarası zorunludur' });
    }
    if (data.role !== 'student' && !data.email) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: 'E-posta zorunludur' });
    }
  });

export const updateMeSchema = z
  .object({
    firstName: z.string().trim().min(1, 'Ad boş olamaz').optional(),
    lastName: z.string().trim().min(1, 'Soyad boş olamaz').optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(6, 'Yeni şifre en az 6 karakter olmalıdır').optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Güncellenecek alan bulunamadı' })
  .refine((d) => !(d.newPassword && !d.currentPassword), {
    path: ['currentPassword'],
    message: 'Mevcut şifrenizi girin',
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;

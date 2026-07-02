import type { Request, Response } from 'express';
import { authService } from './auth.service';
import { loginSchema, registerSchema, updateMeSchema } from './auth.schema';

/** HTTP layer — thin: parse/validate input, call service, shape response. */
export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const input = registerSchema.parse(req.body);
    const result = await authService.register(input);
    res.status(201).json(result);
  },

  async login(req: Request, res: Response): Promise<void> {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    res.json(result);
  },

  async me(req: Request, res: Response): Promise<void> {
    const user = await authService.getProfile(req.user!.id);
    res.json(user);
  },

  async updateMe(req: Request, res: Response): Promise<void> {
    const input = updateMeSchema.parse(req.body);
    const user = await authService.updateProfile(req.user!.id, input);
    res.json({ message: 'Profil güncellendi', user });
  },
};

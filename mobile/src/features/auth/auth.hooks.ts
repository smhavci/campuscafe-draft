import { useMutation, useQuery } from '@tanstack/react-query';
import { authApi, type LoginInput, type RegisterInput } from './auth.api';
import { useAuthStore } from '@/store/auth.store';

/** Log in → persists token + opens socket via the auth store. */
export function useLogin() {
  const signIn = useAuthStore((s) => s.signIn);
  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (auth) => signIn(auth),
  });
}

/** Register → same flow as login. */
export function useRegister() {
  const signIn = useAuthStore((s) => s.signIn);
  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: (auth) => signIn(auth),
  });
}

/** Current user profile, refreshed from the server when authenticated. */
export function useMe() {
  const status = useAuthStore((s) => s.status);
  const setUser = useAuthStore((s) => s.setUser);
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const user = await authApi.me();
      setUser(user);
      return user;
    },
    enabled: status === 'authenticated',
  });
}

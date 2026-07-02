import { useEffect } from 'react';
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
  const query = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
    enabled: status === 'authenticated',
  });
  // Mirror into the auth store as a side effect (not inside queryFn).
  useEffect(() => {
    if (query.data) setUser(query.data);
  }, [query.data, setUser]);
  return query;
}

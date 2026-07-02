import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { favoritesApi } from './favorites.api';

export const favoriteKeys = {
  ids: ['favorites', 'ids'] as const,
  list: ['favorites', 'list'] as const,
};

export const useFavoriteIds = () =>
  useQuery({ queryKey: favoriteKeys.ids, queryFn: favoritesApi.ids });

export const useFavorites = () =>
  useQuery({ queryKey: favoriteKeys.list, queryFn: favoritesApi.list });

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: number) => favoritesApi.toggle(productId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: favoriteKeys.ids });
      void qc.invalidateQueries({ queryKey: favoriteKeys.list });
    },
  });
}

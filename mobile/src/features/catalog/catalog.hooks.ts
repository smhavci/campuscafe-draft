import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { catalogApi, type ProductSearchParams } from './catalog.api';

export const catalogKeys = {
  cafes: ['cafes'] as const,
  cafe: (slug: string) => ['cafes', slug] as const,
  cafeProducts: (slug: string) => ['cafes', slug, 'products'] as const,
  products: ['products'] as const,
  product: (id: number) => ['products', id] as const,
  search: (params: ProductSearchParams) => ['products', 'search', params] as const,
  categories: ['categories'] as const,
};

export const useCafes = () => useQuery({ queryKey: catalogKeys.cafes, queryFn: catalogApi.cafes });

export const useCafe = (slug: string) =>
  useQuery({ queryKey: catalogKeys.cafe(slug), queryFn: () => catalogApi.cafe(slug), enabled: !!slug });

export const useCafeProducts = (slug: string) =>
  useQuery({
    queryKey: catalogKeys.cafeProducts(slug),
    queryFn: () => catalogApi.cafeProducts(slug),
    enabled: !!slug,
  });

export const useProduct = (id: number) =>
  useQuery({ queryKey: catalogKeys.product(id), queryFn: () => catalogApi.product(id), enabled: id > 0 });

export const useProductSearch = (params: ProductSearchParams) =>
  useQuery({
    queryKey: catalogKeys.search(params),
    queryFn: () => catalogApi.search(params),
    placeholderData: keepPreviousData,
  });

export const useCategories = () =>
  useQuery({ queryKey: catalogKeys.categories, queryFn: catalogApi.categories });

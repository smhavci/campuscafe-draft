import { apiClient } from '@/shared/api/client';
import type { Cafe, Campaign, Category, Product, SearchProduct } from '@/shared/types/api';

export interface ProductSearchParams {
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  category?: string;
}

export const catalogApi = {
  async cafes(): Promise<Cafe[]> {
    const { data } = await apiClient.get<Cafe[]>('/cafes');
    return data;
  },
  async cafe(slug: string): Promise<Cafe> {
    const { data } = await apiClient.get<Cafe>(`/cafes/${slug}`);
    return data;
  },
  async cafeProducts(slug: string): Promise<Product[]> {
    const { data } = await apiClient.get<Product[]>(`/cafes/${slug}/products`);
    return data;
  },
  async cafeCampaigns(slug: string): Promise<Campaign[]> {
    const { data } = await apiClient.get<Campaign[]>(`/cafes/${slug}/campaigns`);
    return data;
  },
  async campaigns(): Promise<Campaign[]> {
    const { data } = await apiClient.get<Campaign[]>('/campaigns');
    return data;
  },
  async products(): Promise<Product[]> {
    const { data } = await apiClient.get<Product[]>('/products');
    return data;
  },
  async product(id: number): Promise<Product> {
    const { data } = await apiClient.get<Product>(`/products/${id}`);
    return data;
  },
  async search(params: ProductSearchParams): Promise<SearchProduct[]> {
    const { data } = await apiClient.get<SearchProduct[]>('/products/search', { params });
    return data;
  },
  async categories(): Promise<Category[]> {
    const { data } = await apiClient.get<Category[]>('/categories');
    return data;
  },
};

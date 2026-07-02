import { apiClient } from '@/shared/api/client';
import type { OwnerCampaign, OwnerProduct } from '@/shared/types/api';

export interface ProductInput {
  name: string;
  category: string;
  price: number;
  description?: string;
  image?: string;
  isAvailable?: boolean;
}

export interface CampaignInput {
  title: string;
  description?: string;
  discount?: string;
  badge?: string;
  validUntil?: string;
  image?: string;
  relatedProductIds?: number[];
  targetRole?: 'all' | 'student' | 'teacher';
  isActive?: boolean;
}

export const menuApi = {
  async products(): Promise<OwnerProduct[]> {
    return (await apiClient.get<OwnerProduct[]>('/menu/products')).data;
  },
  async createProduct(input: ProductInput): Promise<OwnerProduct> {
    return (await apiClient.post<OwnerProduct>('/menu/products', input)).data;
  },
  async updateProduct(id: number, input: Partial<ProductInput>): Promise<OwnerProduct> {
    return (await apiClient.patch<OwnerProduct>(`/menu/products/${id}`, input)).data;
  },
  async deleteProduct(id: number): Promise<unknown> {
    return (await apiClient.delete(`/menu/products/${id}`)).data;
  },
  async campaigns(): Promise<OwnerCampaign[]> {
    return (await apiClient.get<OwnerCampaign[]>('/menu/campaigns')).data;
  },
  async createCampaign(input: CampaignInput): Promise<OwnerCampaign> {
    return (await apiClient.post<OwnerCampaign>('/menu/campaigns', input)).data;
  },
  async updateCampaign(id: number, input: Partial<CampaignInput>): Promise<OwnerCampaign> {
    return (await apiClient.patch<OwnerCampaign>(`/menu/campaigns/${id}`, input)).data;
  },
  async deleteCampaign(id: number): Promise<unknown> {
    return (await apiClient.delete(`/menu/campaigns/${id}`)).data;
  },
};

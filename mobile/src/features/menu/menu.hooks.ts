import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { menuApi, type CampaignInput, type ProductInput } from './menu.api';

export const menuKeys = {
  products: ['menu', 'products'] as const,
  campaigns: ['menu', 'campaigns'] as const,
};

export const useMenuProducts = () => useQuery({ queryKey: menuKeys.products, queryFn: menuApi.products });
export const useMenuCampaigns = () => useQuery({ queryKey: menuKeys.campaigns, queryFn: menuApi.campaigns });

function useInvalidateProducts() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: menuKeys.products });
}
function useInvalidateCampaigns() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: menuKeys.campaigns });
}

export function useSaveProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: ProductInput }) =>
      id ? menuApi.updateProduct(id, input) : menuApi.createProduct(input),
    onSuccess: invalidate,
  });
}
export function useDeleteProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({ mutationFn: (id: number) => menuApi.deleteProduct(id), onSuccess: invalidate });
}
export function useToggleProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: ({ id, isAvailable }: { id: number; isAvailable: boolean }) =>
      menuApi.updateProduct(id, { isAvailable }),
    onSuccess: invalidate,
  });
}

export function useSaveCampaign() {
  const invalidate = useInvalidateCampaigns();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: CampaignInput }) =>
      id ? menuApi.updateCampaign(id, input) : menuApi.createCampaign(input),
    onSuccess: invalidate,
  });
}
export function useDeleteCampaign() {
  const invalidate = useInvalidateCampaigns();
  return useMutation({ mutationFn: (id: number) => menuApi.deleteCampaign(id), onSuccess: invalidate });
}
export function useToggleCampaign() {
  const invalidate = useInvalidateCampaigns();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      menuApi.updateCampaign(id, { isActive }),
    onSuccess: invalidate,
  });
}

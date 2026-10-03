import { apiClient, ApiResponse } from "./client";
import { TenantItem } from "./tenants";

export interface ProductItem {
  barcode?: string;
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  costPrice: number;
  sellingPrice: number;
  status: string;
  /** Base product id when this is a variant (e.g. "Merah / L"). */
  variantOf?: string | null;
  variantLabel?: string;
  marketplacePlatform?: string;
  marketplaceProductId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProductInput {
  barcode?: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  costPrice: number;
  sellingPrice: number;
  status?: string;
  /** Send the base product id to make a variant; the nil uuid (all zeros) detaches it. */
  variantOf?: string;
  variantLabel?: string;
}

export interface ProductCategoryItem {
  id: string;
  name: string;
}

export interface UnitOfMeasureItem {
  id: string;
  name: string;
  symbol: string;
}

export const productCategoriesApi = {
  list: async (): Promise<ApiResponse<ProductCategoryItem[]>> => {
    return apiClient<ProductCategoryItem[]>("/product-categories");
  },
  create: async (name: string): Promise<ApiResponse<ProductCategoryItem>> => {
    return apiClient<ProductCategoryItem>("/product-categories", { method: "POST", body: JSON.stringify({ name }) });
  },
  update: async (id: string, name: string): Promise<ApiResponse<ProductCategoryItem>> => {
    return apiClient<ProductCategoryItem>(`/product-categories/${id}`, { method: "PUT", body: JSON.stringify({ name }) });
  },
  remove: async (id: string): Promise<ApiResponse<null>> => {
    return apiClient<null>(`/product-categories/${id}`, { method: "DELETE" });
  },
};

export const unitsOfMeasureApi = {
  list: async (): Promise<ApiResponse<UnitOfMeasureItem[]>> => {
    return apiClient<UnitOfMeasureItem[]>("/units-of-measure");
  },
  create: async (name: string, symbol: string): Promise<ApiResponse<UnitOfMeasureItem>> => {
    return apiClient<UnitOfMeasureItem>("/units-of-measure", { method: "POST", body: JSON.stringify({ name, symbol }) });
  },
  update: async (id: string, name: string, symbol: string): Promise<ApiResponse<UnitOfMeasureItem>> => {
    return apiClient<UnitOfMeasureItem>(`/units-of-measure/${id}`, { method: "PUT", body: JSON.stringify({ name, symbol }) });
  },
  remove: async (id: string): Promise<ApiResponse<null>> => {
    return apiClient<null>(`/units-of-measure/${id}`, { method: "DELETE" });
  },
};

export const productsApi = {
  copySources: () => apiClient<TenantItem[]>("/products/copy-sources"),
  copySourceProducts: (tenantId: string) => apiClient<ProductItem[]>(`/products/copy-sources/${tenantId}`),
  copyProducts: (sourceTenantId: string, productIds: string[]) => apiClient<{ products: ProductItem[]; skippedSkus: string[] }>("/products/copy", { method: "POST", body: JSON.stringify({ sourceTenantId, productIds }) }),
  list: async (params?: { page?: number; perPage?: number; search?: string }): Promise<ApiResponse<ProductItem[]>> => {
    return apiClient<ProductItem[]>("/products", { params });
  },

  getById: async (id: string): Promise<ApiResponse<ProductItem>> => {
    return apiClient<ProductItem>(`/products/${id}`);
  },

  create: async (data: CreateProductInput): Promise<ApiResponse<ProductItem>> => {
    return apiClient<ProductItem>("/products", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<CreateProductInput>): Promise<ApiResponse<ProductItem>> => {
    return apiClient<ProductItem>(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    return apiClient<null>(`/products/${id}`, {
      method: "DELETE",
    });
  },
};

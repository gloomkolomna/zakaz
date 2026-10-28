import client from './client';
import type { SelectionMode, Selected } from './selection';

export type Role = 'player' | 'admin';
export type OrderStatus = 'new' | 'done' | 'cancelled';

export interface MeUser {
  vk_id: number;
  display_name: string | null;
  role: Role;
  is_donor: boolean;
  donor_exempt: boolean;
}

export interface SessionResponse {
  token: string;
  vk_id: number;
  role: Role;
}

export interface Video {
  url: string | null;
  file_url: string | null;
  poster_url: string | null;
}

export interface ProductBrief {
  id: number;
  title: string;
  image_url: string | null;
  from_price: number | null;
  steps_count: number;
  stock: number;
  sold_out: boolean;
  is_early: boolean;
  early_until: string | null;
}

export interface CatalogSection {
  id: number;
  title: string;
  products: ProductBrief[];
}

export interface Catalog {
  title: string;
  description: string;
  sections: CatalogSection[];
}

export interface CardImage {
  id: number;
  url: string;
  sort_order: number;
}

export interface Card {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  images: CardImage[];
  price: number;
  max_qty: number;
}

export interface Step {
  id: number;
  title: string;
  hint: string | null;
  mode: SelectionMode;
  is_required: boolean;
  cards: Card[];
}

export interface ProductDetail {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  section_title: string;
  from_price: number | null;
  stock: number;
  sold_out: boolean;
  reserved: boolean;
  video: Video | null;
  early_until: string | null;
  is_early: boolean;
  can_order: boolean;
  early_reason: string | null;
  steps: Step[];
}

export interface InfoTexts {
  delivery: string;
  payment: string;
  contacts: string;
  privacy: string;
}

export interface AdminTexts extends InfoTexts {
  catalog_title: string;
  catalog_description: string;
}

export interface OrderItem {
  id: number;
  card_id: number | null;
  step_title: string;
  card_title: string;
  image_url: string | null;
  price: number;
  qty: number;
  sum: number;
}

export interface OrderBrief {
  id: number;
  total: number;
  status: OrderStatus;
  created_at: string;
  cancelled_at: string | null;
  done_at: string | null;
  product_id: number | null;
  product_title: string;
  section_title: string;
  items_count: number;
  buyer_name: string;
  user_id: number;
  read_at: string | null;
  cancel_seen_at: string | null;
  queue_position: number | null;
}

export interface OrderDetail extends OrderBrief {
  items: OrderItem[];
}

export interface AdminSection {
  id: number;
  title: string;
  sort_order: number;
  is_active: boolean;
  products_count: number;
}

export interface AdminStep {
  id: number;
  product_id: number;
  title: string;
  hint: string | null;
  selection_mode: SelectionMode;
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
  cards_count: number;
}

export interface AdminCard {
  id: number;
  step_id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  images: CardImage[];
  price: number;
  max_qty: number;
  sort_order: number;
  is_active: boolean;
}

export interface AdminProduct {
  id: number;
  section_id: number;
  section_title?: string;
  title: string;
  description: string | null;
  image_url: string | null;
  video: Video | null;
  video_url: string | null;
  video_file_url: string | null;
  video_poster_url: string | null;
  early_until: string | null;
  is_early: boolean;
  stock: number;
  ordered_count: number;
  sold_out: boolean;
  sort_order: number;
  is_active: boolean;
  from_price: number | null;
  steps_count?: number;
  steps?: AdminStep[];
}

export interface AdminReserveItem {
  id: number;
  product_id: number;
  product_title: string;
  product_image_url: string | null;
  product_is_active: boolean;
  stock: number;
  ordered_count: number;
  sold_out: boolean;
  available: boolean;
  user_id: number;
  buyer_name: string;
  created_at: string | null;
}

export interface AdminReserveResponse {
  items: AdminReserveItem[];
  summary: {
    waiting: number;
    products: number;
    ready: number;
  };
}

export interface AdminOrdersSummary {
  count: number;
  queue: number;
  unread: number;
  sum: number;
  cancelled: number;
  cancelled_unread: number;
}

export interface AdminOrdersResponse {
  items: OrderBrief[];
  total: number;
  summary: AdminOrdersSummary;
}

export interface OrderFilters {
  section_id?: number;
  product_id?: number;
  buyer_id?: number;
  date_from?: string;
  date_to?: string;
  q?: string;
  unread?: number;
  status?: OrderStatus | '';
  queue?: number;
  cancel_unread?: number;
  limit?: number;
  offset?: number;
}

export interface AdminLog {
  id: number;
  source: string;
  level: string;
  event: string | null;
  method: string | null;
  path: string | null;
  status_code: number | null;
  message: string | null;
  details: string | null;
  user_id: number | null;
  vk_id: number | null;
  client_ip: string | null;
  created_at: string | null;
}

export interface AdminPlayer {
  vk_id: number;
  display_name: string;
  role: Role;
  status: string;
  is_donor: boolean;
  donor_exempt: boolean;
  orders_count: number;
  last_order_at: string | null;
}

export interface AdminPlayerDetail {
  player: AdminPlayer;
  orders: OrderBrief[];
  summary: {
    count: number;
    queue: number;
    sum: number;
  };
}

function paramsOf(filters: OrderFilters): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    result[key] = value as string | number;
  }
  return result;
}

async function upload(url: string, file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await client.post<{ url: string }>(url, form);
  return res.data.url;
}

export const api = {
  me: () => client.get<MeUser>('/me').then((res) => res.data),
  session: (params: Record<string, string>) =>
    client.post<SessionResponse>('/auth/session', { params }).then((res) => res.data),

  catalog: () => client.get<Catalog>('/catalog').then((res) => res.data),
  product: (id: number) => client.get<ProductDetail>(`/products/${id}`).then((res) => res.data),
  info: () => client.get<InfoTexts>('/info').then((res) => res.data),

  createOrder: (productId: number, items: { card_id: number; qty: number }[]) =>
    client.post<OrderDetail>('/orders', { product_id: productId, items }).then((res) => res.data),
  reserve: (productId: number) =>
    client.post<{ reserved: boolean; created_at: string }>(`/products/${productId}/reserve`).then((res) => res.data),
  cancelReserve: (productId: number) =>
    client.delete<{ reserved: boolean }>(`/products/${productId}/reserve`).then((res) => res.data),
  myOrders: () => client.get<{ items: OrderBrief[] }>('/me/orders').then((res) => res.data),
  order: (id: number) => client.get<OrderDetail>(`/orders/${id}`).then((res) => res.data),
  cancelOrder: (id: number) => client.post<OrderDetail>(`/orders/${id}/cancel`).then((res) => res.data),

  adminSections: () => client.get<AdminSection[]>('/admin/sections').then((res) => res.data),
  adminCreateSection: (title: string) =>
    client.post<AdminSection>('/admin/sections', { title }).then((res) => res.data),
  adminUpdateSection: (id: number, data: Partial<AdminSection>) =>
    client.put<AdminSection>(`/admin/sections/${id}`, data).then((res) => res.data),
  adminDeleteSection: (id: number) => client.delete(`/admin/sections/${id}`).then((res) => res.data),
  adminReorderSections: (ids: number[]) =>
    client.post('/admin/sections/reorder', { ids }).then((res) => res.data),

  adminProducts: (sectionId?: number, q?: string) =>
    client.get<AdminProduct[]>('/admin/products', { params: { ...(sectionId ? { section_id: sectionId } : {}), ...(q ? { q } : {}) } })
      .then((res) => res.data),
  adminProduct: (id: number) =>
    client.get<AdminProduct>(`/admin/products/${id}`).then((res) => res.data),
  adminCreateProduct: (data: { section_id: number; title: string; description?: string; stock?: number; sort_order?: number; is_active?: boolean }) =>
    client.post<AdminProduct>('/admin/products', data).then((res) => res.data),
  adminUpdateProduct: (id: number, data: Partial<AdminProduct>) =>
    client.put<AdminProduct>(`/admin/products/${id}`, data).then((res) => res.data),
  adminDeleteProduct: (id: number) =>
    client.delete<{ ok: boolean; mode: 'deleted' }>(`/admin/products/${id}`).then((res) => res.data),
  adminUploadProductImage: (id: number, file: File) => upload(`/admin/products/${id}/image`, file),
  adminDeleteProductImage: (id: number) =>
    client.delete(`/admin/products/${id}/image`).then((res) => res.data),
  adminUploadProductVideo: (id: number, file: File) => upload(`/admin/products/${id}/video`, file),
  adminSetVideoUrl: (id: number, url: string | null) =>
    client.put<{ url: string | null }>(`/admin/products/${id}/video-url`, { url }).then((res) => res.data),
  adminDeleteVideo: (id: number) =>
    client.delete(`/admin/products/${id}/video`).then((res) => res.data),
  adminUploadVideoPoster: (id: number, file: File) => upload(`/admin/products/${id}/video-poster`, file),
  adminDeleteVideoPoster: (id: number) =>
    client.delete(`/admin/products/${id}/video-poster`).then((res) => res.data),
  adminSetEarly: (id: number, enabled: boolean) =>
    client.post<{ early_until: string | null }>(`/admin/products/${id}/early`, { enabled }).then((res) => res.data),

  adminSteps: (productId: number) =>
    client.get<AdminStep[]>(`/admin/products/${productId}/steps`).then((res) => res.data),
  adminCreateStep: (productId: number, data: { title: string; selection_mode: SelectionMode; is_required: boolean }) =>
    client.post<{ id: number }>(`/admin/products/${productId}/steps`, data).then((res) => res.data),
  adminUpdateStep: (id: number, data: Partial<AdminStep>) =>
    client.put(`/admin/steps/${id}`, data).then((res) => res.data),
  adminDeleteStep: (id: number) => client.delete(`/admin/steps/${id}`).then((res) => res.data),
  adminReorderSteps: (productId: number, ids: number[]) =>
    client.post('/admin/steps/reorder', { product_id: productId, ids }).then((res) => res.data),

  adminCards: (stepId: number) =>
    client.get<AdminCard[]>(`/admin/steps/${stepId}/cards`).then((res) => res.data),
  adminCreateCard: (stepId: number, data: { title: string; price: number; max_qty: number }) =>
    client.post<{ id: number }>(`/admin/steps/${stepId}/cards`, data).then((res) => res.data),
  adminUpdateCard: (id: number, data: Partial<AdminCard>) =>
    client.put(`/admin/cards/${id}`, data).then((res) => res.data),
  adminDeleteCard: (id: number) => client.delete(`/admin/cards/${id}`).then((res) => res.data),
  adminAddCardImage: (id: number, file: File) => upload(`/admin/cards/${id}/images`, file),
  adminDeleteCardImage: (cardId: number, imageId: number) =>
    client.delete(`/admin/cards/${cardId}/images/${imageId}`).then((res) => res.data),
  adminReorderCardImages: (cardId: number, ids: number[]) =>
    client.post(`/admin/cards/${cardId}/images/reorder`, { ids }).then((res) => res.data),
  adminReorderCards: (stepId: number, ids: number[]) =>
    client.post('/admin/cards/reorder', { step_id: stepId, ids }).then((res) => res.data),

  adminOrders: (filters: OrderFilters) =>
    client.get<AdminOrdersResponse>('/admin/orders', { params: paramsOf(filters) }).then((res) => res.data),
  adminOrder: (id: number) =>
    client.get<OrderDetail>(`/admin/orders/${id}`).then((res) => res.data),
  adminReadOrder: (id: number) =>
    client.post<OrderDetail>(`/admin/orders/${id}/read`).then((res) => res.data),
  adminCompleteOrder: (id: number) =>
    client.post<OrderDetail>(`/admin/orders/${id}/complete`).then((res) => res.data),
  adminMoveOrder: (id: number, direction: 'up' | 'down') =>
    client.post(`/admin/orders/${id}/move`, { direction }).then((res) => res.data),
  adminCancelSeen: (id: number) =>
    client.post<OrderDetail>(`/admin/orders/${id}/cancel-seen`).then((res) => res.data),

  adminReserve: () =>
    client.get<AdminReserveResponse>('/admin/reserve').then((res) => res.data),
  adminRemoveReserve: (id: number) =>
    client.delete(`/admin/reserve/${id}`).then((res) => res.data),

  adminTexts: () => client.get<AdminTexts>('/admin/texts').then((res) => res.data),
  adminSaveTexts: (data: AdminTexts) =>
    client.put<AdminTexts>('/admin/texts', data).then((res) => res.data),
  adminLogs: (level?: string) =>
    client.get<AdminLog[]>('/admin/logs', { params: level ? { level } : {} }).then((res) => res.data),
  adminPlayers: (q?: string) =>
    client.get<AdminPlayer[]>('/admin/players', { params: q ? { q } : {} }).then((res) => res.data),
  adminPlayer: (vkId: number) =>
    client.get<AdminPlayerDetail>(`/admin/players/${vkId}`).then((res) => res.data),
  adminSetDonorExempt: (vkId: number, enabled: boolean) =>
    client.post(`/admin/players/${vkId}/donor-exempt`, { enabled }).then((res) => res.data),
  adminSyncDonors: () =>
    client.post<{ synced: number }>('/admin/donors/sync').then((res) => res.data),
};

async function downloadOrdersFile(path: string, filename: string, filters: OrderFilters): Promise<void> {
  const res = await client.get<Blob>(path, {
    params: paramsOf(filters),
    responseType: 'blob',
  });
  const url = URL.createObjectURL(res.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function downloadOrdersCsv(filters: OrderFilters): Promise<void> {
  return downloadOrdersFile('/admin/orders/export.csv', 'zakaz-orders.csv', filters);
}

export async function downloadOrdersPdf(filters: OrderFilters): Promise<void> {
  return downloadOrdersFile('/admin/orders/export.pdf', 'zakaz-orders.pdf', filters);
}

export type { Selected };

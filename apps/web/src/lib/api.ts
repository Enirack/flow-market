const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, body.message ?? 'Request failed');
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Pour les appels côté client authentifiés (attache le token depuis le localStorage). */
export async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { getAccessToken } = await import('./auth-client');
  const token = getAccessToken();

  return apiFetch<T>(path, {
    ...init,
    credentials: 'include',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  children: Category[];
}

export interface SearchServiceHit {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  categorySlug: string;
  providerName: string;
  providerSlug: string;
  price: number;
  currency: string;
  rating: number;
  reviewCount: number;
}

export interface SearchServicesResponse {
  hits: SearchServiceHit[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ServiceDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  basePrice: string;
  currency: string;
  category: { name: string; slug: string };
  images: { url: string }[];
  options: { id: string; name: string; priceDelta: string }[];
  provider: {
    slug: string;
    businessName: string;
    user: { profile: { firstName: string; lastName: string } | null };
  };
  rating: { average: number; count: number };
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    client: { profile: { firstName: string; lastName: string } | null };
  }[];
}

export interface ProviderProfile {
  slug: string;
  businessName: string;
  bio: string | null;
  ratingAvg: string;
  ratingCount: number;
  user: { profile: { firstName: string; lastName: string } | null };
  services: {
    id: string;
    slug: string;
    title: string;
    basePrice: string;
    currency: string;
    category: { name: string };
    images: { url: string }[];
  }[];
}

export function getCategories(): Promise<Category[]> {
  return apiFetch('/categories', { next: { revalidate: 300 } });
}

export function searchServices(params: {
  q?: string;
  category?: string;
  sort?: string;
  page?: number;
  limit?: number;
}): Promise<SearchServicesResponse> {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.category) query.set('category', params.category);
  if (params.sort) query.set('sort', params.sort);
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 12));

  return apiFetch(`/services?${query.toString()}`, { cache: 'no-store' });
}

export function getServiceBySlug(slug: string): Promise<ServiceDetail> {
  return apiFetch(`/services/${slug}`, { next: { revalidate: 60 } });
}

export function getProviderBySlug(slug: string): Promise<ProviderProfile> {
  return apiFetch(`/providers/${slug}`, { next: { revalidate: 60 } });
}

export interface AuthResponse {
  user: { id: string; email: string; role: string; emailVerifiedAt: string | null };
  accessToken: string;
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return apiFetch('/auth/login', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
}

export function register(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<AuthResponse> {
  return apiFetch('/auth/register', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify(input),
  });
}

export function getAvailableSlots(serviceId: string, date: string): Promise<string[]> {
  const query = new URLSearchParams({ serviceId, date });
  return apiFetch(`/availability/slots?${query.toString()}`, { cache: 'no-store' });
}

export interface BookingSummary {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  cancellationReason: string | null;
  items: { service: { title: string }; serviceOption: { name: string } | null }[];
  order:
    | { id: string; totalAmount: string; currency: string; status: string; payments?: { status: string }[] }
    | null;
  provider?: { businessName: string; slug: string };
  client?: { profile: { firstName: string; lastName: string } | null };
}

export function createBooking(input: {
  serviceId: string;
  scheduledAt: string;
  optionIds?: string[];
  notes?: string;
}): Promise<{ booking: BookingSummary }> {
  return authedFetch('/bookings', { method: 'POST', body: JSON.stringify(input) });
}

export function getMyBookings(): Promise<BookingSummary[]> {
  return authedFetch('/bookings/me', { cache: 'no-store' });
}

export function getProviderBookings(): Promise<BookingSummary[]> {
  return authedFetch('/bookings/provider/me', { cache: 'no-store' });
}

export function confirmBooking(id: string): Promise<void> {
  return authedFetch(`/bookings/${id}/confirm`, { method: 'PATCH' });
}

export function rejectBooking(id: string, reason?: string): Promise<void> {
  return authedFetch(`/bookings/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) });
}

export function completeBooking(id: string): Promise<void> {
  return authedFetch(`/bookings/${id}/complete`, { method: 'PATCH' });
}

export function cancelBooking(id: string, reason?: string): Promise<void> {
  return authedFetch(`/bookings/${id}/cancel`, { method: 'PATCH', body: JSON.stringify({ reason }) });
}

export interface PaymentIntentResponse {
  payment: { id: string; provider: string; status: string };
  clientPayload: { checkoutUrl?: string; clientSecret?: string; mockPaymentId?: string };
}

export function createPaymentIntent(orderId: string): Promise<PaymentIntentResponse> {
  return authedFetch(`/payments/orders/${orderId}/intent`, { method: 'POST', body: JSON.stringify({}) });
}

export function simulateMockPayment(mockPaymentId: string, outcome: 'succeeded' | 'failed'): Promise<void> {
  return authedFetch(`/payments/mock/${mockPaymentId}/simulate`, {
    method: 'POST',
    body: JSON.stringify({ outcome }),
  });
}

// --- Prestataire : services ---

export interface ProviderService {
  id: string;
  slug: string;
  title: string;
  description: string;
  priceType: string;
  basePrice: string;
  currency: string;
  durationMinutes: number | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  category: { id: string; name: string };
  images: { id: string; url: string; position: number }[];
  options: { id: string; name: string; priceDelta: string }[];
}

export function getMyServices(): Promise<ProviderService[]> {
  return authedFetch('/services/me', { cache: 'no-store' });
}

export function createService(input: {
  categoryId: string;
  title: string;
  description: string;
  priceType: string;
  basePrice: number;
  currency?: string;
  durationMinutes?: number;
}): Promise<ProviderService> {
  return authedFetch('/services', { method: 'POST', body: JSON.stringify(input) });
}

export function updateService(id: string, input: Partial<Parameters<typeof createService>[0]>): Promise<ProviderService> {
  return authedFetch(`/services/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function publishService(id: string): Promise<ProviderService> {
  return authedFetch(`/services/${id}/publish`, { method: 'PATCH' });
}

export function archiveService(id: string): Promise<ProviderService> {
  return authedFetch(`/services/${id}/archive`, { method: 'PATCH' });
}

export function deleteService(id: string): Promise<void> {
  return authedFetch(`/services/${id}`, { method: 'DELETE' });
}

export function addServiceImage(id: string, url: string): Promise<ProviderService['images']> {
  return authedFetch(`/services/${id}/images`, { method: 'POST', body: JSON.stringify({ url }) });
}

export function removeServiceImage(id: string, imageId: string): Promise<void> {
  return authedFetch(`/services/${id}/images/${imageId}`, { method: 'DELETE' });
}

export function addServiceOption(
  id: string,
  input: { name: string; priceDelta: number },
): Promise<ProviderService['options']> {
  return authedFetch(`/services/${id}/options`, { method: 'POST', body: JSON.stringify(input) });
}

export function removeServiceOption(id: string, optionId: string): Promise<void> {
  return authedFetch(`/services/${id}/options/${optionId}`, { method: 'DELETE' });
}

// --- Prestataire : revenus & virements ---

export interface ProviderBalance {
  availableAmount: string;
  pendingAmount: string;
  currency: string;
}

export interface Payout {
  id: string;
  amount: string;
  currency: string;
  status: string;
  method: string;
  rejectionReason: string | null;
  requestedAt: string;
  processedAt: string | null;
}

export function getMyBalance(): Promise<ProviderBalance> {
  return authedFetch('/payouts/balance', { cache: 'no-store' });
}

export function getMyPayouts(): Promise<Payout[]> {
  return authedFetch('/payouts/me', { cache: 'no-store' });
}

export function requestPayout(input: {
  amount: number;
  method: 'BANK_TRANSFER' | 'MOBILE_MONEY';
  destinationDetails: Record<string, string>;
}): Promise<Payout> {
  return authedFetch('/payouts', { method: 'POST', body: JSON.stringify(input) });
}

// --- Prestataire : profil & disponibilités ---

export interface ProviderMe {
  businessName: string;
  bio: string | null;
  isActive: boolean;
  verification: { status: string; rejectionReason: string | null } | null;
}

export function getProviderMe(): Promise<ProviderMe> {
  return authedFetch('/providers/me', { cache: 'no-store' });
}

export interface ProviderStats {
  revenue30d: string | number;
  upcomingBookings: number;
  publishedServices: number;
  ratingAvg: string;
  ratingCount: number;
}

export function getProviderStats(): Promise<ProviderStats> {
  return authedFetch('/providers/me/stats', { cache: 'no-store' });
}

export interface ProviderRecentBooking {
  id: string;
  scheduledAt: string;
  status: string;
  items: { service: { title: string } }[];
  client: { profile: { firstName: string; lastName: string } | null };
}

export function getProviderRecentBookings(): Promise<ProviderRecentBooking[]> {
  return authedFetch('/providers/me/recent-bookings', { cache: 'no-store' });
}

export function updateProviderProfile(input: { businessName?: string; bio?: string }): Promise<ProviderMe> {
  return authedFetch('/providers/me', { method: 'PATCH', body: JSON.stringify(input) });
}

export interface AvailabilityRule {
  id: string;
  type: 'RECURRING' | 'EXCEPTION';
  weekday: number | null;
  specificDate: string | null;
  startTime: string | null;
  endTime: string | null;
  isBlocked: boolean;
}

export function getMyAvailability(): Promise<AvailabilityRule[]> {
  return authedFetch('/availability/me', { cache: 'no-store' });
}

export function createAvailability(input: {
  type: 'RECURRING' | 'EXCEPTION';
  weekday?: number;
  specificDate?: string;
  startTime?: string;
  endTime?: string;
  isBlocked?: boolean;
}): Promise<AvailabilityRule> {
  return authedFetch('/availability', { method: 'POST', body: JSON.stringify(input) });
}

export function removeAvailability(id: string): Promise<void> {
  return authedFetch(`/availability/${id}`, { method: 'DELETE' });
}

// --- Avis & litiges ---

export function createReview(input: { bookingId: string; rating: number; comment?: string }): Promise<void> {
  return authedFetch('/reviews', { method: 'POST', body: JSON.stringify(input) });
}

export function createDispute(input: { bookingId: string; reason: string; details?: string }): Promise<void> {
  return authedFetch('/disputes', { method: 'POST', body: JSON.stringify(input) });
}

// --- Notifications ---

export interface NotificationItem {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsPage {
  notifications: NotificationItem[];
  total: number;
  unreadCount: number;
  page: number;
  totalPages: number;
}

export function getMyNotifications(): Promise<NotificationsPage> {
  return authedFetch('/notifications?limit=10', { cache: 'no-store' });
}

export function markNotificationRead(id: string): Promise<void> {
  return authedFetch(`/notifications/${id}/read`, { method: 'PATCH' });
}

export function markAllNotificationsRead(): Promise<void> {
  return authedFetch('/notifications/read-all', { method: 'PATCH' });
}

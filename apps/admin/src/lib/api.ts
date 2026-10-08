const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
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

async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { getAccessToken } = await import('./auth-client');
  const token = getAccessToken();

  return apiFetch<T>(path, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
}

export interface AuthResponse {
  user: { id: string; email: string; role: string };
  accessToken: string;
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export interface PaginatedResult {
  total: number;
  page: number;
  totalPages: number;
}

// --- Utilisateurs ---

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  profile: { firstName: string; lastName: string } | null;
}

export function getAdminUsers(params: { role?: string; status?: string; page?: number }): Promise<
  PaginatedResult & { users: AdminUser[] }
> {
  const query = new URLSearchParams();
  if (params.role) query.set('role', params.role);
  if (params.status) query.set('status', params.status);
  query.set('page', String(params.page ?? 1));
  return authedFetch(`/users/admin?${query.toString()}`, { cache: 'no-store' });
}

export function suspendUser(id: string): Promise<void> {
  return authedFetch(`/users/admin/${id}/suspend`, { method: 'PATCH' });
}

export function reactivateUser(id: string): Promise<void> {
  return authedFetch(`/users/admin/${id}/reactivate`, { method: 'PATCH' });
}

// --- Prestataires ---

export interface AdminProvider {
  id: string;
  businessName: string;
  slug: string;
  isActive: boolean;
  ratingAvg: string;
  ratingCount: number;
  user: { email: string; profile: { firstName: string; lastName: string } | null };
  verification: { status: string; rejectionReason: string | null } | null;
  balance: { availableAmount: string; pendingAmount: string } | null;
}

export function getAdminProviders(params: { verificationStatus?: string; page?: number }): Promise<
  PaginatedResult & { providers: AdminProvider[] }
> {
  const query = new URLSearchParams();
  if (params.verificationStatus) query.set('verificationStatus', params.verificationStatus);
  query.set('page', String(params.page ?? 1));
  return authedFetch(`/providers/admin?${query.toString()}`, { cache: 'no-store' });
}

export function reviewProviderVerification(
  id: string,
  input: { status: 'APPROVED' | 'REJECTED'; rejectionReason?: string },
): Promise<void> {
  return authedFetch(`/providers/${id}/verification`, { method: 'PATCH', body: JSON.stringify(input) });
}

// --- Services ---

export interface AdminService {
  id: string;
  title: string;
  slug: string;
  status: string;
  basePrice: string;
  currency: string;
  category: { name: string };
  provider: { businessName: string };
}

export function getAdminServices(params: { status?: string; page?: number }): Promise<
  PaginatedResult & { services: AdminService[] }
> {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  query.set('page', String(params.page ?? 1));
  return authedFetch(`/services/admin?${query.toString()}`, { cache: 'no-store' });
}

export function unpublishService(id: string): Promise<void> {
  return authedFetch(`/services/admin/${id}/unpublish`, { method: 'PATCH' });
}

// --- Avis ---

export interface AdminReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  client: { profile: { firstName: string; lastName: string } | null };
  provider: { businessName: string };
}

export function getAdminReviews(params: { page?: number }): Promise<
  PaginatedResult & { reviews: AdminReview[] }
> {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  return authedFetch(`/reviews/admin?${query.toString()}`, { cache: 'no-store' });
}

export function hideReview(id: string): Promise<void> {
  return authedFetch(`/reviews/admin/${id}/hide`, { method: 'PATCH' });
}

// --- Litiges ---

export interface AdminDispute {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  resolution: string | null;
  createdAt: string;
  booking: {
    client: { profile: { firstName: string; lastName: string } | null };
    provider: { businessName: string };
  };
}

export function getAdminDisputes(params: { status?: string; page?: number }): Promise<
  PaginatedResult & { disputes: AdminDispute[] }
> {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  query.set('page', String(params.page ?? 1));
  return authedFetch(`/disputes?${query.toString()}`, { cache: 'no-store' });
}

export function resolveDispute(
  id: string,
  input: { status: 'RESOLVED' | 'REJECTED'; resolution: string },
): Promise<void> {
  return authedFetch(`/disputes/${id}/resolve`, { method: 'PATCH', body: JSON.stringify(input) });
}

// --- Finance & virements ---

export interface FinanceOverview {
  totalRevenue: string | number;
  totalCommission: string | number;
  activeProviders: number;
  pendingPayouts: number;
  totalUsers: number;
  openDisputes: number;
}

export function getFinanceOverview(): Promise<FinanceOverview> {
  return authedFetch('/admin/finance/overview', { cache: 'no-store' });
}

export interface AdminPayout {
  id: string;
  amount: string;
  currency: string;
  status: string;
  method: string;
  rejectionReason: string | null;
  requestedAt: string;
  provider: { businessName: string };
}

export function getAdminPayouts(status?: string): Promise<AdminPayout[]> {
  const query = status ? `?status=${status}` : '';
  return authedFetch(`/payouts${query}`, { cache: 'no-store' });
}

export function approvePayout(id: string): Promise<void> {
  return authedFetch(`/payouts/${id}/approve`, { method: 'PATCH', body: JSON.stringify({}) });
}

export function rejectPayout(id: string, reason?: string): Promise<void> {
  return authedFetch(`/payouts/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) });
}

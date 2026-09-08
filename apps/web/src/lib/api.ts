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

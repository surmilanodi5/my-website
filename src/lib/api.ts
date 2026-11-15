import type {
  AdminOverviewPayload,
  FashionDesignItem,
  KitchenGardenPost,
  ProjectItem,
  PublicPortfolioPayload,
  SiteContent,
  TeachingClassItem,
  UserDashboardPayload,
  UserPreferences,
  UserProfile,
} from '../types/portfolio.ts';

let cachedCsrfToken: string | null = null;

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function ensureCsrfToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const fromCookie = readCookie('studio_csrf');
    if (fromCookie && fromCookie.length >= 32) {
      cachedCsrfToken = fromCookie;
      return fromCookie;
    }
    if (cachedCsrfToken) return cachedCsrfToken;
  }

  const res = await fetch('/api/csrf-token', { credentials: 'include' });
  if (!res.ok) {
    throw new Error('Unable to initialize security token.');
  }
  const data = (await res.json()) as { csrfToken: string };
  cachedCsrfToken = data.csrfToken;
  return data.csrfToken;
}

async function apiRequest<T>(url: string, options: RequestInit = {}, hasRetried = false): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (isMutation) {
    const csrf = await ensureCsrfToken(hasRetried);
    headers.set('X-CSRF-Token', csrf);
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const contentType = res.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await res.json()
    : { error: await res.text() };

  if (!res.ok) {
    const errMsg = typeof payload?.error === 'string' ? payload.error : '';
    if (res.status === 403 && isMutation && !hasRetried && /security token|csrf/i.test(errMsg)) {
      cachedCsrfToken = null;
      return apiRequest<T>(url, options, true);
    }
    throw new Error(errMsg || `Request failed (${res.status})`);
  }

  return payload as T;
}

// ==========================================
// PUBLIC API
// ==========================================
export function fetchPublicPortfolio(): Promise<PublicPortfolioPayload> {
  return apiRequest<PublicPortfolioPayload>('/api/portfolio');
}

export function submitContactForm(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
  website?: string;
}): Promise<{ ok: boolean; emailSent?: boolean; message: string }> {
  return apiRequest('/api/contact', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ==========================================
// USER AUTH & DASHBOARD API
// ==========================================
export function fetchUserSession(): Promise<{ authenticated: boolean; user?: UserProfile }> {
  return apiRequest('/api/auth/session');
}

export function registerUserAccount(data: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<{ ok: boolean; user: UserProfile }> {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function loginUserAccount(data: {
  email: string;
  password: string;
  rememberMe: boolean;
}): Promise<{ ok: boolean; user: UserProfile }> {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function logoutUserAccount(): Promise<{ ok: boolean }> {
  return apiRequest('/api/auth/logout', { method: 'POST' });
}

export function requestUserPasswordReset(email: string): Promise<{ ok: boolean; message: string }> {
  return apiRequest('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function confirmUserPasswordReset(data: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<{ ok: boolean; message: string }> {
  return apiRequest('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function fetchUserDashboard(): Promise<UserDashboardPayload> {
  return apiRequest('/api/user/dashboard');
}

export function updateUserProfile(data: {
  fullName: string;
  phone: string;
  location: string;
  bio: string;
}): Promise<{ ok: boolean; user: UserProfile }> {
  return apiRequest('/api/user/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function updateUserPreferences(
  prefs: UserPreferences,
): Promise<{ ok: boolean; preferences: UserPreferences }> {
  return apiRequest('/api/user/preferences', {
    method: 'PUT',
    body: JSON.stringify(prefs),
  });
}

export function changeUserPassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean; message: string }> {
  return apiRequest('/api/user/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function uploadUserAvatar(file: File): Promise<{ avatarUrl: string }> {
  const form = new FormData();
  form.append('file', file);
  return apiRequest('/api/user/avatar', {
    method: 'POST',
    body: form,
  });
}

export function saveProjectBookmark(projectId: number): Promise<{ ok: boolean }> {
  return apiRequest(`/api/user/saved-projects/${projectId}`, { method: 'POST' });
}

export function removeProjectBookmark(projectId: number): Promise<{ ok: boolean }> {
  return apiRequest(`/api/user/saved-projects/${projectId}`, { method: 'DELETE' });
}

export function favoriteServiceItem(serviceId: string): Promise<{ ok: boolean }> {
  return apiRequest(`/api/user/favorite-services/${encodeURIComponent(serviceId)}`, { method: 'POST' });
}

export function unfavoriteServiceItem(serviceId: string): Promise<{ ok: boolean }> {
  return apiRequest(`/api/user/favorite-services/${encodeURIComponent(serviceId)}`, { method: 'DELETE' });
}

export function markNotificationRead(id: number): Promise<{ ok: boolean }> {
  return apiRequest(`/api/user/notifications/${id}/read`, { method: 'PATCH' });
}

export function markAllNotificationsRead(): Promise<{ ok: boolean }> {
  return apiRequest('/api/user/notifications/read-all', { method: 'POST' });
}

// ==========================================
// ADMIN API
// ==========================================
export function fetchAdminSession(): Promise<{
  authenticated: boolean;
  username?: string;
  email?: string;
}> {
  return apiRequest('/api/admin/session');
}

export function adminLogin(
  username: string,
  password: string,
): Promise<{ ok: boolean; username: string; email?: string }> {
  return apiRequest('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function requestAdminPasswordReset(email: string): Promise<{ ok: boolean; message: string }> {
  return apiRequest('/api/admin/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function confirmAdminPasswordReset(data: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<{ ok: boolean; message: string }> {
  return apiRequest('/api/admin/reset-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function adminLogout(): Promise<{ ok: boolean }> {
  return apiRequest('/api/admin/logout', { method: 'POST' });
}

export function fetchAdminOverview(): Promise<AdminOverviewPayload> {
  return apiRequest('/api/admin/overview');
}

export function updateSiteSection<K extends keyof SiteContent>(
  section: K,
  data: SiteContent[K],
): Promise<{ ok: boolean; section: K; data: SiteContent[K] }> {
  return apiRequest(`/api/admin/content/${section}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// Fashion CRUD
export interface FashionFormInput {
  title: string;
  category: string;
  fabric: string;
  summary: string;
  description: string;
  images: string[];
  featured: boolean;
  published: boolean;
  sortOrder: number;
}

export function createFashionDesign(data: FashionFormInput): Promise<{ item: FashionDesignItem }> {
  return apiRequest('/api/admin/fashion', { method: 'POST', body: JSON.stringify(data) });
}
export function updateFashionDesign(
  id: number,
  data: FashionFormInput,
): Promise<{ item: FashionDesignItem }> {
  return apiRequest(`/api/admin/fashion/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}
export function reorderFashionDesigns(orderedIds: number[]): Promise<{ ok: boolean }> {
  return apiRequest('/api/admin/fashion/reorder', {
    method: 'PATCH',
    body: JSON.stringify({ orderedIds }),
  });
}
export function deleteFashionDesign(id: number): Promise<{ ok: boolean }> {
  return apiRequest(`/api/admin/fashion/${id}`, { method: 'DELETE' });
}

// Design & Digital Projects CRUD
export interface ProjectFormInput {
  title: string;
  category: string;
  summary: string;
  description: string;
  tools: string[];
  images: string[];
  externalUrl: string;
  featured: boolean;
  published: boolean;
  sortOrder: number;
}

export function createProject(data: ProjectFormInput): Promise<{ project: ProjectItem }> {
  return apiRequest('/api/admin/projects', { method: 'POST', body: JSON.stringify(data) });
}
export function updateProject(id: number, data: ProjectFormInput): Promise<{ project: ProjectItem }> {
  return apiRequest(`/api/admin/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}
export function reorderProjects(orderedIds: number[]): Promise<{ ok: boolean }> {
  return apiRequest('/api/admin/projects/reorder', {
    method: 'PATCH',
    body: JSON.stringify({ orderedIds }),
  });
}
export function deleteProject(id: number): Promise<{ ok: boolean }> {
  return apiRequest(`/api/admin/projects/${id}`, { method: 'DELETE' });
}

// Teaching Classes & Videos CRUD
export interface TeachingFormInput {
  title: string;
  category: string;
  studentLevel: string;
  summary: string;
  description: string;
  images: string[];
  videoUrl: string;
  featured: boolean;
  published: boolean;
  sortOrder: number;
}

export function createTeachingItem(data: TeachingFormInput): Promise<{ item: TeachingClassItem }> {
  return apiRequest('/api/admin/teaching', { method: 'POST', body: JSON.stringify(data) });
}
export function updateTeachingItem(
  id: number,
  data: TeachingFormInput,
): Promise<{ item: TeachingClassItem }> {
  return apiRequest(`/api/admin/teaching/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}
export function reorderTeachingItems(orderedIds: number[]): Promise<{ ok: boolean }> {
  return apiRequest('/api/admin/teaching/reorder', {
    method: 'PATCH',
    body: JSON.stringify({ orderedIds }),
  });
}
export function deleteTeachingItem(id: number): Promise<{ ok: boolean }> {
  return apiRequest(`/api/admin/teaching/${id}`, { method: 'DELETE' });
}

// Kitchen & Garden Posts CRUD
export interface KitchenGardenFormInput {
  title: string;
  category: string;
  summary: string;
  note: string;
  ingredients: string[];
  steps: string[];
  images: string[];
  featured: boolean;
  published: boolean;
  sortOrder: number;
}

export function createKitchenGardenPost(
  data: KitchenGardenFormInput,
): Promise<{ item: KitchenGardenPost }> {
  return apiRequest('/api/admin/kitchen-garden', { method: 'POST', body: JSON.stringify(data) });
}
export function updateKitchenGardenPost(
  id: number,
  data: KitchenGardenFormInput,
): Promise<{ item: KitchenGardenPost }> {
  return apiRequest(`/api/admin/kitchen-garden/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
export function reorderKitchenGardenPosts(orderedIds: number[]): Promise<{ ok: boolean }> {
  return apiRequest('/api/admin/kitchen-garden/reorder', {
    method: 'PATCH',
    body: JSON.stringify({ orderedIds }),
  });
}
export function deleteKitchenGardenPost(id: number): Promise<{ ok: boolean }> {
  return apiRequest(`/api/admin/kitchen-garden/${id}`, { method: 'DELETE' });
}

// Messages, Users, Upload & Settings
export function markMessageRead(id: number, isRead: boolean): Promise<{ ok: boolean }> {
  return apiRequest(`/api/admin/messages/${id}/read`, {
    method: 'PATCH',
    body: JSON.stringify({ isRead }),
  });
}

export function deleteMessage(id: number): Promise<{ ok: boolean }> {
  return apiRequest(`/api/admin/messages/${id}`, { method: 'DELETE' });
}

export function adminUpdateUser(
  id: number,
  data: { isActive?: boolean; role?: 'user' | 'admin' },
): Promise<{ ok: boolean }> {
  return apiRequest(`/api/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function adminDeleteUser(id: number): Promise<{ ok: boolean }> {
  return apiRequest(`/api/admin/users/${id}`, { method: 'DELETE' });
}

export function uploadMediaFile(file: File): Promise<{ url: string; mediaType: 'image' | 'video' }> {
  const form = new FormData();
  form.append('file', file);
  return apiRequest('/api/admin/upload', {
    method: 'POST',
    body: form,
  });
}

export function changeAdminPassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean; message: string }> {
  return apiRequest('/api/admin/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

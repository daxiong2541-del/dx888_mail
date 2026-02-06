import { invoke } from "@tauri-apps/api/core";

export interface Email {
  emailId: number;
  sendEmail: string;
  sendName: string;
  subject: string;
  toEmail: string;
  toName: string;
  createTime: string;
  type: number;
  content: string;
  text: string;
  isDel: number;
}

export interface User {
  email: string;
  password: string;
}

const isTauri = () => {
    // @ts-ignore
    return !!window.__TAURI_INTERNALS__;
};

const getApiBaseUrl = () => {
  const stored = localStorage.getItem("apiBaseUrl");
  if (stored) return stored.replace(/\/+$/g, "");

  const apiKey = localStorage.getItem("apiKey") ?? "";
  if (apiKey) return `/api/${encodeURIComponent(apiKey)}`;

  return "/api-proxy";
};

const isProxyMode = (baseUrl: string) => baseUrl === "/api-proxy";

export const mailService = {
  fetchEmails: async (toEmail: string, token?: string): Promise<Email[]> => {
    if (isTauri()) {
      return await invoke<Email[]>("fetch_emails", { toEmail });
    } else {
      const API_BASE_URL = getApiBaseUrl();
      const resolvedToken = token ?? "";
      if (isProxyMode(API_BASE_URL) && !resolvedToken) {
        throw new Error("Missing authorization token");
      }
      const endpoint = isProxyMode(API_BASE_URL) ? `${API_BASE_URL}/emailList` : `${API_BASE_URL}/mail/emailList`;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (resolvedToken) headers["Authorization"] = resolvedToken;
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ toEmail }),
      });
      const data = await response.json();
      if (data.code === 200) {
        return data.data || [];
      } else {
        throw new Error(data.message || "Failed to fetch emails");
      }
    }
  },

  addUsers: async (users: User[], token?: string): Promise<void> => {
    if (isTauri()) {
      await invoke("add_users", {
        users: users,
      });
    } else {
      const requestBody = { list: users };
      const API_BASE_URL = getApiBaseUrl();
      const resolvedToken = token ?? "";
      if (isProxyMode(API_BASE_URL) && !resolvedToken) {
        throw new Error("Missing authorization token");
      }
      const endpoint = isProxyMode(API_BASE_URL) ? `${API_BASE_URL}/addUser` : `${API_BASE_URL}/mail/addUser`;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (resolvedToken) headers["Authorization"] = resolvedToken;
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();
      if (data.code !== 200) {
        throw new Error(data.message || "Failed to add users");
      }
    }
  },
};

export type AuthMe = { role: "admin" | "user"; userId: number; tenantId: number | null } | null;

export const authService = {
  me: async (): Promise<AuthMe> => {
    const API_BASE_URL = getApiBaseUrl();
    if (isProxyMode(API_BASE_URL)) return null;
    const response = await fetch(`${API_BASE_URL}/auth/me`, { method: "GET", credentials: "include" });
    const data = await response.json();
    return data.data ?? null;
  },

  login: async (email: string, password: string): Promise<{ role: "admin" | "user"; email: string; tenantId: number | null }> => {
    const API_BASE_URL = getApiBaseUrl();
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (data.code !== 200) throw new Error(data.message || "login failed");
    return data.data;
  },

  logout: async (): Promise<void> => {
    const API_BASE_URL = getApiBaseUrl();
    if (isProxyMode(API_BASE_URL)) return;
    await fetch(`${API_BASE_URL}/auth/logout`, { method: "POST", credentials: "include" });
  },
};

export type Tenant = { id: number; name: string; created_at: string };
export type TenantDomain = { id: number; tenant_id: number; domain: string; created_at: string };
export type AppUser = { id: number; tenant_id: number | null; role: string; email: string; created_at: string };
export type GuestLink = {
  id: number;
  tenant_id: number | null;
  token: string;
  scope_type: string;
  scope_value: string;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  created_by_user_id: number | null;
  created_at: string;
};

export const adminService = {
  listTenants: async (): Promise<Tenant[]> => {
    const API_BASE_URL = getApiBaseUrl();
    const response = await fetch(`${API_BASE_URL}/admin/tenants`, { method: "GET", credentials: "include" });
    const data = await response.json();
    if (data.code !== 200) throw new Error(data.message || "failed");
    return data.data ?? [];
  },
  createTenant: async (name: string): Promise<Tenant> => {
    const API_BASE_URL = getApiBaseUrl();
    const response = await fetch(`${API_BASE_URL}/admin/tenants`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await response.json();
    if (data.code !== 200) throw new Error(data.message || "failed");
    return data.data;
  },
  listDomains: async (tenantId: number): Promise<TenantDomain[]> => {
    const API_BASE_URL = getApiBaseUrl();
    const response = await fetch(`${API_BASE_URL}/admin/domains?tenantId=${tenantId}`, { method: "GET", credentials: "include" });
    const data = await response.json();
    if (data.code !== 200) throw new Error(data.message || "failed");
    return data.data ?? [];
  },
  addDomain: async (tenantId: number, domain: string): Promise<TenantDomain> => {
    const API_BASE_URL = getApiBaseUrl();
    const response = await fetch(`${API_BASE_URL}/admin/domains`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, domain }),
    });
    const data = await response.json();
    if (data.code !== 200) throw new Error(data.message || "failed");
    return data.data;
  },
  listUsers: async (): Promise<AppUser[]> => {
    const API_BASE_URL = getApiBaseUrl();
    const response = await fetch(`${API_BASE_URL}/admin/users`, { method: "GET", credentials: "include" });
    const data = await response.json();
    if (data.code !== 200) throw new Error(data.message || "failed");
    return data.data ?? [];
  },
  upsertUser: async (params: { email: string; password: string; role: "admin" | "user"; tenantId: number | null }): Promise<AppUser> => {
    const API_BASE_URL = getApiBaseUrl();
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = await response.json();
    if (data.code !== 200) throw new Error(data.message || "failed");
    return data.data;
  },
  listGuestLinks: async (): Promise<GuestLink[]> => {
    const API_BASE_URL = getApiBaseUrl();
    const response = await fetch(`${API_BASE_URL}/admin/guestLinks`, { method: "GET", credentials: "include" });
    const data = await response.json();
    if (data.code !== 200) throw new Error(data.message || "failed");
    return data.data ?? [];
  },
  createGuestLink: async (params: { tenantId: number; scopeType: "email" | "domain"; scopeValue: string; maxUses: number; expiresAt: string | null }): Promise<GuestLink> => {
    const API_BASE_URL = getApiBaseUrl();
    const response = await fetch(`${API_BASE_URL}/admin/guestLinks`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = await response.json();
    if (data.code !== 200) throw new Error(data.message || "failed");
    return data.data;
  },
  adminEmails: async (toEmail?: string): Promise<(Email & { tenantId?: number | null })[]> => {
    const API_BASE_URL = getApiBaseUrl();
    const q = toEmail ? `?toEmail=${encodeURIComponent(toEmail)}` : "";
    const response = await fetch(`${API_BASE_URL}/admin/emails${q}`, { method: "GET", credentials: "include" });
    const data = await response.json();
    if (data.code !== 200) throw new Error(data.message || "failed");
    return data.data ?? [];
  },
};

export const guestService = {
  fetchEmails: async (token: string, toEmail?: string): Promise<Email[]> => {
    const API_BASE_URL = getApiBaseUrl();
    const response = await fetch(`${API_BASE_URL}/guest/${encodeURIComponent(token)}/emailList`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toEmail }),
    });
    const data = await response.json();
    if (data.code !== 200) throw new Error(data.message || "failed");
    return data.data ?? [];
  },
};

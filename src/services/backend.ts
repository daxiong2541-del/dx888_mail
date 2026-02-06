import { clearAuthToken, getAuthToken, setAuthToken } from "../auth/session";

type BackendError = { error: string };

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(path, { ...init, headers });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as any) : {};
  if (!res.ok) {
    const message = (data as BackendError)?.error ?? `HTTP ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

export type MeResponse = { user: { id: string; email: string; role: "admin" | "user"; tenantId: string | null } };

export const backend = {
  async login(email: string, password: string) {
    const data = await requestJson<{ token: string; user: { id: string; email: string; role: "admin" | "user" } }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    );
    setAuthToken(data.token);
    return data.user;
  },

  async logout() {
    clearAuthToken();
  },

  async me(): Promise<MeResponse["user"]> {
    const data = await requestJson<MeResponse>("/api/auth/me");
    return data.user;
  },

  async adminListUsers() {
    return requestJson<{ users: Array<{ id: string; email: string; role: "admin" | "user"; tenant_id: string | null; tenant_name: string | null; created_at: string }> }>(
      "/api/admin/users"
    );
  },

  async adminCreateUser(email: string, password: string, tenantName: string) {
    return requestJson<{ user: { id: string; email: string; role: "admin" | "user"; tenant_id: string } }>(
      "/api/admin/users",
      { method: "POST", body: JSON.stringify({ email, password, tenantName }) }
    );
  },

  async adminListMailboxes() {
    return requestJson<{ mailboxes: Array<{ id: string; email: string; tenant_id: string; tenant_name: string; created_at: string }> }>(
      "/api/admin/mailboxes"
    );
  },

  async adminListShareLinks() {
    return requestJson<{ shareLinks: Array<{ id: string; token: string; max_queries: number; queries_used: number; expires_at: string; created_at: string; mailbox_email: string; tenant_name: string }> }>(
      "/api/admin/share-links"
    );
  },

  async adminCreateShareLink(mailboxId: string, maxQueries: number, expiresInMinutes: number) {
    return requestJson<{ shareLink: { id: string; token: string; max_queries: number; queries_used: number; expires_at: string; created_at: string } }>(
      "/api/admin/share-links",
      { method: "POST", body: JSON.stringify({ mailboxId, maxQueries, expiresInMinutes }) }
    );
  },

  async tenantListMailboxes() {
    return requestJson<{ mailboxes: Array<{ id: string; email: string; created_at: string }> }>("/api/tenant/mailboxes");
  },

  async tenantCreateMailbox(email: string) {
    return requestJson<{ mailbox: { id: string; email: string; created_at: string } }>(
      "/api/tenant/mailboxes",
      { method: "POST", body: JSON.stringify({ email }) }
    );
  },

  async tenantListShareLinks() {
    return requestJson<{ shareLinks: Array<{ id: string; token: string; max_queries: number; queries_used: number; expires_at: string; created_at: string; mailbox_email: string }> }>(
      "/api/tenant/share-links"
    );
  },

  async tenantCreateShareLink(mailboxId: string, maxQueries: number, expiresInMinutes: number) {
    return requestJson<{ shareLink: { id: string; token: string; max_queries: number; queries_used: number; expires_at: string; created_at: string } }>(
      "/api/tenant/share-links",
      { method: "POST", body: JSON.stringify({ mailboxId, maxQueries, expiresInMinutes }) }
    );
  },

  async publicShareEmails(token: string) {
    return requestJson<{ mailbox: { email: string }; usage: { maxQueries: number; queriesUsed: number; expiresAt: string }; emails: unknown[] }>(
      `/api/public/share/${encodeURIComponent(token)}`
    );
  }
};

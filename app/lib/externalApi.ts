import { getSystemSettings } from '@/lib/systemSettings';

let cachedKey: string | null = null;
let cachedConfig: { baseUrl: string; headers: Headers } | null = null;

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, '');
}

async function getConfig() {
  const settings = await getSystemSettings();
  const baseUrl = normalizeBaseUrl(
    settings.dynmslApiBaseUrl || process.env.DYNMSL_API_BASE_URL || 'https://mail.dynmsl.com/api/public'
  );
  const apiToken = settings.dynmslApiToken || process.env.DYNMSL_API_TOKEN;
  const wafBypassToken = settings.dynmslWafBypassToken || process.env.DYNMSL_WAF_BYPASS_TOKEN;
  if (!apiToken) {
    throw new Error('Missing DYNMSL_API_TOKEN');
  }

  const key = `${baseUrl}::${apiToken}::${wafBypassToken || ''}`;
  if (cachedConfig && cachedKey === key) return cachedConfig;
  cachedKey = key;
  const headers = new Headers();
  headers.set('Authorization', apiToken);
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json, text/plain, */*');
  headers.set(
    'User-Agent',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );
  if (wafBypassToken) headers.set('X-DYNMSL-WAF-BYPASS', wafBypassToken);
  cachedConfig = { baseUrl, headers };
  return cachedConfig;
}

async function postJson<TResponse>(path: string, body: unknown) {
  const { baseUrl, headers } = await getConfig();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);
  try {
    const url = new URL(path.replace(/^\//, ''), `${baseUrl}/`);
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();
    let json: TResponse | null = null;
    if (text) {
      try {
        json = JSON.parse(text) as TResponse;
      } catch {
        json = null;
      }
    }
    const looksLikeCloudflareChallenge =
      contentType.includes('text/html') &&
      (/just a moment/i.test(text) || /__cf_chl_/i.test(text) || /cdn-cgi\/challenge/i.test(text));

    if (res.ok && (looksLikeCloudflareChallenge || contentType.includes('text/html'))) {
      throw new Error('Upstream blocked by Cloudflare challenge');
    }
    if (!res.ok) {
      const messageFromJson =
        json && typeof json === 'object' && 'message' in json ? String((json as { message?: unknown }).message) : '';
      const message = looksLikeCloudflareChallenge
        ? 'Upstream blocked by Cloudflare challenge'
        : messageFromJson || text || `DYNMSL API error (${res.status})`;
      throw new Error(message);
    }
    return (json || ({} as TResponse)) as TResponse;
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface DynmslResponse<T = unknown> {
  code: number;
  data: T;
  message?: string;
  [key: string]: unknown;
}

export interface EmailListParams {
  toEmail: string;
}

export const getEmailList = async (params: EmailListParams): Promise<DynmslResponse> => {
  return postJson<DynmslResponse>('/emailList', params);
};

export interface AddUserParams {
  list: { email: string; password: string }[];
}

export const addUsers = async (params: AddUserParams): Promise<DynmslResponse> => {
  return postJson<DynmslResponse>('/addUser', params);
};

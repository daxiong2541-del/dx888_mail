'use client';

import { useEffect, useState, memo, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { deobfuscate } from '@/lib/obfuscate';

type EmailItem = {
  toEmail?: string;
  from?: string;
  content?: string;
  createTime?: string;
  subject?: string;
};

// Separate memoized component for email body to prevent re-renders when timer ticks
const EmailBody = memo(({ content }: { content: string }) => {
  const sanitized = useMemo(() => {
    const s = String(content || '');
    // Extract body
    const bodyMatch = s.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const html = bodyMatch ? bodyMatch[1] : s;
    // Strip scripts
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }, [content]);

  if (!sanitized) return null;

  return (
    <div
      style={{ whiteSpace: 'normal', lineHeight: 1.6 }}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
});

EmailBody.displayName = 'EmailBody';

// Separate component for the countdown to isolate state changes
function CountdownTimer({ initialMs }: { initialMs: number | null }) {
  const [ms, setMs] = useState<number | null>(initialMs);

  useEffect(() => {
    setMs(initialMs);
  }, [initialMs]);

  useEffect(() => {
    if (ms === null || ms <= 0) return;
    const timer = setInterval(() => {
      setMs(prev => {
        if (prev === null || prev <= 1000) return 0;
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [ms !== null && ms > 0]); // Minimal dependency to keep interval stable

  if (ms === null) return <span>-</span>;
  
  const formatRemaining = (safeMs: number) => {
    const totalSeconds = Math.floor(safeMs / 1000);
    if (totalSeconds <= 0) return '已过期';
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts: string[] = [];
    if (days) parts.push(`${days}天`);
    if (hours || days) parts.push(`${hours}小时`);
    if (minutes || hours || days) parts.push(`${minutes}分钟`);
    parts.push(`${seconds}秒`);
    return parts.join(' ');
  };

  return <span>{formatRemaining(ms)}</span>;
}

export default function ShareEmailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  const type = searchParams.get('type');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remainingChecks, setRemainingChecks] = useState<number>(0);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [msg, setMsg] = useState<string>('');
  const [email, setEmail] = useState<EmailItem | null>(null);
  const [maxCount, setMaxCount] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
    });
    fetch(`/api/share/email/${id}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<{
          success: boolean;
          configId: string;
          targetEmail: string;
          password?: string;
          maxCount: number;
          remainingChecks: number;
          remainingMs?: number | null;
          tempToken?: string;
          baseUrl?: string;
        }>;
      })
      .then(async (configJson) => {
        if (cancelled) return;
        setRemainingChecks(configJson.remainingChecks);
        setRemainingMs(typeof configJson.remainingMs === 'number' ? configJson.remainingMs : null);
        setMaxCount(configJson.maxCount);
        
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        let fetchUrl = '';
        let requestBody = JSON.stringify({ toEmail: configJson.targetEmail });

        const realPassword = deobfuscate(configJson.password);
        const realTempToken = deobfuscate(configJson.tempToken);

        if (realPassword) {
          // Has password: Perform login flow first
          try {
            const loginRes = await fetch('https://mail.dynmsl.com/api/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: configJson.targetEmail, password: realPassword }),
            });
            if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
            const loginData = await loginRes.json();
            const token = loginData.data?.token;
            if (!token) throw new Error('No token returned from login');

            const userRes = await fetch('https://mail.dynmsl.com/api/my/loginUserInfo', {
              headers: { 'Authorization': token },
            });
            if (!userRes.ok) throw new Error(`UserInfo failed: ${userRes.status}`);
            const userData = await userRes.json();
            const accountId = userData.data?.account?.accountId;
            if (!accountId) throw new Error('No accountId found');

            fetchUrl = `https://mail.dynmsl.com/api/email/list?accountId=${accountId}&allReceive=0&emailId=0&timeSort=0&type=0`;
            headers['Authorization'] = token;
            requestBody = ''; // GET request doesn't need body
          } catch (loginErr) {
            console.error('Login flow failed, falling back to public API:', loginErr);
            // Fallback to public API
            fetchUrl = configJson.baseUrl 
              ? `${configJson.baseUrl.replace(/\/+$/, '')}/emailList`
              : '/api-proxy/emailList';
            if (realTempToken) headers['Authorization'] = realTempToken;
            requestBody = JSON.stringify({ toEmail: configJson.targetEmail });
          }
        } else {
          // No password: Use public API
          fetchUrl = configJson.baseUrl 
            ? `${configJson.baseUrl.replace(/\/+$/, '')}/emailList`
            : '/api-proxy/emailList';
          if (realTempToken) headers['Authorization'] = realTempToken;
          requestBody = JSON.stringify({ toEmail: configJson.targetEmail });
        }

        let proxyRes;
        try {
          proxyRes = await fetch(fetchUrl, {
            method: requestBody ? 'POST' : 'GET',
            headers,
            body: requestBody || undefined,
          });
        } catch (err) {
          console.error('Fetch failed:', err);
          throw err;
        }

        if (!proxyRes.ok) {
           // Handle 401/403/502 etc.
           const text = await proxyRes.text();
           let errMsg = `Status ${proxyRes.status}`;
           try {
             const errJson = JSON.parse(text);
             errMsg = errJson.message || errJson.error || errMsg;
           } catch {
             if (text.includes('Cloudflare')) errMsg = 'Upstream blocked by Cloudflare challenge';
             else errMsg = text.slice(0, 100);
           }
           throw new Error(errMsg);
        }

        const raw = await proxyRes.json();
        const data = raw?.data || raw;
        const latest = data?.latestEmail || (Array.isArray(data?.list) ? data.list[0] : (Array.isArray(data) ? data[0] : null));
        
        let first: EmailItem | null = null;
        if (latest) {
          first = {
            subject: latest.subject,
            from: latest.sendEmail || latest.from || latest.name,
            toEmail: latest.toEmail,
            content: latest.content,
            createTime: latest.createTime
          };
        }
        
        setEmail(first);
        setMsg(first ? '读取成功' : '未收到邮件');

        // Decrement remaining count only if content is found
        if (first) {
          fetch(`/api/share/email/${id}`, { method: 'POST' })
            .then(res => res.json())
            .then(confirmJson => {
              if (confirmJson.success) {
                setRemainingChecks(configJson.maxCount - confirmJson.receivedCount);
              }
            })
            .catch(err => console.error('Failed to confirm usage:', err));
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : '加载失败');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        Invalid id
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        加载中...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>访问失败</div>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{error}</pre>
      </div>
    );
  }

  if (type === 'json') {
    const jsonOutput = {
      success: true,
      msg,
      remainingChecks,
      remainingMs,
      data: email ? [email] : [],
    };
    return (
      <pre style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap', padding: 24, fontFamily: 'monospace' }}>
        {JSON.stringify(jsonOutput, null, 2)}
      </pre>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>邮件</div>
      <div style={{ color: '#333', marginBottom: 8 }}>{msg}</div>
      <div style={{ color: '#666', marginBottom: 16 }}>剩余次数：{remainingChecks}</div>
      <div style={{ color: '#666', marginBottom: 16 }}>
        剩余时间：<CountdownTimer initialMs={remainingMs} />
      </div>
      {!email ? (
        <div>未收到邮件</div>
      ) : (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12, color: '#1a1a1a' }}>{email.subject || '(无主题)'}</div>
          
          <div style={{ background: '#f8f9fa', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 14 }}>
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: '#666', width: 60, display: 'inline-block' }}>发件人:</span>
              <span style={{ fontWeight: 500 }}>{email.from || '(未知)'}</span>
            </div>
            <div>
              <span style={{ color: '#666', width: 60, display: 'inline-block' }}>收件人:</span>
              <span style={{ fontWeight: 500 }}>{email.toEmail || '(未知)'}</span>
            </div>
            <div style={{ marginTop: 4 }}>
              <span style={{ color: '#666', width: 60, display: 'inline-block' }}>时间:</span>
              <span>{email.createTime || '-'}</span>
            </div>
          </div>

          <EmailBody content={email.content || ''} />
        </div>
      )}
      </div>
    </div>
  );
}

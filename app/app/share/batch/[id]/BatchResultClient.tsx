'use client';

import { useEffect, useState } from 'react';
import { deobfuscate } from '@/lib/obfuscate';

type Account = {
  email: string;
  password?: string;
  status?: string;
  latestEmail?: {
    subject?: string;
    from?: string;
    snippet?: string;
    date?: string;
    loading: boolean;
    error?: string;
  };
};

type Props = {
  task: {
    count: number;
    charType: string;
    status: string;
    accounts: Array<{ email: string; password?: string; status?: string }>;
  };
  publicToken: string;
};

// Queue helper to limit concurrency
const queue: (() => Promise<void>)[] = [];
let activeRequests = 0;
const MAX_CONCURRENT = 3;

function processQueue() {
  if (activeRequests >= MAX_CONCURRENT || queue.length === 0) return;
  
  const task = queue.shift();
  if (task) {
    activeRequests++;
    task().finally(() => {
      activeRequests--;
      processQueue();
    });
  }
}

function addToQueue(task: () => Promise<void>) {
  queue.push(task);
  processQueue();
}

export default function BatchResultClient({ task, publicToken }: Props) {
  const [accounts, setAccounts] = useState<Account[]>(
    task.accounts.map(acc => ({
      ...acc,
      latestEmail: { loading: true }
    }))
  );

  useEffect(() => {
    const realPublicToken = deobfuscate(publicToken);

    // Start fetching for each account
    accounts.forEach((acc, index) => {
      if (acc.status !== 'success' && acc.status !== undefined) {
        setAccounts(prev => {
          const next = [...prev];
          next[index].latestEmail = { loading: false, error: '注册失败' };
          return next;
        });
        return;
      }
      
      const realPassword = deobfuscate(acc.password);

      addToQueue(async () => {
        try {
          if (!realPassword) {
            // No password: use public API
            const res = await fetch('https://mail.dynmsl.com/api/public/emailList', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': realPublicToken
              },
              body: JSON.stringify({ toEmail: acc.email }),
            });

            if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
            
            const raw = await res.json();
            // Unified parsing logic as they "return the same"
            const data = raw?.data || raw;
            const latest = data?.latestEmail || (Array.isArray(data?.list) ? data.list[0] : (Array.isArray(data) ? data[0] : null));
            
            setAccounts(prev => {
              const next = [...prev];
              if (latest) {
                next[index].latestEmail = {
                  loading: false,
                  subject: latest.subject,
                  from: latest.sendEmail || latest.from || latest.name,
                  snippet: latest.content ? latest.content.replace(/<[^>]*>/g, '').slice(0, 50) : '',
                  date: latest.createTime,
                };
              } else {
                next[index].latestEmail = { loading: false, error: '无邮件' };
              }
              return next;
            });
            return;
          }

          // Has password: use user API
          // 1. Login
          const loginRes = await fetch('https://mail.dynmsl.com/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: acc.email, password: realPassword }),
          });
          
          if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
          const loginData = await loginRes.json();
          const token = loginData.data?.token;
          if (!token) throw new Error('No token returned');

          // 2. Get User Info
          const userRes = await fetch('https://mail.dynmsl.com/api/my/loginUserInfo', {
            headers: { 'Authorization': token },
          });
          
          if (!userRes.ok) throw new Error(`UserInfo failed: ${userRes.status}`);
          const userData = await userRes.json();
          const accountId = userData.data?.account?.accountId;
          if (!accountId) throw new Error('No accountId returned');

          // 3. Get Email List
          const listRes = await fetch(`https://mail.dynmsl.com/api/email/list?accountId=${accountId}&allReceive=0&emailId=0&timeSort=0&type=0`, {
            headers: { 'Authorization': token },
          });
          
          if (!listRes.ok) throw new Error(`List failed: ${listRes.status}`);
          const raw = await listRes.json();
          
          // Unified parsing logic as they "return the same"
          const data = raw?.data || raw;
          const latest = data?.latestEmail || (Array.isArray(data?.list) ? data.list[0] : (Array.isArray(data) ? data[0] : null));

          setAccounts(prev => {
            const next = [...prev];
            if (latest) {
              next[index].latestEmail = {
                loading: false,
                subject: latest.subject,
                from: latest.sendEmail || latest.from || latest.name,
                snippet: latest.content ? latest.content.replace(/<[^>]*>/g, '').slice(0, 50) : '',
                date: latest.createTime,
              };
            } else {
              next[index].latestEmail = { loading: false, error: '无邮件' };
            }
            return next;
          });

        } catch (err: unknown) {
          console.error(`Error fetching email for ${acc.email}:`, err);
          setAccounts(prev => {
            const next = [...prev];
            next[index].latestEmail = { 
              loading: false, 
              error: err instanceof Error ? err.message : '获取失败' 
            };
            return next;
          });
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>批量注册结果</h1>
      <div style={{ color: '#666', marginBottom: 16 }}>
        数量：{task.count} | 类型：{task.charType} | 状态：{task.status}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', minWidth: 800 }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left', width: '25%' }}>邮箱</th>
              <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left', width: '15%' }}>密码</th>
              <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left', width: '10%' }}>状态</th>
              <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left', width: '50%' }}>最新邮件</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc, idx) => (
              <tr key={idx}>
                <td style={{ border: '1px solid #ddd', padding: 8 }}>{acc.email}</td>
                <td style={{ border: '1px solid #ddd', padding: 8, fontFamily: 'monospace' }}>
                  {deobfuscate(acc.password) || ''}
                </td>
                <td style={{ border: '1px solid #ddd', padding: 8 }}>{acc.status || ''}</td>
                <td style={{ border: '1px solid #ddd', padding: 8, fontSize: '0.9em' }}>
                  {acc.latestEmail?.loading ? (
                    <span style={{ color: '#999' }}>加载中...</span>
                  ) : acc.latestEmail?.error ? (
                    <span style={{ color: '#d32f2f' }}>{acc.latestEmail.error}</span>
                  ) : (
                    <div>
                      <div style={{ fontWeight: 600 }}>{acc.latestEmail?.subject || '(无主题)'}</div>
                      <div style={{ color: '#666', fontSize: '0.85em' }}>
                        From: {acc.latestEmail?.from} | {acc.latestEmail?.date}
                      </div>
                      <div style={{ color: '#444', marginTop: 4 }}>{acc.latestEmail?.snippet}</div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

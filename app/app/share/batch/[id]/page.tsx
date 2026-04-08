import { headers } from 'next/headers';
import BatchResultClient from './BatchResultClient';
import { getSystemSettings } from '@/lib/systemSettings';
import { obfuscate } from '@/lib/obfuscate';

export const dynamic = 'force-dynamic';

async function getBaseUrl() {
  const h = await headers();
  const proto = h.get('x-forwarded-proto') || 'http';
  const host = h.get('x-forwarded-host') || h.get('host');
  if (host) return `${proto}://${host}`;

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return 'http://localhost:3000';
}

export default async function ShareBatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const baseUrl = await getBaseUrl();
  const [res, settings] = await Promise.all([
    fetch(`${baseUrl}/api/share/batch/${id}`, { cache: 'no-store' }),
    getSystemSettings(),
  ]);

  if (!res.ok) {
    const text = await res.text();
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>访问失败</h1>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{text}</pre>
      </div>
    );
  }

  const data = (await res.json()) as {
    success: boolean;
    task: {
      count: number;
      charType: string;
      status: string;
      accounts: Array<{ email: string; password?: string; status?: string }>;
    };
  };

  return <BatchResultClient task={data.task} publicToken={obfuscate(settings.dynmslApiToken)} />;
}

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import EmailConfig from '@/models/EmailConfig';

function csvEscape(value: string) {
  const v = value.replace(/"/g, '""');
  return `"${v}"`;
}

function formatZhDateTime(value: string | Date | null | undefined) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  const y = get('year');
  const m = get('month');
  const day = get('day');
  const hh = get('hour');
  const mm = get('minute');
  const ss = get('second');
  return `${y}年${m}月${day}日${hh}:${mm}:${ss}`;
}

function getBaseUrl(req: Request) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  if (!host) return '';
  return `${proto}://${host}`;
}

function parseFuzzyTerms(input: string) {
  const raw = String(input || '')
    .split(/\r?\n|,|;|\s+/)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const v of raw) {
    if (seen.has(v)) continue;
    seen.add(v);
    unique.push(v);
    if (unique.length >= 50) break;
  }
  return unique;
}

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(req: Request) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const format = searchParams.get('format') || 'csv';
  const fieldsParam = searchParams.get('fields') || 'targetEmail,share';
  const fields = fieldsParam.split(',').filter(Boolean);

  // Filters from dashboard
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const terms = parseFuzzyTerms(q);
  const orderBy = (searchParams.get('orderBy') || 'targetEmail').trim();
  const order = (searchParams.get('order') || 'desc').trim();
  const createdFrom = (searchParams.get('createdFrom') || '').trim();
  const createdTo = (searchParams.get('createdTo') || '').trim();

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  const filter: Record<string, unknown> = { userId };
  
  if (terms.length > 0) {
    filter.$or = terms.map((t) => ({
      targetEmail: { $regex: escapeRegex(t), $options: 'i' },
    }));
  }

  if (createdFrom || createdTo) {
    const range: Record<string, unknown> = {};
    if (createdFrom) {
      const d = new Date(createdFrom);
      if (!Number.isNaN(d.getTime())) range.$gte = d;
    }
    if (createdTo) {
      const d = new Date(createdTo);
      if (!Number.isNaN(d.getTime())) range.$lte = d;
    }
    if (Object.keys(range).length > 0) filter.createdAt = range;
  }

  const sortField = orderBy === 'createdAt' ? 'createdAt' : orderBy === 'targetEmail' ? 'targetEmail' : 'updatedAt';
  const sortDir = order === 'asc' ? 1 : -1;

  const configs = await EmailConfig.find(filter)
    .sort({ [sortField]: sortDir, _id: -1 })
    .lean();

  const baseUrl = getBaseUrl(req);
  const rows: string[] = [];
  
  // Header row for CSV
  if (format === 'csv') {
    rows.push(fields.join(','));
  }

  for (const cfg of configs) {
    const id = String((cfg as unknown as { shareId?: string }).shareId || cfg._id);
    const shareType = (cfg as unknown as { shareType?: string }).shareType === 'json' ? 'json' : 'html';
    const share =
      shareType === 'json'
        ? baseUrl
          ? `${baseUrl}/api/share/email/${id}`
          : `/api/share/email/${id}`
        : baseUrl
          ? `${baseUrl}/share/email/${id}`
          : `/share/email/${id}`;
    
    const remaining = Number(cfg.maxCount || 0) - Number(cfg.receivedCount || 0);
    
    const rowData: string[] = [];
    for (const field of fields) {
      let val = '';
      if (field === 'targetEmail') val = String(cfg.targetEmail || '');
      else if (field === 'share') val = share;
      else if (field === 'password') val = String(cfg.password || '');
      else if (field === 'shareType') val = shareType;
      else if (field === 'expiresAt') val = formatZhDateTime(cfg.expiresAt ? new Date(cfg.expiresAt) : '');
      else if (field === 'remainingChecks') val = String(remaining);
      else if (field === 'createdAt') val = formatZhDateTime(cfg.createdAt ? new Date(cfg.createdAt) : '');
      
      if (format === 'csv') {
        rowData.push(csvEscape(val));
      } else {
        rowData.push(val);
      }
    }

    if (format === 'csv') {
      rows.push(rowData.join(','));
    } else {
      // TXT format uses TAB as separator
      rows.push(rowData.join('\t'));
    }
  }

  const content = rows.join('\n');
  const contentType = format === 'csv' ? 'text/csv' : 'text/plain';
  const filename = format === 'csv' ? 'emails.csv' : 'emails.txt';

  return new NextResponse(content, {
    headers: {
      'Content-Type': `${contentType}; charset=utf-8`,
      'Content-Disposition': `attachment; filename=${filename}`,
    },
  });
}

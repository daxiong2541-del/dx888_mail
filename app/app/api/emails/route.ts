import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import EmailConfig from '@/models/EmailConfig';
import { computeExpiresAt, getUserById, isDynmslEmail, parseEmails, parseEmailsWithPasswords } from '@/lib/auth';
import { addUsers } from '@/lib/externalApi';
import { generateShareId } from '@/lib/shareId';
import mongoose from 'mongoose';

export const preferredRegion = ['hkg1'];

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
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

async function createUniqueShareId() {
  for (let i = 0; i < 5; i++) {
    const shareId = generateShareId();
    const exists = await EmailConfig.findOne({ shareId }).select('_id').lean();
    if (!exists) return shareId;
  }
  throw new Error('Failed to allocate shareId');
}

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const ownerUserId = searchParams.get('ownerUserId');
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const terms = parseFuzzyTerms(q);
    const page = Math.max(Number(searchParams.get('page') || 1), 1);
    const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize') || 100), 1), 500);
    const orderBy = (searchParams.get('orderBy') || 'targetEmail').trim();
    const order = (searchParams.get('order') || 'desc').trim();
    const createdFrom = (searchParams.get('createdFrom') || '').trim();
    const createdTo = (searchParams.get('createdTo') || '').trim();
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const queryUserId = user.isAdmin && ownerUserId ? ownerUserId : userId;
    const queryUserObjectId = mongoose.isValidObjectId(queryUserId)
      ? new mongoose.Types.ObjectId(queryUserId)
      : queryUserId;

    const filter: Record<string, unknown> = {
      userId: queryUserObjectId,
    };
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

    const total = await EmailConfig.countDocuments(filter);

    const sortField = orderBy === 'createdAt' ? 'createdAt' : orderBy === 'targetEmail' ? 'targetEmail' : 'updatedAt';
    const sortDir = order === 'asc' ? 1 : -1;

    const useQueryOrder = terms.length > 0 && sortField === 'targetEmail';

    const configs = useQueryOrder
      ? await EmailConfig.aggregate([
          { $match: filter },
          {
            $addFields: {
              matchIndex: {
                $min: terms.map((t, idx) => ({
                  $cond: [
                    { $regexMatch: { input: '$targetEmail', regex: escapeRegex(t), options: 'i' } },
                    idx,
                    9999,
                  ],
                })),
              },
            },
          },
          { $sort: { matchIndex: 1, _id: -1 } },
          { $skip: (page - 1) * pageSize },
          { $limit: pageSize },
        ])
      : await EmailConfig.find(filter)
          .sort({ [sortField]: sortDir, _id: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .lean();

    for (const cfg of configs) {
      const hasShareId = Boolean((cfg as unknown as { shareId?: string }).shareId);
      if (hasShareId) continue;
      const shareId = await createUniqueShareId();
      (cfg as unknown as { shareId?: string }).shareId = shareId;
      await EmailConfig.updateOne({ _id: cfg._id }, { $set: { shareId } });
    }

    const normalized = configs.map((c) => ({
      ...c,
      _id: String(c._id),
      userId: String((c as unknown as { userId: unknown }).userId),
    }));

    return NextResponse.json({
      success: true,
      total,
      page,
      pageSize,
      configs: normalized,
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = (await req.json()) as {
      userId?: string;
      mode?: 'import' | 'generate' | 'bulk-save' | 'import-check';
      rawEmails?: string;
      count?: number;
      charType?: 'number' | 'english';
      prefix?: string;
      charLength?: number;
      durationDays?: number;
      maxCount?: number;
      shareType?: 'json' | 'html';
      accounts?: Array<{ email: string; password?: string }>;
    };

    if (!body.userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    const user = await getUserById(body.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const durationDays = clampNumber(body.durationDays, 1, 365, 1);
    const maxCount = clampNumber(body.maxCount, 1, 10000, 100);
    const shareType = body.shareType === 'json' ? 'json' : 'html';

    if (body.mode === 'generate') {
      const count = clampNumber(body.count, 1, 100, 10);
      const charType = body.charType === 'number' ? 'number' : 'english';
      const charLength = clampNumber(body.charLength, 4, 20, 8);
      const prefix = String(body.prefix || '');

      const generateRandomString = (length: number, type: string) => {
        // Exclude: 0, 1, 7, i, l (L), o (O)
        const numbers = '2345689';
        const letters = 'abcdefghjkmnpqrstuvwxyz';
        const mixed = 'abcdefghjkmnpqrstuvwxyz2345689';
        
        let chars = mixed;
        if (type === 'number') chars = numbers;
        else if (type === 'english') chars = letters;

        let result = '';
        for (let i = 0; i < length; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      const list: { email: string; password: string }[] = [];
      const emails: string[] = [];
      for (let i = 0; i < count; i++) {
        const randomPart = generateRandomString(charLength, charType);
        const email = `${prefix}${randomPart}@dynmsl.com`.toLowerCase();
        if (!isDynmslEmail(email)) {
          return NextResponse.json({ error: 'Only @dynmsl.com emails allowed' }, { status: 400 });
        }
        const password = generateRandomString(10, 'mixed');
        list.push({ email, password });
        emails.push(email);
      }

      const existing = await EmailConfig.find({ targetEmail: { $in: emails } }).select('targetEmail').lean();
      
      // We don't call addUsers here anymore. We return the list for the client to register.
      return NextResponse.json({
        success: true,
        accounts: list,
        duplicates: existing.map(d => d.targetEmail)
      });
    }

    if (body.mode === 'import-check') {
        const rawEmails = String(body.rawEmails || '');
        const accounts = parseEmailsWithPasswords(rawEmails);
        if (accounts.length === 0) {
            return NextResponse.json({ error: 'No valid @dynmsl.com emails found' }, { status: 400 });
        }
        const emails = accounts.map(a => a.email);
        const existing = await EmailConfig.find({ targetEmail: { $in: emails } }).select('targetEmail').lean();
        return NextResponse.json({
            success: true,
            accounts,
            duplicates: existing.map(d => d.targetEmail)
        });
    }

    if (body.mode === 'bulk-save') {
         const accounts = Array.isArray(body.accounts) ? body.accounts : [];
         if (accounts.length === 0) {
             return NextResponse.json({ error: 'No accounts to save' }, { status: 400 });
         }

        const expiresAt = computeExpiresAt(durationDays);
        const docs = [];
        for (const acc of accounts) {
            const email = String(acc.email || '').toLowerCase();
            if (!isDynmslEmail(email)) continue;
            
            docs.push({
                userId: body.userId,
                targetEmail: email,
                password: String(acc.password || ''),
                shareId: await createUniqueShareId(),
                source: 'generated',
                shareType,
                durationDays,
                maxCount,
                expiresAt,
            });
        }

        const created = await EmailConfig.insertMany(docs, { ordered: false });
        return NextResponse.json({
            success: true,
            createdCount: created.length,
            configs: created
        });
    }

    const rawEmails = String(body.rawEmails || '');
    const emails = parseEmails(rawEmails)
      .map((e) => e.toLowerCase())
      .filter((e) => isDynmslEmail(e));

    if (emails.length === 0) {
      return NextResponse.json({ error: 'No valid @dynmsl.com emails found' }, { status: 400 });
    }

    const existing = await EmailConfig.find({ targetEmail: { $in: emails } }).select('targetEmail').lean();
    const existingSet = new Set(existing.map((d) => String(d.targetEmail).toLowerCase()));
    const toCreate = emails.filter((e) => !existingSet.has(e.toLowerCase()));
    const skippedEmails = emails.filter((e) => existingSet.has(e.toLowerCase()));

    const expiresAt = computeExpiresAt(durationDays);
    const docs = toCreate.map((targetEmail) => ({
      userId: body.userId,
      targetEmail,
      password: '',
      shareId: '',
      source: 'import',
      shareType,
      durationDays,
      maxCount,
      expiresAt,
    }));

    for (const d of docs) {
      d.shareId = await createUniqueShareId();
    }

    const created = docs.length > 0 ? await EmailConfig.insertMany(docs, { ordered: false }) : [];
    const normalized = created.map((c) => ({
      ...c.toObject(),
      _id: String(c._id),
      userId: String(c.userId),
    }));

    return NextResponse.json({
      success: true,
      createdCount: created.length,
      skippedCount: emails.length - created.length,
      skippedEmails,
      configs: normalized,
    });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

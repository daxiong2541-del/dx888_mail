import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import EmailConfig from '@/models/EmailConfig';
import mongoose from 'mongoose';
import { generateShareId } from '@/lib/shareId';
import { getSystemSettings } from '@/lib/systemSettings';
import { obfuscate } from '@/lib/obfuscate';

async function allocateShareId() {
  for (let i = 0; i < 5; i++) {
    const shareId = generateShareId();
    const exists = await EmailConfig.findOne({ shareId }).select('_id').lean();
    if (!exists) return shareId;
  }
  throw new Error('Failed to allocate shareId');
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    
    let config = await EmailConfig.findOne({ shareId: id });
    if (!config && mongoose.isValidObjectId(id)) {
      config = await EmailConfig.findById(id);
    }

    if (!config) {
      return new NextResponse('Config not found', { status: 404 });
    }

    if (!config.shareId) {
      try {
        config.shareId = await allocateShareId();
        await config.save();
      } catch {
        // ignore
      }
    }

    const now = new Date();
    if (now > config.expiresAt) {
      return new NextResponse('Link Expired (Time Limit)', { status: 410 });
    }

    if (config.receivedCount >= config.maxCount) {
      return new NextResponse('Link Expired (Max Count Reached)', { status: 410 });
    }

    const remainingChecks = Math.max(0, config.maxCount - config.receivedCount);
    const remainingMs = config.expiresAt.getTime() - now.getTime();

    const settings = await getSystemSettings();
    const tempToken = settings.dynmslApiToken;
    const baseUrl = settings.dynmslApiBaseUrl || process.env.DYNMSL_API_BASE_URL || 'https://mail.dynmsl.com/api/public';

    return NextResponse.json({
      success: true,
      configId: config._id,
      targetEmail: config.targetEmail,
      password: obfuscate(config.password), // Obfuscated
      maxCount: config.maxCount, // Added maxCount
      remainingChecks,
      remainingMs,
      tempToken: obfuscate(tempToken), // Obfuscated
      baseUrl,
    });
  } catch (err: unknown) {
    console.error('Share link error:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    
    let config = await EmailConfig.findOne({ shareId: id });
    if (!config && mongoose.isValidObjectId(id)) {
      config = await EmailConfig.findById(id);
    }

    if (!config) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (config.receivedCount < config.maxCount) {
      config.receivedCount += 1;
      await config.save();
    }

    return NextResponse.json({ success: true, receivedCount: config.receivedCount });
  } catch (err) {
    console.error('Confirm error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

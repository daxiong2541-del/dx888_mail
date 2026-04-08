import dbConnect from '@/lib/db';
import User from '@/models/User';

export type AuthedUser = {
  _id: string;
  username: string;
  isAdmin: boolean;
};

export async function getUserById(userId: string): Promise<AuthedUser | null> {
  await dbConnect();
  const user = await User.findById(userId).lean();
  if (!user) return null;
  return {
    _id: String(user._id),
    username: String(user.username),
    isAdmin: Boolean(user.isAdmin),
  };
}

export function isDynmslEmail(email: string) {
  return /@dynmsl\.com$/i.test(email);
}

export function parseEmails(input: string): string[] {
  const lines = input
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean);
  const unique = new Set<string>();
  for (const line of lines) {
    let email = '';
    if (line.includes('----')) {
      email = line.split('----')[0].trim().toLowerCase();
    } else {
      email = line.split(/[:\t\s,;]+/)[0].trim().toLowerCase();
    }
    
    if (isDynmslEmail(email)) {
      unique.add(email);
    }
  }
  return Array.from(unique);
}

export function parseEmailsWithPasswords(input: string): { email: string; password?: string }[] {
  const lines = input.split(/\r?\n/).map(v => v.trim()).filter(Boolean);
  const result: { email: string; password?: string }[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    // Support email----password, email:password, email<TAB>password, or just email
    let parts: string[] = [];
    if (line.includes('----')) {
      parts = line.split('----');
    } else {
      parts = line.split(/[:\t\s,;]+/);
    }
    
    const email = parts[0]?.trim().toLowerCase();
    if (email && isDynmslEmail(email) && !seen.has(email)) {
      seen.add(email);
      result.push({
        email,
        password: parts[1]?.trim() || undefined
      });
    }
  }
  return result;
}

export function computeExpiresAt(durationDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + durationDays);
  return date;
}

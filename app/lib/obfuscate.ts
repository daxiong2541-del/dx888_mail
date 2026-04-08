/**
 * Simple obfuscation to prevent plain-text visibility in F12/Network tab.
 * This is NOT strong encryption, but it hides data from casual observation.
 */

export function obfuscate(str: string | undefined): string {
  if (!str) return '';
  // Base64 encode and then reverse the string
  return Buffer.from(str).toString('base64').split('').reverse().join('');
}

export function deobfuscate(str: string | undefined): string {
  if (!str) return '';
  try {
    // Reverse and then Base64 decode
    const reversed = str.split('').reverse().join('');
    return Buffer.from(reversed, 'base64').toString();
  } catch (e) {
    console.error('Failed to deobfuscate:', e);
    return '';
  }
}

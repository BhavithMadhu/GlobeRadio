import crypto from 'crypto';

const B32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encodes a Buffer or Uint8Array to a Base32 string (for secrets setup)
 */
export function base32Encode(buffer: Buffer | Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += B32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += B32_CHARS[(value << (5 - bits)) & 31];
  }
  return output;
}

/**
 * Decodes a Base32 string to a Uint8Array
 */
export function base32Decode(str: string): Uint8Array {
  const cleanStr = str.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  const len = cleanStr.length;
  const bytes = new Uint8Array(Math.floor((len * 5) / 8));
  let bits = 0;
  let value = 0;
  let index = 0;

  for (let i = 0; i < len; i++) {
    const val = B32_CHARS.indexOf(cleanStr[i]);
    if (val === -1) {
      throw new Error('Invalid Base32 character: ' + cleanStr[i]);
    }
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      bytes[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  return bytes;
}

/**
 * Generates a standard 16-character base32 secret key for Google Authenticator
 */
export function generateTOTPSecret(): string {
  const randomBytes = crypto.randomBytes(10); // 10 bytes = 80 bits, fits standard base32
  return base32Encode(randomBytes);
}

/**
 * Generates the current standard TOTP 6-digit pin for a base32 secret
 */
export function generateTOTP(secret: string, epochSeconds = Math.floor(Date.now() / 1000), timeStep = 30): string {
  const secretBytes = base32Decode(secret);
  const counter = Math.floor(epochSeconds / timeStep);

  // 8-byte big endian buffer for the counter
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(0, 0); // Upper 4 bytes
  buffer.writeUInt32BE(counter, 4); // Lower 4 bytes

  const hmac = crypto.createHmac('sha1', Buffer.from(secretBytes));
  hmac.update(buffer);
  const hmacResult = hmac.digest();

  const offset = hmacResult[hmacResult.length - 1] & 0x0f;
  const binary =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Verifies if a given OTP code is valid for the base32 secret.
 * Allows a +/- 1 time window token drift (30s grace period) for poor clock synchronization.
 */
export function verifyTOTP(secret: string, token: string): boolean {
  const cleanToken = token.trim().replace(/\s/g, '');
  if (cleanToken.length !== 6 || isNaN(Number(cleanToken))) {
    return false;
  }

  const currentEpoch = Math.floor(Date.now() / 1000);
  // Check current window, previous window, and future window to account for subtle network latency lags
  for (let drift = -1; drift <= 1; drift++) {
    const time = currentEpoch + drift * 30;
    const computed = generateTOTP(secret, time);
    if (computed === cleanToken) {
      return true;
    }
  }
  return false;
}

/**
 * Generates recovery codes (8-character lowercase letters/numbers)
 */
export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(4).toString('hex'));
  }
  return codes;
}

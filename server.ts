import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { PrismaClient } from '@prisma/client';
import QRCode from 'qrcode';
import { 
  generateTOTPSecret, 
  generateTOTP, 
  verifyTOTP, 
  generateRecoveryCodes 
} from './src/lib/totp';

const prisma = new PrismaClient();
const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory sessions store (simulating Redis/Durable store for simplicity + speed)
interface SessionData {
  userId: string;
  need2fa: boolean;
  expires: number;
}
const SESSIONS = new Map<string, SessionData>();

// Helper to encrypt/decrypt passwords using PBKDF2
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

// Session Extractor Middleware
app.use(async (req: any, res: any, next) => {
  const cookieHeader = req.headers.cookie || '';
  const cookies = cookieHeader.split(';').reduce((acc: any, c: string) => {
    const [key, val] = c.trim().split('=');
    if (key && val) acc[key] = val;
    return acc;
  }, {});

  const token = cookies['session_token'];
  if (token && SESSIONS.has(token)) {
    const session = SESSIONS.get(token)!;
    if (Date.now() < session.expires) {
      if (!session.need2fa) {
        const user = await prisma.user.findUnique({
          where: { id: session.userId },
          select: { id: true, email: true, name: true, createdAt: true }
        });
        if (user) {
          req.user = user;
          req.sessionToken = token;
        }
      } else {
        req.pending2faUserId = session.userId;
        req.sessionToken = token;
      }
    } else {
      SESSIONS.delete(token);
    }
  }
  next();
});

// Authentication APIs
app.post('/api/auth/signup', async (req: any, res: any) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const passwordHash = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name
      },
      select: { id: true, email: true, name: true, createdAt: true }
    });

    const sessionToken = crypto.randomUUID();
    SESSIONS.set(sessionToken, {
      userId: user.id,
      need2fa: false,
      expires: Date.now() + 24 * 60 * 60 * 1000 // 1 day
    });

    res.setHeader('Set-Cookie', `session_token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
    return res.status(201).json({ user, message: 'Signup successful!' });
  } catch (error: any) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

app.post('/api/auth/login', async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { twoFactorSettings: true }
    });

    console.log("Login attempt:", email);

  if (!user) {
    console.log("User not found");
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const passwordValid = verifyPassword(password, user.passwordHash);

  console.log("Password valid:", passwordValid);

  if (!passwordValid) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

    const is2faActive = user.twoFactorSettings?.enabled || false;
    const sessionToken = crypto.randomUUID();

    SESSIONS.set(sessionToken, {
      userId: user.id,
      need2fa: is2faActive,
      expires: Date.now() + 24 * 60 * 60 * 1000
    });

    res.setHeader('Set-Cookie', `session_token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);

    if (is2faActive) {
      return res.json({ 
        requiresTwoFactor: true, 
        message: 'A 2FA security code is required to complete sign-in.' 
      });
    }

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        twoFactorEnabled: false
      },
      message: 'Login successful!'
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

app.post('/api/auth/totp-challenge', async (req: any, res: any) => {
  try {
    const { code } = req.body;
    const userId = req.pending2faUserId;
    const token = req.sessionToken;

    if (!userId || !token) {
      return res.status(401).json({ error: 'No pending authenticate operation found.' });
    }

    if (!code) {
      return res.status(400).json({ error: 'Verification code is required.' });
    }

    const tfSettings = await prisma.twoFactorSettings.findUnique({
      where: { userId }
    });

    if (!tfSettings || !tfSettings.enabled) {
      return res.status(400).json({ error: '2FA settings are not setup yet.' });
    }

    const isValid = verifyTOTP(tfSettings.secret, code);
    const recoveryArray: string[] = JSON.parse(tfSettings.recoveryCodes);
    const isRecoveryMatch = recoveryArray.includes(code.toLowerCase().trim());

    if (isValid || isRecoveryMatch) {
      // Create session, mark 2FA clear
      SESSIONS.set(token, {
        userId,
        need2fa: false,
        expires: Date.now() + 24 * 60 * 60 * 1000
      });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, createdAt: true }
      });

      // If recovery code was used, consume it
      if (isRecoveryMatch) {
        const updatedRecovery = recoveryArray.filter(rc => rc !== code.toLowerCase().trim());
        await prisma.twoFactorSettings.update({
          where: { userId },
          data: { recoveryCodes: JSON.stringify(updatedRecovery) }
        });
      }

      return res.json({
        user: {
          ...user,
          twoFactorEnabled: true
        },
        message: 'Two-factor clear. Login successful!'
      });
    } else {
      return res.status(400).json({ error: 'Invalid authenticator code. Check sync and retry.' });
    }
  } catch (error: any) {
    console.error('TOTP challenge error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

app.post('/api/auth/logout', (req: any, res: any) => {
  if (req.sessionToken) {
    SESSIONS.delete(req.sessionToken);
  }
  res.setHeader('Set-Cookie', 'session_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  return res.json({ message: 'Logged out successfully.' });
});

app.get('/api/auth/status', async (req: any, res: any) => {
  if (req.user) {
    const tfSettings = await prisma.twoFactorSettings.findUnique({
      where: { userId: req.user.id }
    });
    return res.json({
      authenticated: true,
      user: {
        ...req.user,
        twoFactorEnabled: tfSettings?.enabled || false
      }
    });
  }
  if (req.pending2faUserId) {
    return res.json({
      authenticated: false,
      requiresTwoFactor: true
    });
  }
  return res.json({ authenticated: false });
});

app.post('/api/auth/reset-password', async (req: any, res: any) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const passwordHash = hashPassword(newPassword);
    await prisma.user.update({
      where: { email },
      data: { passwordHash }
    });

    return res.json({ message: 'Password reset successful!' });
  } catch (error) {
    console.error('Reset error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// Update Profile
app.put('/api/auth/profile', async (req: any, res: any) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
  try {
    const { name, password } = req.body;
    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = name;
    if (password) dataToUpdate.passwordHash = hashPassword(password);

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: dataToUpdate,
      select: { id: true, email: true, name: true, createdAt: true }
    });

    return res.json({ user, message: 'Profile updated successfully.' });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// 2FA Setup Flow API
app.get('/api/auth/2fa/setup', async (req: any, res: any) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
  try {
    // Check if 2FA is already enabled or stored
    let tfSettings = await prisma.twoFactorSettings.findUnique({
      where: { userId: req.user.id }
    });

    let secret = tfSettings?.secret || generateTOTPSecret();
    let recoveryCodes = tfSettings ? JSON.parse(tfSettings.recoveryCodes) : generateRecoveryCodes();

    if (!tfSettings) {
      tfSettings = await prisma.twoFactorSettings.create({
        data: {
          userId: req.user.id,
          secret,
          enabled: false,
          recoveryCodes: JSON.stringify(recoveryCodes)
        }
      });
    }

    // Generate standard otpauth URL
    const issuer = 'GlobeRadio';
    const label = encodeURIComponent(`${req.user.email}`);
    const otpauthUrl = `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

    // Convert otpauth URL to QR code image (Base64 Data URI)
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    res.json({
      secret,
      qrCode: qrCodeDataUrl,
      recoveryCodes
    });
  } catch (error: any) {
    console.error('2FA Setup error:', error);
    res.status(500).json({ error: 'Could not generate 2FA key.' });
  }
});

// Confirm & Enable 2FA
app.post('/api/auth/2fa/verify', async (req: any, res: any) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required.' });

    const tfSettings = await prisma.twoFactorSettings.findUnique({
      where: { userId: req.user.id }
    });

    if (!tfSettings) {
      return res.status(400).json({ error: 'Please scan the QR code first.' });
    }

    const isValid = verifyTOTP(tfSettings.secret, code);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid validator code. Check you matches and try again.' });
    }

    await prisma.twoFactorSettings.update({
      where: { userId: req.user.id },
      data: { enabled: true }
    });

    res.json({ enabled: true, message: 'Two-Factor Authentication is fully secure and enabled!' });
  } catch (error: any) {
    console.error('2FA verification error:', error);
    res.status(500).json({ error: 'Server validation error.' });
  }
});

// Disable 2FA
app.post('/api/auth/2fa/disable', async (req: any, res: any) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
  try {
    await prisma.twoFactorSettings.delete({
      where: { userId: req.user.id }
    });
    res.json({ enabled: false, message: 'Two-factor Authentication disabled.' });
  } catch (error: any) {
    console.error('2FA disable error:', error);
    res.status(500).json({ error: 'Failed to disable 2FA.' });
  }
});

// Radio Browser Proxy Search API
app.get('/api/stations/search', async (req: any, res: any) => {
  try {
    const { query, country, city, language, limit = '40' } = req.query;

    // Use default reliable servers from the Radio Browser Mirror list
    const radioBrowserUrl = 'https://de1.api.radio-browser.info/json/stations/search';
    const params = new URLSearchParams();
    
    params.append('limit', limit as string);
    params.append('order', 'clickcount');
    params.append('reverse', 'true');
    params.append('hidebroken', 'true');

    if (query) params.append('name', query as string);
    if (country) params.append('country', country as string);
    if (city) params.append('state', city as string);
    if (language) params.append('language', language as string);

    const targetUrl = `${radioBrowserUrl}?${params.toString()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(targetUrl, { signal: controller.signal })
      .then(r => r.json())
      .catch(() => null);

    clearTimeout(timeoutId);

    if (response && Array.isArray(response)) {
      // Enrich with plausible frequency labels for the UI
      const enriched = response.map((st: any, i: number) => {
        const randomFreq = (87.5 + (i * 0.4) % 20).toFixed(1);
        return {
          ...st,
          frequency: st.frequency || `${randomFreq} MHz`
        };
      });
      return res.json(enriched);
    }

    // High quality offline fallback list in case third-party API cuts out
    const defaultFallbackStations = [
      {
        changeuuid: 'fallback-1',
        stationuuid: 'fallback-1',
        name: 'Tokyo Synthwave Stream',
        url: 'https://icecast.lofi.re/lofi.ogg',
        url_resolved: 'https://icecast.lofi.re/lofi.ogg',
        favicon: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA1P7j4eSsAUBx2GxynQnN9m-O9Y5Gy7Rbce8X-TU-P26JJ1SZCqa3FIuA35jLRPITqsUrRpSjtYdgH7Z7bNBAMks_O1wr7YvA789GHexZxeO8akLFf2UlR4B2q2O6wX9lYGRZ6qB7Q3jmvseALUTh_F__Cry8F3M2ZUDrXB98Jnpw7xWo7po-rEl-W-hqwQe1z-ga3JwAhoBkADLjjT-HQFOj7sgISeVobvNyTpfjfctX-kw8JqiObDJdA6hzh0NSmcgHhxj3d-VE',
        tags: 'synthwave, cyberpunk, vaporwave, chillout',
        country: 'Japan',
        countrycode: 'JP',
        state: 'Shinjuku',
        language: 'Japanese',
        votes: 11200,
        codec: 'MP3',
        bitrate: 320,
        frequency: '102.4 MHz'
      },
      {
        changeuuid: 'fallback-2',
        stationuuid: 'fallback-2',
        name: 'Berlin Techno FM',
        url: 'https://stream.techno.fm/mp3',
        url_resolved: 'https://stream.techno.fm/mp3',
        favicon: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAAEHYcwac15ndrKFnBB1e2z8QgmeJd3TWWuayU6m-vWct5e9WWkyZmyzHTUjvhAoxSc5mKP6moS848TKUg6ISqIwq5_G8AogzcZty9bH3O1UKbORg-gG8IM5LEBrH5BvwOhhOsOL1ykPNGMnAwPuIVgMkwD5PtK1vHq6j_cmTB_HAaaphdD_irzPINj-g_FZbH8Cz7pvkHV9vuAFUUpXvnLKwc2P_Kwh5RPW6KaO-ubaUD5albVpK1FOFWQD77HV8Cvj3281SYCJM',
        tags: 'techno, industrial, electronic, deep house',
        country: 'Germany',
        countrycode: 'DE',
        state: 'Berlin',
        language: 'German',
        votes: 9481,
        codec: 'MP3',
        bitrate: 256,
        frequency: '98.4 MHz'
      },
      {
        changeuuid: 'fallback-3',
        stationuuid: 'fallback-3',
        name: 'Tokyo Jazz Fusion',
        url: 'https://stream.jazz.fm/hq',
        url_resolved: 'https://stream.jazz.fm/hq',
        favicon: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBFN70QIWIqS93TuQYwwiHIm7ZvdeAD7Q0mw0SOk4JjDrOVjhWaclSG1r5a-WxNG1ax7yk87uzUhmc1jlRXlBr-ia_0VkITFiAm4sdwCL2p2BBQphWju5AVm2pe7SNFJqmOB3RybeSxJaIQDP6iLTXXQXVQ4FcLvWATVeit4Ax4rzGd-RCjbYzwrD6TEJRt--PIUoT3gSzM-tYOv6UuwJwcfzyKWT6TH_i_B77vOCYJruQjdgThHrQ1aULpsOiT-X1mIjl00ni0kbo',
        tags: 'jazz, instrumental, fusion, lounge',
        country: 'Japan',
        countrycode: 'JP',
        state: 'Tokyo',
        language: 'Japanese',
        votes: 8210,
        codec: 'OGG',
        bitrate: 320,
        frequency: '81.3 MHz'
      },
      {
        changeuuid: 'fallback-4',
        stationuuid: 'fallback-4',
        name: 'London Public Radio',
        url: 'https://bbcmedia.ic.llnwd.net/stream/bbcmedia_radio4fm_mf_p',
        url_resolved: 'https://bbcmedia.ic.llnwd.net/stream/bbcmedia_radio4fm_mf_p',
        favicon: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCuPqNxGJHHMoYstFXARyR_jFPhhfFhm7Kq9yajaLQTnY_g-VeJbjhF61SZkBZ24QJiAD-e-dE87H7z6edRfAX1VqKLeH8V2dc31JHFz4nGnGqUwpfSNKmOL5FWK33seH7jA3AcOS2b4xuGnx07heu4ti3vcnz6PqiHzU4JARXc11GZ8_B5Gyqmey3BxR6uQ7dF4MYq0u0o6r5CYK7ken6r7mSb_5zxIrIziPrLGkrWJz-oJZJPlcJyzbzJ-afiXyQpic4tuyuuQw0',
        tags: 'talk, news, culture, public',
        country: 'United Kingdom',
        countrycode: 'GB',
        state: 'London',
        language: 'English',
        votes: 14210,
        codec: 'AAC',
        bitrate: 128,
        frequency: '102.1 MHz'
      },
      {
        changeuuid: 'fallback-5',
        changeuuid_original: 'fallback-5',
        name: 'NYC Chill Lo-Fi',
        url: 'https://stream.radiojar.com/8s5u8vyb8buvv',
        url_resolved: 'https://stream.radiojar.com/8s5u8vyb8buvv',
        favicon: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAP1gFFMXO8hOtOXYNEMVc1YI5dR4gvdALf7qUzEgO2c8TE2mfp__-7MaJHulT8U5kYX82xZdXhjJEY1o_pV-9ZeA02NgiwSYT44kqMZelD475nn24YvRP6H-n_lMTh-n6apUtRBW-bN8XVtHneEW_ILbyLDWQprDMjxzSbmUiktBp7A1MUSaJ2MkcJ8cO9xQOEYbfPeTr806Z7UvRJx2nC9zQWPzjSUSic6wnWmZLSAmxvm6kOv2POynG0oZiJsKOQ_-HvQiHFEqU',
        tags: 'lofi, hiphop, study, chill',
        country: 'United States',
        countrycode: 'US',
        state: 'New York',
        language: 'English',
        votes: 18105,
        codec: 'MP3',
        bitrate: 192,
        frequency: '90.7 MHz'
      }
    ];

    // Filter fallback list relative to active selections
    let filteredFallback = defaultFallbackStations;
    if (country) {
      filteredFallback = defaultFallbackStations.filter(
        st => st.country.toLowerCase().includes((country as string).toLowerCase())
      );
    }
    if (filteredFallback.length === 0) filteredFallback = defaultFallbackStations;

    return res.json(filteredFallback);
  } catch (error) {
    console.error('Radio search proxy error:', error);
    return res.status(500).json({ error: 'Radio search service failed.' });
  }
});

// Analytics - Start Listening Session
app.post('/api/analytics/start', async (req: any, res: any) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    const { stationId, stationName } = req.body;

    const session = await prisma.listeningSession.create({
      data: {
        userId: req.user.id,
        stationId,
        stationName,
      },
    });

    return res.json(session);
  } catch (error) {
    console.error('Start session error:', error);
    return res.status(500).json({ error: 'Failed to start session' });
  }
});

// Analytics - End Listening Session
app.post('/api/analytics/end', async (req: any, res: any) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    const { sessionId } = req.body;

    const session = await prisma.listeningSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const endedAt = new Date();

    const durationSec = Math.floor(
      (endedAt.getTime() - session.startedAt.getTime()) / 1000
    );

    const updated = await prisma.listeningSession.update({
      where: { id: sessionId },
      data: {
        endedAt,
        durationSec,
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error('End session error:', error);
    return res.status(500).json({ error: 'Failed to end session' });
  }
});

app.get('/api/analytics/summary', async (req: any, res: any) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    const sessions = await prisma.listeningSession.findMany({
      where: {
        userId: req.user.id,
      },
    });

    const totalSeconds = sessions.reduce(
      (sum, session) => sum + session.durationSec,
      0
    );

    const totalHours = Number((totalSeconds / 3600).toFixed(1));
    const totalMinutes = Math.floor(totalSeconds / 60);
    
    res.json({
    totalHours,
    totalMinutes,
    totalSessions: sessions.length,
    totalSeconds,
  });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ error: 'Failed to load analytics summary' });
  }
});

// Favorites CRUD
app.get('/api/stations/favorites', async (req: any, res: any) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
  try {
    const favorites = await prisma.favoriteStation.findMany({
      where: { userId: req.user.id }
    });
    return res.json(favorites);
  } catch (error) {
    console.error('Fetch favorites error:', error);
    return res.status(500).json({ error: 'Failed to fetch favorites.' });
  }
});

app.post('/api/stations/favorites', async (req: any, res: any) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
  try {
    const { stationId, name, url, favicon, tags, country, frequency, bitrate } = req.body;
    if (!stationId || !name || !url) {
      return res.status(400).json({ error: 'stationId, name, and url are required.' });
    }

    const fav = await prisma.favoriteStation.upsert({
      where: {
        userId_stationId: {
          userId: req.user.id,
          stationId
        }
      },
      update: {},
      create: {
        userId: req.user.id,
        stationId,
        name,
        url,
        favicon,
        tags,
        country,
        frequency,
        bitrate
      }
    });

    return res.status(201).json(fav);
  } catch (error) {
    console.error('Save favorite error:', error);
    return res.status(500).json({ error: 'Failed to save favorite.' });
  }
});

app.delete('/api/stations/favorites/:stationId', async (req: any, res: any) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
  try {
    const { stationId } = req.params;
    await prisma.favoriteStation.delete({
      where: {
        userId_stationId: {
          userId: req.user.id,
          stationId
        }
      }
    });
    return res.json({ message: 'Removed from favorites.' });
  } catch (error) {
    console.error('Delete favorite error:', error);
    return res.status(500).json({ error: 'Failed to remove favorite.' });
  }
});

// Recently Played Stream Tracking
app.get('/api/stations/recents', async (req: any, res: any) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
  try {
    const recents = await prisma.recentlyPlayed.findMany({
      where: { userId: req.user.id },
      orderBy: { playedAt: 'desc' },
      take: 12
    });
    return res.json(recents);
  } catch (error) {
    console.error('Fetch recents error:', error);
    return res.status(500).json({ error: 'Failed to fetch play history.' });
  }
});

app.post('/api/stations/recents', async (req: any, res: any) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
  try {
    const { stationId, name, url, favicon, country } = req.body;
    if (!stationId || !name || !url) {
      return res.status(400).json({ error: 'stationId, name, and url are required.' });
    }

    const recent = await prisma.recentlyPlayed.create({
      data: {
        userId: req.user.id,
        stationId,
        name,
        url,
        favicon,
        country
      }
    });

    return res.status(201).json(recent);
  } catch (error) {
    console.error('Save recent error:', error);
    return res.status(500).json({ error: 'Failed to track history.' });
  }
});

// App Stats Dashboard API
app.get('/api/stations/active-stats', (req, res) => {
  res.json({
    activeSignals: 14209 + Math.floor(Math.random() * 20) - 10,
    listeners: '248.5K',
    ping: '24ms',
    packetLoss: '0%'
  });
});

// Integrate Vite Dev Server Middleware or Static Production Build
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GlobeRadio Server boot successful on http://localhost:${PORT}`);
  });
}

startServer();

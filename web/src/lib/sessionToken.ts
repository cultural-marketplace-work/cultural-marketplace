import { jwtVerify } from 'jose';
import type { SessionUser } from './types';

export interface SessionPayload extends SessionUser {
  isLoggedIn: true;
}

export const SESSION_COOKIE_NAME = 'cm_session';

export function sessionSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET || 'dev-only-secret-fallback');
}

export async function verifySessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    if (!payload.isLoggedIn) return null;
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// Email + 6-digit code auth — fully stateless.
//
// Flow:
//   1. POST /api/auth/send-code  { email }
//      - check allowlist (Vercel Edge Config)
//      - generate code, sign a JWT with { email, codeHash, exp }, set as
//        httpOnly `atlas_pending` cookie
//      - email plaintext code via Resend
//   2. POST /api/auth/verify  { email, code }
//      - read `atlas_pending`, verify signature, hash submitted code,
//        compare. Re-check allowlist (admin may have revoked between
//        send + verify). Set the long-lived `atlas_session` cookie.
//   3. /api/auth/sign-out clears the session cookie.
//
// No database. The pending-code JWT lives in a cookie and expires in 10
// minutes; the session JWT lives 30 days.

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { isAllowed, isAdminEmail } from "./permissions";

const SESSION_COOKIE = "atlas_session";
const PENDING_COOKIE = "atlas_pending";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const CODE_TTL_SECONDS = 10 * 60; // 10 minutes

export type Session = { email: string };

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set.");
  return new TextEncoder().encode(s);
}

async function hashCode(code: string): Promise<string> {
  const buf = new TextEncoder().encode(code);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, "0");
}

export class ForbiddenError extends Error {}
export class InvalidCodeError extends Error {}

export async function createCode(rawEmail: string): Promise<string> {
  const email = rawEmail.toLowerCase().trim();
  if (!(await isAllowed(email))) {
    throw new ForbiddenError("This email is not on the allowlist.");
  }
  const code = generateCode();
  const codeHash = await hashCode(code);

  // Sign the (email, codeHash) pair into a short-lived JWT and stash it in
  // an httpOnly cookie. The user types the plaintext code in /verify; we
  // hash + compare on the server.
  const pendingToken = await new SignJWT({ email, codeHash })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${CODE_TTL_SECONDS}s`)
    .sign(secret());

  const c = await cookies();
  c.set(PENDING_COOKIE, pendingToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CODE_TTL_SECONDS,
  });

  return code;
}

export async function verifyCode(rawEmail: string, rawCode: string): Promise<void> {
  const email = rawEmail.toLowerCase().trim();
  const code = rawCode.trim();
  if (!/^\d{6}$/.test(code)) throw new InvalidCodeError("Code must be 6 digits.");

  const c = await cookies();
  const pending = c.get(PENDING_COOKIE)?.value;
  if (!pending) throw new InvalidCodeError("No code on file. Request a new one.");

  let payload: { email?: string; codeHash?: string };
  try {
    const { payload: p } = await jwtVerify(pending, secret());
    payload = p as { email?: string; codeHash?: string };
  } catch {
    c.delete(PENDING_COOKIE);
    throw new InvalidCodeError("Code expired. Request a new one.");
  }

  if (payload.email !== email) {
    throw new InvalidCodeError("Email doesn't match the address we sent the code to.");
  }

  const submittedHash = await hashCode(code);
  if (submittedHash !== payload.codeHash) {
    throw new InvalidCodeError("That code didn't match.");
  }

  // Success. Drop the pending cookie + double-check allowlist + set session.
  c.delete(PENDING_COOKIE);
  if (!(await isAllowed(email))) {
    throw new ForbiddenError("This email is no longer allowed.");
  }
  await setSessionCookie(email);
}

async function setSessionCookie(email: string): Promise<void> {
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());

  const c = await cookies();
  c.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const c = await cookies();
  c.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const c = await cookies();
  const tok = c.get(SESSION_COOKIE)?.value;
  if (!tok) return null;
  try {
    const { payload } = await jwtVerify(tok, secret());
    const email = (payload as { email?: string }).email;
    if (!email) return null;
    return { email };
  } catch {
    return null;
  }
}

// Server-side helper used by pages and route handlers.
export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new Error("Unauthorized");
  if (!(await isAllowed(s.email))) throw new Error("Unauthorized");
  return s;
}

export async function requireAdmin(): Promise<Session> {
  const s = await requireSession();
  if (!isAdminEmail(s.email)) throw new Error("Forbidden");
  return s;
}

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export type Role = "rep" | "admin";

const COOKIE_NAME = "checkproof_session";
const ALG = "HS256";

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set. Add a long random string in your environment variables."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(role: Role) {
  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSessionRole(): Promise<Role | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const role = payload.role as Role;
    if (role === "rep" || role === "admin") return role;
    return null;
  } catch {
    return null;
  }
}

export function roleCanAccess(role: Role | null, required: Role): boolean {
  if (!role) return false;
  if (role === "admin") return true; // admins can also submit
  return role === required;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;

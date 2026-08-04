import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "checkproof_session";

async function getRole(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const role = payload.role as string;
    if (role === "rep" || role === "admin") return role;
    return null;
  } catch {
    return null;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const needsRep = pathname.startsWith("/submit");
  const needsAdmin = pathname.startsWith("/dashboard");

  if (!needsRep && !needsAdmin) return NextResponse.next();

  const role = await getRole(req);

  if (needsAdmin) {
    if (role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      url.searchParams.set("area", "admin");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (needsRep) {
    if (role !== "rep" && role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      url.searchParams.set("area", "rep");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/submit/:path*", "/dashboard/:path*"],
};

import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const code = (body?.code ?? "").toString().trim();

  if (!code) {
    return NextResponse.json({ error: "Enter an access code." }, { status: 400 });
  }

  const repCode = process.env.REP_ACCESS_CODE;
  const adminCode = process.env.ADMIN_ACCESS_CODE;

  if (adminCode && code === adminCode) {
    await createSession("admin");
    return NextResponse.json({ ok: true, role: "admin" });
  }

  if (repCode && code === repCode) {
    await createSession("rep");
    return NextResponse.json({ ok: true, role: "rep" });
  }

  return NextResponse.json({ error: "Incorrect access code." }, { status: 401 });
}

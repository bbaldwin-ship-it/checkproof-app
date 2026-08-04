import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, pool } from "@/lib/db";
import { getSessionRole, roleCanAccess } from "@/lib/auth";
import { sendSubmissionNotification } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const role = await getSessionRole();
  if (!roleCanAccess(role, "rep")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  await ensureSchema();

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  const repName = (body.repName ?? "").toString().trim();
  const salesTeam = (body.salesTeam ?? "").toString().trim();
  const customerName = (body.customerName ?? "").toString().trim();
  const customerAddress = (body.customerAddress ?? "").toString().trim();
  const downPaymentAmount = (body.downPaymentAmount ?? "").toString().trim();
  const depositDate = (body.depositDate ?? "").toString().trim();
  const notes = (body.notes ?? "").toString().trim();
  const checkPhotoUrl = (body.checkPhotoUrl ?? "").toString().trim();
  const depositSlipUrl = (body.depositSlipUrl ?? "").toString().trim();

  const missing: string[] = [];
  if (!repName) missing.push("Sales rep name");
  if (!salesTeam) missing.push("Sales team name");
  if (!customerName) missing.push("Customer name");
  if (!customerAddress) missing.push("Customer address");
  if (!downPaymentAmount) missing.push("Down payment amount");
  if (!depositDate) missing.push("Deposit date");
  if (!checkPhotoUrl) missing.push("Check photo");
  if (!depositSlipUrl) missing.push("Deposit slip photo");

  if (missing.length) {
    return NextResponse.json(
      { error: `Missing required field(s): ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  // Only ever accept blob URLs from our own storage account, never arbitrary
  // client-supplied URLs.
  const blobHostPattern = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i;
  if (!blobHostPattern.test(checkPhotoUrl) || !blobHostPattern.test(depositSlipUrl)) {
    return NextResponse.json({ error: "Invalid photo upload." }, { status: 400 });
  }

  const amount = Number(downPaymentAmount.toString().replace(/[^0-9.]/g, ""));
  if (Number.isNaN(amount) || amount < 0) {
    return NextResponse.json({ error: "Down payment amount is invalid." }, { status: 400 });
  }

  const result = await pool.query(
    `INSERT INTO submissions
      (rep_name, sales_team, customer_name, customer_address, down_payment_amount, deposit_date, check_photo_url, deposit_slip_url, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id`,
    [
      repName,
      salesTeam,
      customerName,
      customerAddress,
      amount,
      depositDate,
      checkPhotoUrl,
      depositSlipUrl,
      notes || null,
    ]
  );

  // Notify the team distribution list. Failures here are logged and
  // swallowed inside sendSubmissionNotification so a flaky email provider
  // never prevents the submission itself from succeeding.
  await sendSubmissionNotification({
    repName,
    salesTeam,
    customerName,
    customerAddress,
    downPaymentAmount: amount,
    depositDate,
    checkPhotoUrl,
    depositSlipUrl,
    notes: notes || null,
  });

  return NextResponse.json({ ok: true, id: result.rows[0].id });
}

export async function GET(req: NextRequest) {
  const role = await getSessionRole();
  if (!roleCanAccess(role, "admin")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  await ensureSchema();

  const url = new URL(req.url);
  const search = url.searchParams.get("q")?.trim();

  let query = `SELECT * FROM submissions`;
  const params: unknown[] = [];

  if (search) {
    query += ` WHERE rep_name ILIKE $1 OR sales_team ILIKE $1 OR customer_name ILIKE $1 OR customer_address ILIKE $1`;
    params.push(`%${search}%`);
  }

  query += ` ORDER BY created_at DESC LIMIT 500`;

  const result = await pool.query(query, params);
  return NextResponse.json({ submissions: result.rows });
}

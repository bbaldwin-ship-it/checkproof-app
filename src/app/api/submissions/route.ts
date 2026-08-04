import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { ensureSchema, pool } from "@/lib/db";
import { getSessionRole, roleCanAccess } from "@/lib/auth";

export const runtime = "nodejs";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp", "application/pdf"];
const MAX_BYTES = 15 * 1024 * 1024; // 15MB

export async function POST(req: NextRequest) {
  const role = await getSessionRole();
  if (!roleCanAccess(role, "rep")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  await ensureSchema();

  const form = await req.formData();

  const repName = (form.get("repName") ?? "").toString().trim();
  const salesTeam = (form.get("salesTeam") ?? "").toString().trim();
  const customerName = (form.get("customerName") ?? "").toString().trim();
  const customerAddress = (form.get("customerAddress") ?? "").toString().trim();
  const downPaymentAmount = (form.get("downPaymentAmount") ?? "").toString().trim();
  const depositDate = (form.get("depositDate") ?? "").toString().trim();
  const notes = (form.get("notes") ?? "").toString().trim();
  const checkPhoto = form.get("checkPhoto");
  const depositSlip = form.get("depositSlip");

  const missing: string[] = [];
  if (!repName) missing.push("Sales rep name");
  if (!salesTeam) missing.push("Sales team name");
  if (!customerName) missing.push("Customer name");
  if (!customerAddress) missing.push("Customer address");
  if (!downPaymentAmount) missing.push("Down payment amount");
  if (!depositDate) missing.push("Deposit date");
  if (!(checkPhoto instanceof File) || checkPhoto.size === 0) missing.push("Check photo");
  if (!(depositSlip instanceof File) || depositSlip.size === 0) missing.push("Deposit slip photo");

  if (missing.length) {
    return NextResponse.json(
      { error: `Missing required field(s): ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  const amount = Number(downPaymentAmount.replace(/[^0-9.]/g, ""));
  if (Number.isNaN(amount) || amount < 0) {
    return NextResponse.json({ error: "Down payment amount is invalid." }, { status: 400 });
  }

  for (const [label, file] of [
    ["Check photo", checkPhoto],
    ["Deposit slip photo", depositSlip],
  ] as const) {
    const f = file as File;
    if (!ALLOWED_TYPES.includes(f.type)) {
      return NextResponse.json(
        { error: `${label} must be an image (JPG/PNG/HEIC/WEBP) or PDF.` },
        { status: 400 }
      );
    }
    if (f.size > MAX_BYTES) {
      return NextResponse.json({ error: `${label} is too large (max 15MB).` }, { status: 400 });
    }
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "File storage is not configured (missing BLOB_READ_WRITE_TOKEN)." },
      { status: 500 }
    );
  }

  const stamp = Date.now();
  const safeCustomer = customerName.replace(/[^a-z0-9]+/gi, "-").slice(0, 40);

  const [checkBlob, slipBlob] = await Promise.all([
    put(
      `checks/${stamp}-${safeCustomer}-check.${extFor(checkPhoto as File)}`,
      checkPhoto as File,
      { access: "public" }
    ),
    put(
      `checks/${stamp}-${safeCustomer}-deposit-slip.${extFor(depositSlip as File)}`,
      depositSlip as File,
      { access: "public" }
    ),
  ]);

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
      checkBlob.url,
      slipBlob.url,
      notes || null,
    ]
  );

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

function extFor(file: File): string {
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/heic") return "heic";
  if (file.type === "image/heif") return "heif";
  if (file.type === "application/pdf") return "pdf";
  return "bin";
}

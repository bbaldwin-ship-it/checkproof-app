import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSessionRole, roleCanAccess } from "@/lib/auth";

export const runtime = "nodejs";

const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/heic",
    "image/heif",
    "image/webp",
    "application/pdf",
  ];
const MAX_BYTES = 15 * 1024 * 1024; // 15MB per file

// Issues short-lived client tokens so the browser can upload check/deposit
// slip photos directly to Vercel Blob storage, bypassing the serverless
// function's request body size limit entirely.
export async function POST(req: NextRequest) {
    const role = await getSessionRole();
    if (!roleCanAccess(role, "rep")) {
          return NextResponse.json({ error: "Not authorized." }, { status: 401 });
    }

  const body = (await req.json()) as HandleUploadBody;

  try {
        const jsonResponse = await handleUpload({
                body,
                request: req,
                onBeforeGenerateToken: async () => {
                          return {
                                      allowedContentTypes: ALLOWED_TYPES,
                                      maximumSizeInBytes: MAX_BYTES,
                                      addRandomSuffix: true,
                          };
                },
        });

      return NextResponse.json(jsonResponse);
  } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Upload failed." },
          { status: 400 }
              );
  }
}

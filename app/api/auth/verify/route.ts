import { NextResponse } from "next/server";
import { verifyCode, ForbiddenError, InvalidCodeError } from "@/lib/auth";
import { getUserRecord } from "@/lib/permissions";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { email?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const email = String(body.email ?? "").trim().toLowerCase();
  const code = String(body.code ?? "").trim();
  if (!email || !code) {
    return NextResponse.json({ error: "Email and code are required." }, { status: 400 });
  }

  try {
    await verifyCode(email, code);
    const record = await getUserRecord(email);
    return NextResponse.json({
      ok: true,
      name: record?.name ?? null,
      needsName: !record?.name,
    });
  } catch (err) {
    if (err instanceof InvalidCodeError || err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[atlas] verify error", err);
    return NextResponse.json({ error: "Could not verify code." }, { status: 500 });
  }
}

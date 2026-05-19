import { NextResponse } from "next/server";
import { createCode, ForbiddenError } from "@/lib/auth";
import { sendSignInCodeEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    const code = await createCode(email);
    await sendSignInCodeEmail(email, code);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ForbiddenError) {
      // Generic message — don't leak whether the address is on the allowlist.
      return NextResponse.json(
        { error: "If this address has access, a code is on its way." },
        { status: 403 },
      );
    }
    console.error("[atlas] send-code error", err);
    return NextResponse.json(
      { error: "Couldn't send code. Try again in a moment." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { setUserName } from "@/lib/permissions";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  try {
    const row = await setUserName(session.email, name);
    return NextResponse.json({ ok: true, name: row.name });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? "Could not save name." },
      { status: 400 },
    );
  }
}

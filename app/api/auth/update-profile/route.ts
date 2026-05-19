import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { updateUserProfile } from "@/lib/permissions";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string; profilePictureUrl?: string; timezone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const name = body.name !== undefined ? String(body.name ?? "").trim() : undefined;
  const profilePictureUrl =
    body.profilePictureUrl !== undefined
      ? String(body.profilePictureUrl ?? "").trim()
      : undefined;
  const timezone = body.timezone !== undefined ? String(body.timezone ?? "").trim() : undefined;

  try {
    const row = await updateUserProfile(session.email, {
      name,
      profilePictureUrl,
      timezone,
    });
    return NextResponse.json({
      ok: true,
      name: row.name,
      profilePictureUrl: row.profilePictureUrl,
      timezone: row.timezone,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? "Could not save profile preferences." },
      { status: 400 },
    );
  }
}

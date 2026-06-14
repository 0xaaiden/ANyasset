import { NextResponse } from "next/server";
import { resolveEnsProfile } from "@/lib/ens";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") ?? undefined;
  if (!name) {
    return NextResponse.json({ error: "Missing ENS name" }, { status: 400 });
  }

  const profile = await resolveEnsProfile(name);
  return NextResponse.json({ profile });
}

import { NextResponse } from "next/server";
import { getArcUsdcBalance } from "@/lib/arc";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  try {
    const balance = await getArcUsdcBalance(address);
    return NextResponse.json({ balance });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read Arc balance" },
      { status: 400 }
    );
  }
}

import { NextResponse } from "next/server";
import { isHex } from "viem";

type CircleAttestationResponse = {
  status?: "pending" | "complete";
  attestation?: string;
  message?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const messageHash = searchParams.get("messageHash");

  if (!messageHash || !isHex(messageHash) || messageHash.length !== 66) {
    return NextResponse.json({ error: "Invalid CCTP message hash" }, { status: 400 });
  }

  const response = await fetch(
    `https://iris-api.circle.com/v2/attestations/${messageHash}`,
    { cache: "no-store" }
  );
  const body = (await response.json()) as CircleAttestationResponse;

  if (!response.ok) {
    return NextResponse.json(
      { error: body.message || "Could not fetch CCTP attestation" },
      { status: response.status }
    );
  }

  return NextResponse.json({
    status: body.status || "pending",
    attestation: body.attestation
  });
}

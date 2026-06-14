import { NextResponse } from "next/server";
import { isHex } from "viem";

type CircleMessage = {
  status?: string;
  attestation?: string | null;
  message?: string | null;
};

type CircleMessagesResponse = {
  messages?: CircleMessage[];
  message?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sourceDomain = searchParams.get("sourceDomain");
  const transactionHash = searchParams.get("transactionHash");

  if (!sourceDomain || !/^\d+$/.test(sourceDomain)) {
    return NextResponse.json({ error: "Invalid CCTP source domain" }, { status: 400 });
  }

  if (!transactionHash || !isHex(transactionHash) || transactionHash.length !== 66) {
    return NextResponse.json({ error: "Invalid CCTP burn transaction hash" }, { status: 400 });
  }

  const irisApiUrl = process.env.CCTP_IRIS_API_URL || "https://iris-api-sandbox.circle.com";
  const response = await fetch(
    `${irisApiUrl}/v2/messages/${sourceDomain}?transactionHash=${transactionHash}`,
    { cache: "no-store" }
  );
  const text = await response.text();
  let body: CircleMessagesResponse = {};
  if (text) {
    try {
      body = JSON.parse(text) as CircleMessagesResponse;
    } catch {
      body = { message: text };
    }
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: body.message || "Could not fetch CCTP attestation" },
      { status: response.status }
    );
  }

  const message = body.messages?.[0];
  const attestation = message?.attestation;
  const isComplete = Boolean(attestation && attestation !== "PENDING" && isHex(attestation));

  return NextResponse.json({
    status: isComplete ? "complete" : "pending",
    attestation: isComplete ? attestation : undefined,
    message: message?.message || undefined,
    irisStatus: message?.status
  });
}

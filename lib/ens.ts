import "server-only";

import { JsonRpcProvider } from "ethers";
import type { EnsProfile } from "@/lib/types";

const DEFAULT_ETHEREUM_RPC = "https://ethereum-rpc.publicnode.com";

const ENS_TEXT_KEYS = [
  "avatar",
  "description",
  "url",
  "com.twitter",
  "com.github",
  "anyasset:checkout",
  "anyasset:settlement"
] as const;

function normalizeImageUrl(value?: string | null) {
  if (!value) {
    return null;
  }
  if (value.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${value.replace("ipfs://", "")}`;
  }
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return null;
}

function hasTextRecords(profile: EnsProfile) {
  return Object.values(profile.records).some(Boolean);
}

async function resolveEnsProfileWithProvider(
  normalized: string,
  provider: JsonRpcProvider
): Promise<EnsProfile> {
    const [resolvedAddress, resolver] = await Promise.all([
      provider.resolveName(normalized),
      provider.getResolver(normalized)
    ]);

    const entries = await Promise.all(
      ENS_TEXT_KEYS.map(async (key) => {
        if (!resolver) {
          return [key, null] as const;
        }
        try {
          const value = await resolver.getText(key);
          return [key, value || null] as const;
        } catch {
          return [key, null] as const;
        }
      })
    );

    const records = Object.fromEntries(entries);

    return {
      name: normalized,
      resolvedAddress,
      avatar: normalizeImageUrl(records.avatar),
      description: records.description,
      url: records.url,
      twitter: records["com.twitter"],
      github: records["com.github"],
      checkout: records["anyasset:checkout"],
      settlement: records["anyasset:settlement"],
      records
    };
}

export async function resolveEnsProfile(name?: string): Promise<EnsProfile | undefined> {
  if (!name) {
    return undefined;
  }

  const trimmed = name.trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return undefined;
  }

  const normalized = trimmed.toLowerCase();
  const rpcUrls = Array.from(
    new Set([process.env.ETHEREUM_RPC_URL, DEFAULT_ETHEREUM_RPC].filter(Boolean))
  );
  let fallbackProfile: EnsProfile | undefined;

  for (const rpcUrl of rpcUrls) {
    try {
      const profile = await resolveEnsProfileWithProvider(
        normalized,
        new JsonRpcProvider(rpcUrl)
      );

      if (hasTextRecords(profile)) {
        return profile;
      }

      fallbackProfile = profile;
  } catch (error) {
      fallbackProfile ??= {
      name: normalized,
      records: {},
      error: error instanceof Error ? error.message : "ENS lookup failed"
    };
  }
}

  return fallbackProfile;
}

export function mergeEnsProfiles(
  liveProfile?: EnsProfile,
  storedProfile?: EnsProfile
): EnsProfile | undefined {
  if (!liveProfile) {
    return storedProfile;
  }
  if (!storedProfile) {
    return liveProfile;
  }

  return {
    ...storedProfile,
    ...liveProfile,
    resolvedAddress: liveProfile.resolvedAddress || storedProfile.resolvedAddress,
    avatar: liveProfile.avatar || storedProfile.avatar,
    description: liveProfile.description || storedProfile.description,
    url: liveProfile.url || storedProfile.url,
    twitter: liveProfile.twitter || storedProfile.twitter,
    github: liveProfile.github || storedProfile.github,
    checkout: liveProfile.checkout || storedProfile.checkout,
    settlement: liveProfile.settlement || storedProfile.settlement,
    records: {
      ...storedProfile.records,
      ...Object.fromEntries(
        Object.entries(liveProfile.records).filter(([, value]) => Boolean(value))
      )
    },
    error: liveProfile.error
  };
}

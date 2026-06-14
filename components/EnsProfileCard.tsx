import { ExternalLink, IdCard, Store } from "lucide-react";
import type { EnsProfile } from "@/lib/types";
import { shortAddress } from "@/lib/format";

const ENS_RECORD_LABELS: Record<string, string> = {
  avatar: "Avatar",
  description: "Description",
  url: "URL",
  "com.twitter": "Twitter",
  "com.github": "GitHub",
  "anyasset:checkout": "Checkout",
  "anyasset:settlement": "Settlement"
};

export function EnsProfileCard({
  profile,
  fallbackName,
  settlementAddress,
  settlementPreference
}: {
  profile?: EnsProfile;
  fallbackName?: string;
  settlementAddress?: string;
  settlementPreference?: string;
}) {
  const name = profile?.name || fallbackName || "Unclaimed merchant";
  const avatar = profile?.avatar;
  const initials = name.slice(0, 2).toUpperCase();
  const visibleRecords = Object.entries(profile?.records ?? {}).filter(([, value]) => Boolean(value));

  return (
    <div className="form-card">
      <div className="profile-card">
        <div className="avatar">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt={`${name} avatar`} />
          ) : (
            <Store size={24} aria-hidden="true" />
          )}
        </div>
        <div className="stack">
          <div>
            <p className="muted">ENS merchant identity</p>
            <h3>{name || initials}</h3>
          </div>
          <p className="muted">
            {profile?.description ||
              "Portable checkout profile using ENS records for identity and metadata."}
          </p>
        </div>
      </div>

      <div className="receipt-grid">
        <div className="receipt-item">
          <p className="muted">Resolved address</p>
          <strong className="address mono">
            {shortAddress(profile?.resolvedAddress || settlementAddress)}
          </strong>
        </div>
        <div className="receipt-item">
          <p className="muted">Settlement preference</p>
          <strong>{profile?.settlement || settlementPreference || "USDC settlement"}</strong>
        </div>
        {profile?.twitter ? (
          <div className="receipt-item">
            <p className="muted">Twitter text record</p>
            <strong>@{profile.twitter}</strong>
          </div>
        ) : null}
        {profile?.github ? (
          <div className="receipt-item">
            <p className="muted">GitHub text record</p>
            <strong>{profile.github}</strong>
          </div>
        ) : null}
      </div>

      {profile?.url ? (
        <a className="button secondary" href={profile.url} target="_blank" rel="noreferrer">
          <ExternalLink size={16} aria-hidden="true" />
          Merchant site
        </a>
      ) : null}

      {visibleRecords.length ? (
        <div className="asset-details">
          {visibleRecords.map(([key, value]) => (
            <div key={key}>
              <span className="muted">{ENS_RECORD_LABELS[key] || key}</span>
              <strong className="address mono">{value}</strong>
            </div>
          ))}
        </div>
      ) : null}

      {profile?.error ? (
        <p className="error">
          <IdCard size={14} aria-hidden="true" /> ENS lookup note: {profile.error}
        </p>
      ) : null}
    </div>
  );
}

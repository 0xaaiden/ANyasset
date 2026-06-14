import { ExternalLink, IdCard, Store } from "lucide-react";
import type { EnsProfile } from "@/lib/types";
import { shortAddress } from "@/lib/format";

export function EnsProfileCard({
  profile,
  fallbackName,
  settlementAddress
}: {
  profile?: EnsProfile;
  fallbackName?: string;
  settlementAddress?: string;
}) {
  const name = profile?.name || fallbackName || "Unclaimed merchant";
  const avatar = profile?.avatar;
  const initials = name.slice(0, 2).toUpperCase();

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
          <strong>{profile?.settlement || "USDC on Arc Testnet"}</strong>
        </div>
      </div>

      {profile?.url ? (
        <a className="button secondary" href={profile.url} target="_blank" rel="noreferrer">
          <ExternalLink size={16} aria-hidden="true" />
          Merchant site
        </a>
      ) : null}

      {profile?.error ? (
        <p className="error">
          <IdCard size={14} aria-hidden="true" /> ENS lookup note: {profile.error}
        </p>
      ) : null}
    </div>
  );
}

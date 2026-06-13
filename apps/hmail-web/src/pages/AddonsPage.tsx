import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { AddonCard } from "../components/AddonCard";
import { HMailLogo } from "../components/HMailLogo";
import { useAddons } from "../context/AddonContext";
import { useAuth } from "../context/AuthContext";
import { ADDON_GROUP_LABELS, ADDON_GROUP_ORDER, type AddonGroup } from "../types/addon";
import "./AddonsPage.css";

export function AddonsPage() {
  const { user, logout } = useAuth();
  const { addons, loading, error, startTrial, refresh } = useAddons();
  const [startingSlug, setStartingSlug] = useState<string | null>(null);
  const [trialError, setTrialError] = useState("");
  const [searchParams] = useSearchParams();
  const highlight = searchParams.get("highlight");

  useEffect(() => {
    if (!highlight) return;
    const el = document.getElementById(`addon-${highlight}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlight, addons.length]);

  const branding = user?.tenant.branding;

  const grouped = useMemo(() => {
    const map = new Map<AddonGroup, typeof addons>();
    for (const group of ADDON_GROUP_ORDER) {
      map.set(
        group,
        addons.filter((a) => a.group === group),
      );
    }
    return map;
  }, [addons]);

  const onStartTrial = async (slug: string) => {
    setTrialError("");
    setStartingSlug(slug);
    try {
      await startTrial(slug);
    } catch (err) {
      setTrialError(err instanceof ApiError ? err.message : "Could not start trial");
    } finally {
      setStartingSlug(null);
    }
  };

  return (
    <div
      className="addons-page"
      style={
        branding
          ? ({
              "--brand-primary": branding.primaryColor,
              "--brand-accent": branding.accentColor,
            } as React.CSSProperties)
          : undefined
      }
    >
      <header className="addons-topbar">
        <div className="addons-topbar-start">
          <Link to="/" className="addons-back-link">
            ← Back to mail
          </Link>
          <HMailLogo size="sm" showWordmark subtitle={user?.tenant.name} />
        </div>
        <div className="addons-topbar-end">
          <span className="addons-user">{user?.email}</span>
          <button type="button" className="addons-signout" onClick={() => logout()}>
            Sign out
          </button>
        </div>
      </header>

      <main className="addons-main">
        <section className="addons-hero">
          <p className="addons-kicker">Immigration practice add-ons</p>
          <h1>Add-ons marketplace</h1>
          <p>
            Extend PMail+ with IRCC-focused tools for Canadian immigration professionals. All add-ons are{" "}
            <strong>free</strong> with a <strong>7-day trial</strong> to activate features. AI tools are coming
            soon.
          </p>
          <button type="button" className="addons-refresh" onClick={() => void refresh()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh status"}
          </button>
        </section>

        {(error || trialError) ? (
          <div className="addons-error" role="alert">
            {trialError || error}
          </div>
        ) : null}

        {loading && addons.length === 0 ? (
          <p className="addons-loading">Loading add-ons…</p>
        ) : (
          ADDON_GROUP_ORDER.map((group) => {
            const items = grouped.get(group) ?? [];
            if (items.length === 0) return null;

            return (
              <section key={group} className="addons-section">
                <h2>{ADDON_GROUP_LABELS[group]}</h2>
                <div className="addons-grid">
                  {items.map((addon) => (
                    <div
                      key={addon.slug}
                      id={`addon-${addon.slug}`}
                      className={highlight === addon.slug ? "addons-highlight" : undefined}
                    >
                      <AddonCard
                        addon={addon}
                        starting={startingSlug === addon.slug}
                        onStartTrial={onStartTrial}
                      />
                    </div>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </main>
    </div>
  );
}

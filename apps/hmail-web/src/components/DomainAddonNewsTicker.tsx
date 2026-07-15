import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { isSoftwireAccountantEmail } from "../utils/tenantUi";
import "./DomainAddonNewsTicker.css";

const ONOSE_IMMIGRATION_DOMAIN = "onoseimmigration.com";

type TickerItem = {
  id: string;
  text: string;
  href?: string;
};

const ACCOUNTING_ADS: TickerItem[] = [
  {
    id: "doc-intake",
    text: "Document Intake For Accountant — Simplify in PMail+",
    href: "/addons?highlight=ac-document-intake",
  },
  {
    id: "calendar",
    text: "Never Miss the next filing date — Use PMail's Calendar Addon",
    href: "/addons?highlight=full-calendar-functionality",
  },
  {
    id: "reminders",
    text: "Be reminded about the next payment — Try PMail+ Reminder Addon",
    href: "/addons",
  },
  {
    id: "documents",
    text: "PMail+ Organizes every attached document — Explore the Documents Addon",
    href: "/addons?highlight=file-vault-functionality",
  },
];

const IMMIGRATION_ADS: TickerItem[] = [
  {
    id: "case-docs",
    text: "Keep client case files organized — Explore PMail+ Documents",
    href: "/addons?highlight=file-vault-functionality",
  },
  {
    id: "deadlines",
    text: "Never miss an IRCC deadline — Use PMail's Calendar Addon",
    href: "/addons?highlight=full-calendar-functionality",
  },
  {
    id: "retainers",
    text: "Stay on top of retainer renewals — Try PMail+ Reminder Addon",
    href: "/addons",
  },
  {
    id: "intake",
    text: "Intake client paperwork faster — Simplify with PMail+ Document tools",
    href: "/addons?highlight=file-vault-functionality",
  },
];

const MARKETPLACE_ITEM: TickerItem = {
  id: "marketplace",
  text: "Visit PMail+ Marketplace",
  href: "/addons",
};

const WAIT_MS = 5000;
const SHOW_MS = 3000;
const FADE_MS = 400;

function isOnoseImmigrationEmail(email: string | null | undefined): boolean {
  const normalized = email?.trim().toLowerCase() ?? "";
  return normalized.endsWith(`@${ONOSE_IMMIGRATION_DOMAIN}`);
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = next[i]!;
    next[i] = next[j]!;
    next[j] = tmp;
  }
  return next;
}

function resolveTickerAds(email: string | null | undefined): TickerItem[] | null {
  if (isSoftwireAccountantEmail(email)) return ACCOUNTING_ADS;
  if (isOnoseImmigrationEmail(email)) return IMMIGRATION_ADS;
  return null;
}

type DomainAddonNewsTickerProps = {
  email: string | null | undefined;
};

export function DomainAddonNewsTicker({ email }: DomainAddonNewsTickerProps) {
  const ads = useMemo(() => resolveTickerAds(email), [email]);
  const [visible, setVisible] = useState(false);
  const [item, setItem] = useState<TickerItem | null>(null);
  const queueRef = useRef<TickerItem[]>([]);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    if (!ads) return;

    let cancelled = false;
    const clearTimers = () => {
      for (const id of timersRef.current) window.clearTimeout(id);
      timersRef.current = [];
    };

    const schedule = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        if (cancelled) return;
        fn();
      }, ms);
      timersRef.current.push(id);
    };

    const refillQueue = () => {
      queueRef.current = [...shuffle(ads), MARKETPLACE_ITEM];
    };

    const showNext = () => {
      if (queueRef.current.length === 0) refillQueue();
      const next = queueRef.current.shift() ?? MARKETPLACE_ITEM;
      setItem(next);
      setVisible(true);
      schedule(() => {
        setVisible(false);
        schedule(showNext, WAIT_MS);
      }, SHOW_MS + FADE_MS);
    };

    refillQueue();
    schedule(showNext, WAIT_MS);

    return () => {
      cancelled = true;
      clearTimers();
    };
  }, [ads]);

  if (!ads || !item) return null;

  return (
    <div className="domain-addon-news-ticker" aria-live="polite">
      <div
        className={`domain-addon-news-ticker-slide${visible ? " is-visible" : ""}`}
        key={item.id}
      >
        {item.href ? (
          <Link to={item.href} className="domain-addon-news-ticker-link">
            {item.text}
          </Link>
        ) : (
          <span>{item.text}</span>
        )}
      </div>
    </div>
  );
}

export function shouldShowDomainAddonNewsTicker(email: string | null | undefined): boolean {
  return resolveTickerAds(email) != null;
}

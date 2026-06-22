import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api/client";
import type { MarketingLead, TenantAdmin } from "../../types/site";
import { ADMIN_NAV, ADMIN_TAB_META, type AdminTab } from "./adminNav";
import "./AdminDashboard.css";

export type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  onNavigate: (tab: AdminTab) => void;
  tenants: TenantAdmin[];
  onOpenCommandPalette?: () => void;
};

type CommandItem = {
  id: string;
  label: string;
  sublabel?: string;
  group: string;
  action: () => void;
};

export function AdminCommandPalette({ open, onClose, onNavigate, tenants }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [leadHits, setLeadHits] = useState<MarketingLead[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setLeadHits([]);
      setActiveIndex(0);
      return;
    }
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setLeadHits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void api.adminLeads({ q }).then((res) => setLeadHits(res.leads.slice(0, 6)));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [query, open]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list: CommandItem[] = [];

    for (const group of ADMIN_NAV) {
      for (const item of group.items) {
        const meta = ADMIN_TAB_META[item.id];
        const hay = `${item.label} ${meta.title} ${meta.description}`.toLowerCase();
        if (!q || hay.includes(q)) {
          list.push({
            id: `nav-${item.id}`,
            label: item.label,
            sublabel: meta.title,
            group: "Navigate",
            action: () => {
              onNavigate(item.id);
              onClose();
            },
          });
        }
      }
    }

    for (const tenant of tenants) {
      const hay = `${tenant.name} ${tenant.slug}`.toLowerCase();
      if (!q || hay.includes(q)) {
        list.push({
          id: `tenant-${tenant.id}`,
          label: tenant.name,
          sublabel: tenant.slug,
          group: "Tenants",
          action: () => {
            onNavigate("tenants");
            onClose();
          },
        });
      }
    }

    for (const lead of leadHits) {
      list.push({
        id: `lead-${lead.id}`,
        label: lead.fullName,
        sublabel: `${lead.company} · ${lead.email}`,
        group: "Leads",
        action: () => {
          onNavigate("sales-pipeline");
          onClose();
        },
      });
    }

    if (!q || "system status health infrastructure".includes(q)) {
      list.push({
        id: "action-system",
        label: "Open system status",
        group: "Actions",
        action: () => {
          onNavigate("system");
          onClose();
        },
      });
    }

    if (!q || "billing revenue mrr payments".includes(q)) {
      list.push({
        id: "action-billing",
        label: "Open billing & revenue",
        group: "Actions",
        action: () => {
          onNavigate("billing");
          onClose();
        },
      });
    }

    return list;
  }, [query, tenants, leadHits, onNavigate, onClose]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, items.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && items[activeIndex]) {
        e.preventDefault();
        items[activeIndex].action();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, activeIndex, onClose]);

  if (!open) return null;

  const grouped = items.reduce<Record<string, CommandItem[]>>((acc, item) => {
    acc[item.group] ??= [];
    acc[item.group].push(item);
    return acc;
  }, {});

  let rowIndex = -1;

  return (
    <div className="admin-command-overlay" onClick={onClose} role="presentation">
      <div className="admin-command-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Command palette">
        <div className="admin-command-input-wrap">
          <span className="admin-command-kbd">⌘K</span>
          <input
            ref={inputRef}
            type="search"
            placeholder="Search pages, tenants, leads…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="admin-command-results">
          {items.length === 0 ? (
            <p className="muted admin-command-empty">No matches.</p>
          ) : (
            Object.entries(grouped).map(([group, groupItems]) => (
              <div key={group} className="admin-command-group">
                <div className="admin-command-group-label">{group}</div>
                {groupItems.map((item) => {
                  rowIndex++;
                  const idx = rowIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`admin-command-item${idx === activeIndex ? " active" : ""}`}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={item.action}
                    >
                      <span>{item.label}</span>
                      {item.sublabel ? <span className="muted">{item.sublabel}</span> : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function useCommandPaletteShortcut(onOpen: () => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpen();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpen]);
}

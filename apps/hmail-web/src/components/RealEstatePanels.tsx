import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import "./MailViews.css";

type RealEstateLane = "listings" | "showings" | "templates" | "deals";
type StatTone = "accent" | "warn" | "ok" | "alert";

function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await loader());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

function formatStatusLabel(value: string): string {
  return value.replaceAll("_", " ");
}

function formatPrice(cents: number | null): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
}

function RealEstateToolShell({
  lane,
  eyebrow,
  title,
  description,
  stats,
  children,
}: {
  lane: RealEstateLane;
  eyebrow: string;
  title: string;
  description: string;
  stats: Array<{ label: string; value: string | number; tone?: StatTone }>;
  children: ReactNode;
}) {
  return (
    <div className={`mail-view-panel industry-ws-tool-shell industry-ws-tool-shell--${lane}`}>
      <header className="industry-ws-hero">
        <div className="industry-ws-hero-copy">
          <span className="industry-ws-eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="industry-ws-vitals-strip" aria-label="Workspace metrics">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`industry-ws-vital-chip${stat.tone ? ` industry-ws-vital-chip--${stat.tone}` : ""}`}
            >
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </header>
      {children}
    </div>
  );
}

function RealEstateEmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="industry-ws-empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function RealEstateSectionHead({
  code,
  title,
  description,
}: {
  code: string;
  title: string;
  description: string;
}) {
  return (
    <div className="industry-ws-section-head">
      <span>{code}</span>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

function RealEstateStatusPill({ label, tone }: { label: string; tone?: StatTone }) {
  return <span className={`industry-ws-status-pill${tone ? ` industry-ws-status-pill--${tone}` : ""}`}>{label}</span>;
}

export function ListingBoardPanel() {
  const { data: contacts, loading: contactsLoading, error: contactsError, refresh: refreshContacts } = useLoad(() =>
    api.reContacts().then((r) => r.contacts),
  );
  const { data: listings, loading: listingsLoading, error: listingsError, refresh: refreshListings } = useLoad(() =>
    api.reListings().then((r) => r.listings),
  );

  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [contactForm, setContactForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "seller",
  });
  const [listingForm, setListingForm] = useState({
    address: "",
    city: "",
    province: "",
    postalCode: "",
    mlsNumber: "",
    listPriceCents: "",
    sellerContactId: "",
  });

  const contactRows = contacts ?? [];
  const listingRows = listings ?? [];
  const activeListings = listingRows.filter((listing) => listing.status === "active").length;
  const pendingListings = listingRows.filter((listing) => listing.status === "pending").length;

  const createContact = async () => {
    setActionError("");
    setActionNotice("");
    try {
      if (!contactForm.firstName.trim() || !contactForm.lastName.trim()) {
        throw new Error("First and last name are required.");
      }
      await api.createReContact(contactForm);
      setContactForm({ firstName: "", lastName: "", email: "", phone: "", role: "seller" });
      setActionNotice("Contact added to the listing registry.");
      await refreshContacts();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to add contact.");
    }
  };

  const createListing = async () => {
    setActionError("");
    setActionNotice("");
    try {
      if (!listingForm.address.trim() || !listingForm.city.trim()) {
        throw new Error("Address and city are required.");
      }
      await api.createReListing({
        address: listingForm.address,
        city: listingForm.city,
        province: listingForm.province || undefined,
        postalCode: listingForm.postalCode || undefined,
        mlsNumber: listingForm.mlsNumber || undefined,
        listPriceCents: listingForm.listPriceCents ? Number(listingForm.listPriceCents) : undefined,
        sellerContactId: listingForm.sellerContactId || undefined,
      });
      setListingForm({
        address: "",
        city: "",
        province: "",
        postalCode: "",
        mlsNumber: "",
        listPriceCents: "",
        sellerContactId: "",
      });
      setActionNotice("Listing published to the board.");
      await refreshListings();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to add listing.");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await api.updateReListingStatus(id, status);
    await refreshListings();
  };

  return (
    <RealEstateToolShell
      lane="listings"
      eyebrow="Station 01 · Listing board"
      title="Property & Contact Registry"
      description="Register sellers, buyers, and agents, then track MLS numbers, list prices, and listing status across property mail threads."
      stats={[
        { label: "Contacts", value: contactRows.length },
        { label: "Active listings", value: activeListings, tone: "accent" },
        { label: "Pending", value: pendingListings, tone: pendingListings > 0 ? "warn" : "ok" },
      ]}
    >
      {(contactsError || listingsError) ? <p className="mail-view-error">{contactsError || listingsError}</p> : null}
      {actionError ? <p className="mail-view-error">{actionError}</p> : null}
      {actionNotice ? <p className="mail-view-success">{actionNotice}</p> : null}

      <div className="industry-ws-tool-layout industry-ws-tool-layout--split">
        <section className="industry-ws-intake-panel">
          <RealEstateSectionHead
            code="A"
            title="New contact"
            description="Create the seller, buyer, or agent contact used by listings and showings."
          />
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <input placeholder="First name" value={contactForm.firstName} onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })} />
            <input placeholder="Last name" value={contactForm.lastName} onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })} />
          </div>
          <input type="email" placeholder="Email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
          <input placeholder="Phone" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
          <select value={contactForm.role} onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}>
            <option value="seller">Seller</option>
            <option value="buyer">Buyer</option>
            <option value="agent">Agent</option>
          </select>
          <button type="button" className="mail-toolbar-btn industry-ws-action-btn" onClick={() => void createContact()}>
            Add contact
          </button>
        </section>

        <section className="industry-ws-intake-panel industry-ws-intake-panel--primary">
          <RealEstateSectionHead
            code="B"
            title="New listing"
            description="Publish a property with MLS details, list price, and optional seller link."
          />
          <input placeholder="Address" value={listingForm.address} onChange={(e) => setListingForm({ ...listingForm, address: e.target.value })} />
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <input placeholder="City" value={listingForm.city} onChange={(e) => setListingForm({ ...listingForm, city: e.target.value })} />
            <input placeholder="Province" value={listingForm.province} onChange={(e) => setListingForm({ ...listingForm, province: e.target.value })} />
          </div>
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <input placeholder="MLS number" value={listingForm.mlsNumber} onChange={(e) => setListingForm({ ...listingForm, mlsNumber: e.target.value })} />
            <input placeholder="List price (cents)" value={listingForm.listPriceCents} onChange={(e) => setListingForm({ ...listingForm, listPriceCents: e.target.value })} />
          </div>
          <input placeholder="Postal code" value={listingForm.postalCode} onChange={(e) => setListingForm({ ...listingForm, postalCode: e.target.value })} />
          <select value={listingForm.sellerContactId} onChange={(e) => setListingForm({ ...listingForm, sellerContactId: e.target.value })}>
            <option value="">Seller (optional)</option>
            {contactRows.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.firstName} {contact.lastName}
              </option>
            ))}
          </select>
          <button type="button" className="mail-toolbar-btn industry-ws-action-btn" onClick={() => void createListing()}>
            Add listing
          </button>
        </section>
      </div>

      {contactsLoading || listingsLoading ? <p className="mail-view-empty">Loading listing board…</p> : null}

      <section className="industry-ws-record-panel">
        <RealEstateSectionHead code="Board" title="Active listing board" description="Review property status, MLS details, and linked showing activity." />
        {listingRows.length ? (
          <div className="industry-ws-board-grid">
            {listingRows.map((listing) => (
              <article
                key={listing.id}
                className={`industry-ws-board-card${listing.status === "pending" ? " industry-ws-board-card--highlight" : ""}`}
              >
                <div className="industry-ws-board-card-top">
                  <div>
                    <span className="industry-ws-board-id">{listing.address}, {listing.city}</span>
                    {listing.sellerName ? <p className="industry-ws-board-subtitle">Seller: {listing.sellerName}</p> : null}
                  </div>
                  <RealEstateStatusPill
                    label={formatStatusLabel(listing.status)}
                    tone={listing.status === "active" ? "accent" : listing.status === "pending" ? "warn" : undefined}
                  />
                </div>
                <div className="industry-ws-meta-row">
                  <span>{listing.mlsNumber ? `MLS ${listing.mlsNumber}` : "No MLS"}</span>
                  <span>{formatPrice(listing.listPriceCents)}</span>
                </div>
                <p>
                  {listing.showingCount} showings · {listing.dealCount} deals
                </p>
                <select defaultValue={listing.status} onChange={(e) => void updateStatus(listing.id, e.target.value)}>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="sold">Sold</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
                <code className="feature-id">{listing.id}</code>
              </article>
            ))}
          </div>
        ) : (
          <RealEstateEmptyState title="No listings yet" body="Add a property listing to start tracking MLS status and buyer showings." />
        )}
      </section>
    </RealEstateToolShell>
  );
}

export function ShowingSchedulerPanel() {
  const { data: listings } = useLoad(() => api.reListings().then((r) => r.listings));
  const { data: showings, loading, error, refresh } = useLoad(() => api.reShowings().then((r) => r.showings));
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [form, setForm] = useState({
    listingId: "",
    firstName: "",
    lastName: "",
    email: "",
    scheduledAt: "",
    notes: "",
  });

  const showingRows = showings ?? [];
  const todayKey = new Date().toDateString();
  const todayCount = showingRows.filter((showing) => new Date(showing.scheduledAt).toDateString() === todayKey).length;
  const noShowCount = showingRows.filter((showing) => showing.status === "no_show").length;
  const scheduledCount = showingRows.filter((showing) => showing.status === "scheduled").length;

  const sortedShowings = useMemo(
    () => [...showingRows].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [showingRows],
  );

  const scheduleShowing = async () => {
    setActionError("");
    setActionNotice("");
    try {
      if (!form.listingId) throw new Error("Select a listing.");
      if (!form.firstName.trim() || !form.lastName.trim()) throw new Error("Buyer name is required.");
      if (!form.scheduledAt) throw new Error("Scheduled time is required.");
      await api.createReShowing({
        listingId: form.listingId,
        contact: { firstName: form.firstName, lastName: form.lastName, email: form.email || undefined },
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        notes: form.notes || undefined,
      });
      setForm({ listingId: "", firstName: "", lastName: "", email: "", scheduledAt: "", notes: "" });
      setActionNotice("Showing scheduled.");
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to schedule showing.");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await api.updateReShowingStatus(id, status);
    await refresh();
  };

  return (
    <RealEstateToolShell
      lane="showings"
      eyebrow="Station 02 · Showing scheduler"
      title="Tour Schedule Console"
      description="Book property tours, monitor today's queue, and track buyer attendance and no-shows."
      stats={[
        { label: "Today", value: todayCount, tone: "accent" },
        { label: "Scheduled", value: scheduledCount },
        { label: "No-shows", value: noShowCount, tone: noShowCount > 0 ? "warn" : "ok" },
      ]}
    >
      {error ? <p className="mail-view-error">{error}</p> : null}
      {actionError ? <p className="mail-view-error">{actionError}</p> : null}
      {actionNotice ? <p className="mail-view-success">{actionNotice}</p> : null}

      <div className="industry-ws-tool-layout industry-ws-tool-layout--schedule">
        <section className="industry-ws-intake-panel industry-ws-intake-panel--primary">
          <RealEstateSectionHead code="Book" title="Schedule showing" description="Attach the tour to a listing and capture buyer contact plus notes." />
          <select value={form.listingId} onChange={(e) => setForm({ ...form, listingId: e.target.value })}>
            <option value="">Select listing</option>
            {(listings ?? []).map((listing) => (
              <option key={listing.id} value={listing.id}>
                {listing.address}, {listing.city}
              </option>
            ))}
          </select>
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <input placeholder="Buyer first name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <input placeholder="Buyer last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <input type="email" placeholder="Buyer email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input type="datetime-local" aria-label="Scheduled time" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
          <input placeholder="Showing notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button type="button" className="mail-toolbar-btn industry-ws-action-btn" onClick={() => void scheduleShowing()}>
            Schedule showing
          </button>
        </section>

        <section className="industry-ws-record-panel industry-ws-record-panel--timeline">
          <RealEstateSectionHead code="Queue" title="Showing timeline" description="Today's and upcoming tours sorted by scheduled time." />
          {loading ? <p className="mail-view-empty">Loading showings…</p> : null}
          {sortedShowings.length ? (
            <div className="industry-ws-timeline">
              {sortedShowings.map((showing) => {
                const scheduled = new Date(showing.scheduledAt);
                const isToday = scheduled.toDateString() === todayKey;
                const statusTone: StatTone | undefined =
                  showing.status === "no_show" ? "warn" : showing.status === "completed" ? "ok" : "accent";

                return (
                  <article key={showing.id} className={`industry-ws-timeline-card${isToday ? " industry-ws-timeline-card--today" : ""}`}>
                    <div className="industry-ws-timeline-time">
                      <strong>{scheduled.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</strong>
                      <span>{scheduled.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                    </div>
                    <div className="industry-ws-timeline-body">
                      <div className="industry-ws-board-card-top">
                        <div>
                          <span className="industry-ws-board-id">{showing.listing.address}, {showing.listing.city}</span>
                          <p className="industry-ws-board-subtitle">{showing.contactName}</p>
                        </div>
                        <RealEstateStatusPill label={formatStatusLabel(showing.status)} tone={statusTone} />
                      </div>
                      <select defaultValue={showing.status} onChange={(e) => void updateStatus(showing.id, e.target.value)}>
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="no_show">No show</option>
                      </select>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <RealEstateEmptyState title="Schedule is clear" body="Book a showing to populate the tour timeline." />
          )}
        </section>
      </div>
    </RealEstateToolShell>
  );
}

export function QuickRepliesPanel({ onUseTemplate }: { onUseTemplate: (t: { subject: string; html: string }) => void }) {
  const { data: templates, loading, error } = useLoad(() => api.reTemplates().then((r) => r.templates));
  const { data: listings } = useLoad(() => api.reListings().then((r) => r.listings));

  const templateRows = templates ?? [];
  const activeListings = (listings ?? []).filter((listing) => listing.status === "active").length;

  return (
    <RealEstateToolShell
      lane="templates"
      eyebrow="Station 03 · Quick replies"
      title="Outreach Template Library"
      description="Launch showing confirmations, offer responses, and MLS refresh notices into the compose workspace."
      stats={[
        { label: "Templates", value: templateRows.length, tone: "accent" },
        { label: "Active listings", value: activeListings },
        { label: "Categories", value: templateRows.length ? "Ready" : "—" },
      ]}
    >
      {error ? <p className="mail-view-error">{error}</p> : null}

      <section className="industry-ws-record-panel industry-ws-record-panel--templates">
        <RealEstateSectionHead code="Mail" title="Property templates" description="Pre-approved outreach for buyers, sellers, and listing updates." />
        {loading ? <p className="mail-view-empty">Loading templates…</p> : null}
        {templateRows.length ? (
          <div className="industry-ws-template-grid">
            {templateRows.map((template) => (
              <article key={template.id} className="industry-ws-template-card">
                <h3>{template.name}</h3>
                <p>{template.description}</p>
                <p className="industry-ws-template-subject">
                  <strong>Subject:</strong> {template.subject}
                </p>
                <button
                  type="button"
                  className="mail-toolbar-btn industry-ws-action-btn"
                  onClick={() => onUseTemplate({ subject: template.subject, html: template.bodyHtml })}
                >
                  Use template
                </button>
              </article>
            ))}
          </div>
        ) : (
          <RealEstateEmptyState title="No templates loaded" body="Real estate quick-reply templates will appear here once seeded for the tenant." />
        )}
      </section>
    </RealEstateToolShell>
  );
}

export function DealRoomPanel() {
  const { data: listings } = useLoad(() => api.reListings().then((r) => r.listings));
  const { data: deals, loading, error, refresh } = useLoad(() => api.reDeals().then((r) => r.deals));
  const [selectedDealId, setSelectedDealId] = useState("");
  const { data: notes, refresh: refreshNotes } = useLoad(
    () => (selectedDealId ? api.reDealNotes(selectedDealId).then((r) => r.notes) : Promise.resolve([])),
    [selectedDealId],
  );
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [dealForm, setDealForm] = useState({ listingId: "", title: "", offerAmountCents: "" });
  const [noteBody, setNoteBody] = useState("");

  const dealRows = deals ?? [];
  const openDeals = dealRows.filter((deal) => !["closed", "fallen_through"].includes(deal.status)).length;
  const negotiationCount = dealRows.filter((deal) => deal.status === "negotiation").length;

  const createDeal = async () => {
    setActionError("");
    setActionNotice("");
    try {
      if (!dealForm.listingId) throw new Error("Select a listing.");
      if (!dealForm.title.trim()) throw new Error("Deal title is required.");
      await api.createReDeal({
        listingId: dealForm.listingId,
        title: dealForm.title,
        offerAmountCents: dealForm.offerAmountCents ? Number(dealForm.offerAmountCents) : undefined,
      });
      setDealForm({ listingId: "", title: "", offerAmountCents: "" });
      setActionNotice("Deal opened in the room.");
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to open deal.");
    }
  };

  const addNote = async () => {
    if (!selectedDealId || !noteBody.trim()) return;
    await api.createReDealNote(selectedDealId, noteBody);
    setNoteBody("");
    await refreshNotes();
  };

  const updateStatus = async (id: string, status: string) => {
    await api.updateReDealStatus(id, status);
    await refresh();
  };

  const selectedDeal = dealRows.find((deal) => deal.id === selectedDealId);

  const dealStatusTone = (status: string): StatTone | undefined => {
    if (status === "negotiation") return "warn";
    if (status === "accepted") return "ok";
    if (status === "fallen_through") return "alert";
    return "accent";
  };

  return (
    <RealEstateToolShell
      lane="deals"
      eyebrow="Station 04 · Deal room"
      title="Offer & Negotiation Console"
      description="Open deals on active listings, track offer stages, and collaborate with team notes."
      stats={[
        { label: "Open deals", value: openDeals, tone: "accent" },
        { label: "In negotiation", value: negotiationCount, tone: negotiationCount > 0 ? "warn" : "ok" },
        { label: "Total pipeline", value: dealRows.length },
      ]}
    >
      {error ? <p className="mail-view-error">{error}</p> : null}
      {actionError ? <p className="mail-view-error">{actionError}</p> : null}
      {actionNotice ? <p className="mail-view-success">{actionNotice}</p> : null}

      <div className="industry-ws-tool-layout industry-ws-tool-layout--split">
        <section className="industry-ws-intake-panel industry-ws-intake-panel--primary">
          <RealEstateSectionHead code="Open" title="New deal" description="Attach an offer to a listing and set the opening amount." />
          <select value={dealForm.listingId} onChange={(e) => setDealForm({ ...dealForm, listingId: e.target.value })}>
            <option value="">Select listing</option>
            {(listings ?? []).map((listing) => (
              <option key={listing.id} value={listing.id}>
                {listing.address}, {listing.city}
              </option>
            ))}
          </select>
          <input placeholder="Deal title" value={dealForm.title} onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })} />
          <input placeholder="Offer amount (cents)" value={dealForm.offerAmountCents} onChange={(e) => setDealForm({ ...dealForm, offerAmountCents: e.target.value })} />
          <button type="button" className="mail-toolbar-btn industry-ws-action-btn" onClick={() => void createDeal()}>
            Open deal
          </button>
        </section>

        <section className="industry-ws-record-panel">
          <RealEstateSectionHead code="Pipeline" title="Deal board" description="Track offer status, listing linkage, and team note counts." />
          {loading ? <p className="mail-view-empty">Loading deals…</p> : null}
          {dealRows.length ? (
            <div className="industry-ws-board-grid">
              {dealRows.map((deal) => (
                <article
                  key={deal.id}
                  className={`industry-ws-board-card${selectedDealId === deal.id ? " industry-ws-board-card--active" : ""}`}
                >
                  <div className="industry-ws-board-card-top">
                    <div>
                      <span className="industry-ws-board-id">{deal.title}</span>
                      <p className="industry-ws-board-subtitle">{deal.listing.address}, {deal.listing.city}</p>
                    </div>
                    <RealEstateStatusPill label={formatStatusLabel(deal.status)} tone={dealStatusTone(deal.status)} />
                  </div>
                  <div className="industry-ws-meta-row">
                    <span>{formatPrice(deal.offerAmountCents)}</span>
                    <span>{deal.noteCount} notes</span>
                  </div>
                  <div className="industry-ws-card-actions">
                    <button type="button" className="mail-toolbar-btn" onClick={() => setSelectedDealId(deal.id)}>
                      View notes
                    </button>
                    <select defaultValue={deal.status} onChange={(e) => void updateStatus(deal.id, e.target.value)}>
                      <option value="offer">Offer</option>
                      <option value="negotiation">Negotiation</option>
                      <option value="accepted">Accepted</option>
                      <option value="closed">Closed</option>
                      <option value="fallen_through">Fallen through</option>
                    </select>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <RealEstateEmptyState title="Deal room is empty" body="Open a deal on a listing to start tracking offers and negotiations." />
          )}
        </section>
      </div>

      {selectedDeal ? (
        <section className="industry-ws-record-panel industry-ws-record-panel--notes">
          <RealEstateSectionHead
            code="Notes"
            title={`Team notes · ${selectedDeal.title}`}
            description="Collaborative negotiation notes for the selected deal."
          />
          <div className="industry-ws-note-compose">
            <textarea placeholder="Add a deal note…" value={noteBody} onChange={(e) => setNoteBody(e.target.value)} rows={3} />
            <button type="button" className="mail-toolbar-btn industry-ws-action-btn" onClick={() => void addNote()}>
              Add note
            </button>
          </div>
          <ul className="industry-ws-note-list">
            {(notes ?? []).map((note) => (
              <li key={note.id}>
                <strong>{note.author.displayName ?? note.author.email}</strong>
                <p>{note.body}</p>
                <small>{new Date(note.createdAt).toLocaleString()}</small>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </RealEstateToolShell>
  );
}

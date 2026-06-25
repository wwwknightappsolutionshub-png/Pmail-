import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronUp } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { MailContact, MailContactCollection } from "../types/contact";
import "./ContactsPanel.css";

type Tab = "contacts" | "lists" | "groups";

const emptyContactForm = {
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  company: "",
  notes: "",
};

const TAB_LABELS: Record<Tab, string> = {
  contacts: "Contacts",
  lists: "Lists",
  groups: "Groups",
};

function contactInitials(contact: MailContact): string {
  const fromName = [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim();
  if (fromName) {
    const parts = fromName.split(/\s+/);
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return contact.email.slice(0, 2).toUpperCase();
}

function collectionInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase() || "?";
}

export function ContactsPanel({
  initialEmail,
  onMessage,
}: {
  initialEmail?: string;
  onMessage?: (msg: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("contacts");
  const [contacts, setContacts] = useState<MailContact[]>([]);
  const [lists, setLists] = useState<MailContactCollection[]>([]);
  const [groups, setGroups] = useState<MailContactCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contactForm, setContactForm] = useState(emptyContactForm);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [collectionName, setCollectionName] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [selectedListId, setSelectedListId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [memberContactId, setMemberContactId] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [showContactForm, setShowContactForm] = useState(Boolean(initialEmail));
  const [showCollectionForm, setShowCollectionForm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const scrollPanelToTop = useCallback((behavior: ScrollBehavior = "smooth") => {
    scrollRef.current?.scrollTo({ top: 0, behavior });
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    const onScroll = () => {
      setShowScrollTop(node.scrollTop > 120);
    };

    onScroll();
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, [tab, showContactForm, showCollectionForm]);

  async function reload() {
    setLoading(true);
    setError("");
    try {
      const [c, l, g] = await Promise.all([api.contacts(), api.contactLists(), api.contactGroups()]);
      setContacts(c.contacts);
      setLists(l.lists);
      setGroups(g.groups);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    if (initialEmail) {
      setContactForm((f) => ({ ...f, email: initialEmail }));
      setTab("contacts");
      setShowContactForm(true);
    }
  }, [initialEmail]);

  const filteredContacts = useMemo(() => {
    const query = contactSearch.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter((contact) => {
      const haystack = [
        contact.displayName,
        contact.email,
        contact.phone,
        contact.company,
        contact.firstName,
        contact.lastName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [contactSearch, contacts]);

  function resetContactForm() {
    setContactForm(emptyContactForm);
    setEditingContactId(null);
    setShowContactForm(false);
  }

  function startEditContact(contact: MailContact) {
    setEditingContactId(contact.id);
    setContactForm({
      email: contact.email,
      firstName: contact.firstName ?? "",
      lastName: contact.lastName ?? "",
      phone: contact.phone ?? "",
      company: contact.company ?? "",
      notes: contact.notes ?? "",
    });
    setShowContactForm(true);
    scrollPanelToTop();
  }

  function resetCollectionForm() {
    setCollectionName("");
    setCollectionDescription("");
    setEditingCollectionId(null);
    setShowCollectionForm(false);
  }

  function startEditCollection(collection: MailContactCollection) {
    setEditingCollectionId(collection.id);
    setCollectionName(collection.name);
    setCollectionDescription(collection.description ?? "");
    setShowCollectionForm(true);
  }

  async function saveContact(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingContactId) {
        await api.updateContact(editingContactId, contactForm);
        onMessage?.("Contact updated");
      } else {
        await api.createContact(contactForm);
        onMessage?.("Contact added");
      }
      resetContactForm();
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    }
  }

  async function saveCollection(kind: "lists" | "groups") {
    try {
      const payload = { name: collectionName, description: collectionDescription || null };
      if (editingCollectionId) {
        if (kind === "lists") await api.updateContactList(editingCollectionId, payload);
        else await api.updateContactGroup(editingCollectionId, payload);
        onMessage?.(kind === "lists" ? "List updated" : "Group updated");
      } else {
        if (kind === "lists") await api.createContactList(payload);
        else await api.createContactGroup(payload);
        onMessage?.(kind === "lists" ? "List created" : "Group created");
      }
      resetCollectionForm();
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    }
  }

  const collectionKind = tab === "lists" ? "lists" : "groups";
  const collections = tab === "lists" ? lists : groups;
  const selectedCollectionId = tab === "lists" ? selectedListId : selectedGroupId;
  const setSelectedCollectionId = tab === "lists" ? setSelectedListId : setSelectedGroupId;

  return (
    <div className="contacts-panel">
      <header className="contacts-toolbar">
        <nav className="contacts-tabs" aria-label="Contact views">
          {(["contacts", "lists", "groups"] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={tab === t ? "is-active" : ""}
              onClick={() => {
                setTab(t);
                resetCollectionForm();
                scrollPanelToTop("auto");
              }}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </nav>
        {tab === "contacts" && !showContactForm ? (
          <button
            type="button"
            className="contacts-primary-btn"
            onClick={() => {
              setShowContactForm(true);
              scrollPanelToTop();
            }}
          >
            New contact
          </button>
        ) : null}
        {tab !== "contacts" && !showCollectionForm ? (
          <button
            type="button"
            className="contacts-primary-btn"
            onClick={() => {
              setShowCollectionForm(true);
              scrollPanelToTop();
            }}
          >
            {tab === "lists" ? "New list" : "New group"}
          </button>
        ) : null}
      </header>

      {error ? <div className="contacts-error">{error}</div> : null}

      <div className="contacts-panel__scroll" ref={scrollRef}>
        {loading ? <p className="contacts-muted">Loading…</p> : null}

      {tab === "contacts" ? (
        <div className="contacts-section">
          {showContactForm ? (
            <form className="contacts-composer" onSubmit={saveContact}>
              <div className="contacts-composer-head">
                <h3>{editingContactId ? "Edit contact" : "New contact"}</h3>
                <button type="button" className="contacts-icon-btn" aria-label="Close form" onClick={resetContactForm}>
                  ×
                </button>
              </div>
              <div className="contacts-form-grid">
                <label className="contacts-field contacts-field--full">
                  <span>Email</span>
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  />
                </label>
                <label className="contacts-field">
                  <span>First name</span>
                  <input
                    autoComplete="given-name"
                    value={contactForm.firstName}
                    onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })}
                  />
                </label>
                <label className="contacts-field">
                  <span>Last name</span>
                  <input
                    autoComplete="family-name"
                    value={contactForm.lastName}
                    onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })}
                  />
                </label>
                <label className="contacts-field">
                  <span>Phone</span>
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  />
                </label>
                <label className="contacts-field">
                  <span>Company</span>
                  <input
                    autoComplete="organization"
                    value={contactForm.company}
                    onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                  />
                </label>
                <label className="contacts-field contacts-field--full">
                  <span>Notes</span>
                  <textarea
                    rows={2}
                    value={contactForm.notes}
                    onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                  />
                </label>
              </div>
              <div className="contacts-form-actions">
                <button type="submit" className="contacts-primary-btn">
                  {editingContactId ? "Save changes" : "Add contact"}
                </button>
                <button type="button" className="contacts-secondary-btn" onClick={resetContactForm}>
                  Cancel
                </button>
              </div>
            </form>
          ) : null}

          <div className="contacts-search-wrap">
            <input
              type="search"
              className="contacts-search"
              placeholder="Search contacts"
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              aria-label="Search contacts"
            />
            <span className="contacts-count">{filteredContacts.length}</span>
          </div>

          {!loading && filteredContacts.length === 0 ? (
            <p className="contacts-empty">
              {contacts.length === 0 ? "No contacts yet. Add your first contact above." : "No contacts match your search."}
            </p>
          ) : (
            <ul className="contacts-list">
              {filteredContacts.map((contact) => (
                <li key={contact.id} className="contacts-card">
                  <div className="contacts-avatar" aria-hidden="true">
                    {contactInitials(contact)}
                  </div>
                  <div className="contacts-card-body">
                    <strong className="contacts-card-name">{contact.displayName}</strong>
                    <span className="contacts-card-meta">
                      {contact.email}
                      {contact.phone ? ` · ${contact.phone}` : ""}
                    </span>
                    {contact.company ? <span className="contacts-card-company">{contact.company}</span> : null}
                  </div>
                  <div className="contacts-card-actions">
                    <button type="button" className="contacts-text-btn" onClick={() => startEditContact(contact)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="contacts-text-btn contacts-text-btn--danger"
                      onClick={async () => {
                        await api.deleteContact(contact.id);
                        if (editingContactId === contact.id) resetContactForm();
                        await reload();
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {tab === "lists" || tab === "groups" ? (
        <div className="contacts-section">
          {showCollectionForm ? (
            <div className="contacts-composer">
              <div className="contacts-composer-head">
                <h3>
                  {editingCollectionId
                    ? tab === "lists"
                      ? "Edit list"
                      : "Edit group"
                    : tab === "lists"
                      ? "New list"
                      : "New group"}
                </h3>
                <button type="button" className="contacts-icon-btn" aria-label="Close form" onClick={resetCollectionForm}>
                  ×
                </button>
              </div>
              <div className="contacts-form-grid">
                <label className="contacts-field contacts-field--full">
                  <span>Name</span>
                  <input value={collectionName} onChange={(e) => setCollectionName(e.target.value)} />
                </label>
                <label className="contacts-field contacts-field--full">
                  <span>Description</span>
                  <input value={collectionDescription} onChange={(e) => setCollectionDescription(e.target.value)} />
                </label>
              </div>
              <div className="contacts-form-actions">
                <button
                  type="button"
                  className="contacts-primary-btn"
                  onClick={() => void saveCollection(collectionKind)}
                >
                  {editingCollectionId ? "Save changes" : tab === "lists" ? "Create list" : "Create group"}
                </button>
                <button type="button" className="contacts-secondary-btn" onClick={resetCollectionForm}>
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          {!loading && collections.length === 0 ? (
            <p className="contacts-empty">
              {tab === "lists" ? "No lists yet." : "No groups yet."} Create one to organize contacts.
            </p>
          ) : (
            <ul className="contacts-list">
              {collections.map((collection) => (
                <li key={collection.id} className="contacts-card">
                  <div className="contacts-avatar contacts-avatar--collection" aria-hidden="true">
                    {collectionInitials(collection.name)}
                  </div>
                  <div className="contacts-card-body">
                    <strong className="contacts-card-name">{collection.name}</strong>
                    <span className="contacts-card-meta">
                      {collection.memberCount} contact{collection.memberCount === 1 ? "" : "s"}
                      {collection.description ? ` · ${collection.description}` : ""}
                    </span>
                  </div>
                  <div className="contacts-card-actions">
                    <button type="button" className="contacts-text-btn" onClick={() => startEditCollection(collection)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="contacts-text-btn contacts-text-btn--danger"
                      onClick={async () => {
                        if (collectionKind === "lists") await api.deleteContactList(collection.id);
                        else await api.deleteContactGroup(collection.id);
                        if (editingCollectionId === collection.id) resetCollectionForm();
                        await reload();
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {collections.length > 0 && contacts.length > 0 ? (
            <div className="contacts-member-box">
              <p className="contacts-member-label">Add to {tab === "lists" ? "list" : "group"}</p>
              <div className="contacts-member-row">
                <select value={selectedCollectionId} onChange={(e) => setSelectedCollectionId(e.target.value)}>
                  <option value="">{tab === "lists" ? "Select list" : "Select group"}</option>
                  {collections.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <select value={memberContactId} onChange={(e) => setMemberContactId(e.target.value)}>
                  <option value="">Select contact</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.displayName}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="contacts-primary-btn contacts-primary-btn--compact"
                  onClick={async () => {
                    if (!selectedCollectionId || !memberContactId) return;
                    if (collectionKind === "lists") {
                      await api.addContactToList(selectedCollectionId, memberContactId);
                    } else {
                      await api.addContactToGroup(selectedCollectionId, memberContactId);
                    }
                    await reload();
                    onMessage?.(tab === "lists" ? "Added to list" : "Added to group");
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

        <div className="contacts-panel__footer-spacer" aria-hidden="true" />
      </div>

      {showScrollTop ? (
        <button
          type="button"
          className="contacts-scroll-top"
          aria-label="Scroll to top"
          onClick={() => scrollPanelToTop()}
        >
          <ChevronUp strokeWidth={2} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

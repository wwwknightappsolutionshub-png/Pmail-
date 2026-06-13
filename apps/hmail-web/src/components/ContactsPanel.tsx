import { useEffect, useState } from "react";
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

  async function reload() {
    setLoading(true);
    setError("");
    try {
      const [c, l, g] = await Promise.all([
        api.contacts(),
        api.contactLists(),
        api.contactGroups(),
      ]);
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
    }
  }, [initialEmail]);

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
      setContactForm(emptyContactForm);
      setEditingContactId(null);
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
      setCollectionName("");
      setCollectionDescription("");
      setEditingCollectionId(null);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    }
  }

  return (
    <div className="contacts-panel">
      <div className="contacts-tabs">
        {(["contacts", "lists", "groups"] as const).map((t) => (
          <button key={t} type="button" className={tab === t ? "is-active" : ""} onClick={() => setTab(t)}>
            {t === "contacts" ? "Contacts" : t === "lists" ? "Lists" : "Groups"}
          </button>
        ))}
      </div>

      {error ? <div className="contacts-error">{error}</div> : null}
      {loading ? <p className="contacts-muted">Loading contacts…</p> : null}

      {tab === "contacts" ? (
        <div className="contacts-section">
          <form className="contacts-form" onSubmit={saveContact}>
            <h3>{editingContactId ? "Edit contact" : "Add contact"}</h3>
            <div className="contacts-form-grid">
              <input required type="email" placeholder="Email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
              <input placeholder="First name" value={contactForm.firstName} onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })} />
              <input placeholder="Last name" value={contactForm.lastName} onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })} />
              <input placeholder="Phone" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
              <input placeholder="Company" value={contactForm.company} onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })} />
              <textarea placeholder="Notes" value={contactForm.notes} onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })} />
            </div>
            <div className="contacts-form-actions">
              <button type="submit">{editingContactId ? "Update" : "Add contact"}</button>
              {editingContactId ? (
                <button type="button" className="ghost" onClick={() => { setEditingContactId(null); setContactForm(emptyContactForm); }}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>

          <ul className="contacts-list">
            {contacts.map((c) => (
              <li key={c.id}>
                <div>
                  <strong>{c.displayName}</strong>
                  <span>{c.email}</span>
                  {c.phone ? <span>{c.phone}</span> : null}
                </div>
                <div className="contacts-row-actions">
                  <button type="button" onClick={() => { setEditingContactId(c.id); setContactForm({ email: c.email, firstName: c.firstName ?? "", lastName: c.lastName ?? "", phone: c.phone ?? "", company: c.company ?? "", notes: c.notes ?? "" }); }}>Edit</button>
                  <button type="button" className="danger" onClick={async () => { await api.deleteContact(c.id); await reload(); }}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tab === "lists" ? (
        <div className="contacts-section">
          <div className="contacts-form">
            <h3>{editingCollectionId ? "Edit list" : "Create contact list"}</h3>
            <div className="contacts-form-grid">
              <input placeholder="List name" value={collectionName} onChange={(e) => setCollectionName(e.target.value)} />
              <input placeholder="Description" value={collectionDescription} onChange={(e) => setCollectionDescription(e.target.value)} />
            </div>
            <div className="contacts-form-actions">
              <button type="button" onClick={() => saveCollection("lists")}>{editingCollectionId ? "Update list" : "Create list"}</button>
            </div>
          </div>
          <ul className="contacts-list">
            {lists.map((list) => (
              <li key={list.id}>
                <div>
                  <strong>{list.name}</strong>
                  <span>{list.memberCount} contacts</span>
                </div>
                <div className="contacts-row-actions">
                  <button type="button" onClick={() => { setEditingCollectionId(list.id); setCollectionName(list.name); setCollectionDescription(list.description ?? ""); }}>Edit</button>
                  <button type="button" className="danger" onClick={async () => { await api.deleteContactList(list.id); await reload(); }}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
          <div className="contacts-member-box">
            <h4>Add contact to list</h4>
            <select value={selectedListId} onChange={(e) => setSelectedListId(e.target.value)}>
              <option value="">Select list</option>
              {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <select value={memberContactId} onChange={(e) => setMemberContactId(e.target.value)}>
              <option value="">Select contact</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
            </select>
            <button type="button" onClick={async () => { if (!selectedListId || !memberContactId) return; await api.addContactToList(selectedListId, memberContactId); await reload(); onMessage?.("Added to list"); }}>Add to list</button>
          </div>
        </div>
      ) : null}

      {tab === "groups" ? (
        <div className="contacts-section">
          <div className="contacts-form">
            <h3>{editingCollectionId ? "Edit group" : "Create contact group"}</h3>
            <div className="contacts-form-grid">
              <input placeholder="Group name" value={collectionName} onChange={(e) => setCollectionName(e.target.value)} />
              <input placeholder="Description" value={collectionDescription} onChange={(e) => setCollectionDescription(e.target.value)} />
            </div>
            <div className="contacts-form-actions">
              <button type="button" onClick={() => saveCollection("groups")}>{editingCollectionId ? "Update group" : "Create group"}</button>
            </div>
          </div>
          <ul className="contacts-list">
            {groups.map((group) => (
              <li key={group.id}>
                <div>
                  <strong>{group.name}</strong>
                  <span>{group.memberCount} contacts</span>
                </div>
                <div className="contacts-row-actions">
                  <button type="button" onClick={() => { setEditingCollectionId(group.id); setCollectionName(group.name); setCollectionDescription(group.description ?? ""); }}>Edit</button>
                  <button type="button" className="danger" onClick={async () => { await api.deleteContactGroup(group.id); await reload(); }}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
          <div className="contacts-member-box">
            <h4>Add contact to group</h4>
            <select value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)}>
              <option value="">Select group</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <select value={memberContactId} onChange={(e) => setMemberContactId(e.target.value)}>
              <option value="">Select contact</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
            </select>
            <button type="button" onClick={async () => { if (!selectedGroupId || !memberContactId) return; await api.addContactToGroup(selectedGroupId, memberContactId); await reload(); onMessage?.("Added to group"); }}>Add to group</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

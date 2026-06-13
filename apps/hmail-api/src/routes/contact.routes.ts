import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import {
  addContactToGroup,
  addContactToList,
  ContactError,
  createContact,
  createContactGroup,
  createContactList,
  deleteContact,
  deleteContactGroup,
  deleteContactList,
  listContactGroups,
  listContactLists,
  listContacts,
  removeContactFromGroup,
  removeContactFromList,
  suggestContactsFromEmails,
  updateContact,
  updateContactGroup,
  updateContactList,
} from "../services/contact.service.js";

const contactSchema = z.object({
  email: z.string().email(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const namedCollectionSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
});

const memberSchema = z.object({
  contactId: z.string().uuid(),
});

const suggestSchema = z.object({
  emails: z.array(z.string()).min(1),
});

export const contactRouter = Router();

contactRouter.use(requireAuth);

contactRouter.get("/", async (req, res, next) => {
  try {
    const contacts = await listContacts(req.auth!.user.id);
    res.json({ contacts });
  } catch (err) {
    next(err);
  }
});

contactRouter.post("/", async (req, res, next) => {
  try {
    const body = contactSchema.parse(req.body);
    const contact = await createContact(req.auth!.user.id, body);
    res.status(201).json({ contact });
  } catch (err) {
    if (err instanceof ContactError) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

contactRouter.patch("/:id", async (req, res, next) => {
  try {
    const body = contactSchema.partial().parse(req.body);
    const contact = await updateContact(req.auth!.user.id, req.params.id, body);
    res.json({ contact });
  } catch (err) {
    if (err instanceof ContactError) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});

contactRouter.delete("/:id", async (req, res, next) => {
  try {
    await deleteContact(req.auth!.user.id, req.params.id);
    res.status(204).send();
  } catch (err) {
    if (err instanceof ContactError) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});

contactRouter.post("/suggest", async (req, res, next) => {
  try {
    const body = suggestSchema.parse(req.body);
    const suggestions = await suggestContactsFromEmails(req.auth!.user.id, body.emails);
    res.json({ suggestions });
  } catch (err) {
    next(err);
  }
});

contactRouter.get("/lists", async (req, res, next) => {
  try {
    const lists = await listContactLists(req.auth!.user.id);
    res.json({ lists });
  } catch (err) {
    next(err);
  }
});

contactRouter.post("/lists", async (req, res, next) => {
  try {
    const body = namedCollectionSchema.parse(req.body);
    const list = await createContactList(req.auth!.user.id, body);
    res.status(201).json({ list });
  } catch (err) {
    if (err instanceof ContactError) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

contactRouter.patch("/lists/:id", async (req, res, next) => {
  try {
    const body = namedCollectionSchema.partial().parse(req.body);
    const list = await updateContactList(req.auth!.user.id, req.params.id, body);
    res.json({ list });
  } catch (err) {
    if (err instanceof ContactError) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});

contactRouter.delete("/lists/:id", async (req, res, next) => {
  try {
    await deleteContactList(req.auth!.user.id, req.params.id);
    res.status(204).send();
  } catch (err) {
    if (err instanceof ContactError) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});

contactRouter.post("/lists/:id/members", async (req, res, next) => {
  try {
    const body = memberSchema.parse(req.body);
    await addContactToList(req.auth!.user.id, req.params.id, body.contactId);
    res.status(201).json({ ok: true });
  } catch (err) {
    if (err instanceof ContactError) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});

contactRouter.delete("/lists/:listId/members/:contactId", async (req, res, next) => {
  try {
    await removeContactFromList(req.auth!.user.id, req.params.listId, req.params.contactId);
    res.status(204).send();
  } catch (err) {
    if (err instanceof ContactError) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});

contactRouter.get("/groups", async (req, res, next) => {
  try {
    const groups = await listContactGroups(req.auth!.user.id);
    res.json({ groups });
  } catch (err) {
    next(err);
  }
});

contactRouter.post("/groups", async (req, res, next) => {
  try {
    const body = namedCollectionSchema.parse(req.body);
    const group = await createContactGroup(req.auth!.user.id, body);
    res.status(201).json({ group });
  } catch (err) {
    if (err instanceof ContactError) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

contactRouter.patch("/groups/:id", async (req, res, next) => {
  try {
    const body = namedCollectionSchema.partial().parse(req.body);
    const group = await updateContactGroup(req.auth!.user.id, req.params.id, body);
    res.json({ group });
  } catch (err) {
    if (err instanceof ContactError) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});

contactRouter.delete("/groups/:id", async (req, res, next) => {
  try {
    await deleteContactGroup(req.auth!.user.id, req.params.id);
    res.status(204).send();
  } catch (err) {
    if (err instanceof ContactError) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});

contactRouter.post("/groups/:id/members", async (req, res, next) => {
  try {
    const body = memberSchema.parse(req.body);
    await addContactToGroup(req.auth!.user.id, req.params.id, body.contactId);
    res.status(201).json({ ok: true });
  } catch (err) {
    if (err instanceof ContactError) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});

contactRouter.delete("/groups/:groupId/members/:contactId", async (req, res, next) => {
  try {
    await removeContactFromGroup(req.auth!.user.id, req.params.groupId, req.params.contactId);
    res.status(204).send();
  } catch (err) {
    if (err instanceof ContactError) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});

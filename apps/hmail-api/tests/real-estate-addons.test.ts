import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import {
  createAuthenticatedAgent,
  grantAddonTrial,
  resetTestDatabase,
} from "./helpers.js";

describe("real estate addons e2e", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("returns 403 for real estate routes without addon trial", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.get("/api/features/real-estate/listings");
    expect(res.status).toBe(403);
  });

  it("starts trial for re-listing-board and exposes entitlements", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    const start = await agent.post("/api/addons/re-listing-board/trial");
    expect(start.status).toBe(201);
    expect(start.body.addon.accessStatus).toBe("trial");

    const ent = await agent.get("/api/addons/entitlements");
    expect(ent.body.slugs).toContain("re-listing-board");
  });

  it("phase 1: listing board contact and listing flow", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "re-listing-board");

    const contactRes = await agent.post("/api/features/real-estate/contacts").send({
      firstName: "Maria",
      lastName: "Santos",
      email: "maria@example.com",
      role: "seller",
    });
    expect(contactRes.status).toBe(201);
    const contactId = contactRes.body.contact.id;

    const listingRes = await agent.post("/api/features/real-estate/listings").send({
      address: "42 Maple Street",
      city: "Toronto",
      province: "ON",
      mlsNumber: "C1234567",
      listPriceCents: 89900000,
      sellerContactId: contactId,
    });
    expect(listingRes.status).toBe(201);
    expect(listingRes.body.listing.status).toBe("active");
    const listingId = listingRes.body.listing.id;

    const list = await agent.get("/api/features/real-estate/listings");
    expect(list.status).toBe(200);
    expect(list.body.listings).toHaveLength(1);
    expect(list.body.listings[0].sellerName).toBe("Maria Santos");

    const updated = await agent
      .patch(`/api/features/real-estate/listings/${listingId}`)
      .send({ status: "pending" });
    expect(updated.status).toBe(200);
    expect(updated.body.listing.status).toBe("pending");
  });

  it("phase 1: showing scheduler flow", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "re-listing-board");
    await grantAddonTrial(tenant.id, "re-showing-scheduler");

    const listingRes = await agent.post("/api/features/real-estate/listings").send({
      address: "10 Oak Ave",
      city: "Vancouver",
    });
    const listingId = listingRes.body.listing.id;

    const bad = await agent.post("/api/features/real-estate/showings").send({
      listingId,
      contact: { firstName: "Alex", lastName: "Kim" },
      scheduledAt: new Date(Date.now() - 60000).toISOString(),
    });
    expect(bad.status).toBe(400);

    const showingRes = await agent.post("/api/features/real-estate/showings").send({
      listingId,
      contact: { firstName: "Alex", lastName: "Kim", email: "alex@example.com" },
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      notes: "First showing",
    });
    expect(showingRes.status).toBe(201);
    expect(showingRes.body.showing.status).toBe("scheduled");

    const showings = await agent.get("/api/features/real-estate/showings");
    expect(showings.body.showings).toHaveLength(1);

    const completed = await agent
      .patch(`/api/features/real-estate/showings/${showingRes.body.showing.id}`)
      .send({ status: "completed" });
    expect(completed.status).toBe(200);
    expect(completed.body.showing.status).toBe("completed");
  });

  it("phase 1: quick replies templates", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "re-quick-replies");

    const templates = await agent.get("/api/features/real-estate/templates");
    expect(templates.status).toBe(200);
    expect(templates.body.templates.length).toBeGreaterThan(0);
    expect(templates.body.templates[0].subject).toBeTruthy();
  });

  it("phase 1: deal room with notes", async () => {
    const { agent, tenant, user } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "re-listing-board");
    await grantAddonTrial(tenant.id, "re-deal-room");

    const listingRes = await agent.post("/api/features/real-estate/listings").send({
      address: "88 King St",
      city: "Calgary",
    });
    const listingId = listingRes.body.listing.id;

    const dealRes = await agent.post("/api/features/real-estate/deals").send({
      listingId,
      title: "Offer — 88 King St",
      offerAmountCents: 75000000,
    });
    expect(dealRes.status).toBe(201);
    const dealId = dealRes.body.deal.id;

    const noteRes = await agent.post(`/api/features/real-estate/deals/${dealId}/notes`).send({
      body: "Seller countered at $760k",
    });
    expect(noteRes.status).toBe(201);
    expect(noteRes.body.note.author.email).toBe(user.email);

    const notes = await agent.get(`/api/features/real-estate/deals/${dealId}/notes`);
    expect(notes.body.notes).toHaveLength(1);

    const accepted = await agent.patch(`/api/features/real-estate/deals/${dealId}`).send({ status: "accepted" });
    expect(accepted.status).toBe(200);
    expect(accepted.body.deal.status).toBe("accepted");
  });

  it("rejects invalid listing payload", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "re-listing-board");

    const res = await agent.post("/api/features/real-estate/listings").send({ address: "", city: "" });
    expect(res.status).toBe(400);
  });
});

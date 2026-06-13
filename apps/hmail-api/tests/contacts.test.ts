import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAuthenticatedAgent, resetTestDatabase } from "./helpers.js";

describe("contacts API", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("requires auth for contacts", async () => {
    const res = await request(app).get("/api/contacts");
    expect(res.status).toBe(401);
  });

  it("creates, lists, updates, and deletes contacts", async () => {
    const { agent } = await createAuthenticatedAgent(app);

    const createRes = await agent.post("/api/contacts").send({
      email: "client@example.com",
      firstName: "Jane",
      lastName: "Doe",
    });
    expect(createRes.status).toBe(201);
    expect(createRes.body.contact.email).toBe("client@example.com");

    const listRes = await agent.get("/api/contacts");
    expect(listRes.status).toBe(200);
    expect(listRes.body.contacts).toHaveLength(1);

    const patchRes = await agent.patch(`/api/contacts/${createRes.body.contact.id}`).send({
      phone: "+1-555-0100",
    });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.contact.phone).toBe("+1-555-0100");

    const deleteRes = await agent.delete(`/api/contacts/${createRes.body.contact.id}`);
    expect(deleteRes.status).toBe(204);
  });

  it("manages contact lists and groups", async () => {
    const { agent } = await createAuthenticatedAgent(app);

    const contactRes = await agent.post("/api/contacts").send({ email: "team@example.com" });
    const contactId = contactRes.body.contact.id;

    const listRes = await agent.post("/api/contacts/lists").send({ name: "Clients" });
    expect(listRes.status).toBe(201);
    const listId = listRes.body.list.id;

    const groupRes = await agent.post("/api/contacts/groups").send({ name: "VIP" });
    expect(groupRes.status).toBe(201);
    const groupId = groupRes.body.group.id;

    await agent.post(`/api/contacts/lists/${listId}/members`).send({ contactId });
    await agent.post(`/api/contacts/groups/${groupId}/members`).send({ contactId });

    const lists = await agent.get("/api/contacts/lists");
    expect(lists.body.lists[0].memberCount).toBe(1);

    const groups = await agent.get("/api/contacts/groups");
    expect(groups.body.groups[0].memberCount).toBe(1);
  });

  it("suggests unknown sender emails", async () => {
    const { agent } = await createAuthenticatedAgent(app);

    const suggestRes = await agent.post("/api/contacts/suggest").send({
      emails: ["newperson@example.com", "newperson@example.com"],
    });
    expect(suggestRes.status).toBe(200);
    expect(suggestRes.body.suggestions).toEqual(["newperson@example.com"]);

    await agent.post("/api/contacts").send({ email: "newperson@example.com" });

    const again = await agent.post("/api/contacts/suggest").send({
      emails: ["newperson@example.com"],
    });
    expect(again.body.suggestions).toEqual([]);
  });
});
